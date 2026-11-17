import logging

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func

from app.core.dependencies import Admin, CurrentUser
from app.db.session import Db

from app.models.email_thread import EmailThread
from app.models.email_message import EmailMessage
from app.models.email_classification import EmailClassification

from app.services.gmail_sync_service import sync_inbox

from app.services.gmail_attachment_service import (
    list_attachments
)

from app.models.email_attachment import EmailAttachment
from app.models.email_attachment_analysis import EmailAttachmentAnalysis

from pydantic import BaseModel

from fastapi import Response

from app.services.remote_image_service import (
    fetch_remote_image,
)
from app.services.email_html_service import sanitize_email_html

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/gmail/inbox",
    tags=["Gmail Inbox"]
)

def serialize_classification(
    record
):
    if record is None:
        return None

    return {
        "id": record.id,
        "category": record.category,
        "confidence": record.confidence,
        "summary": record.summary,
        "requires_review": record.requires_review,
        "extracted_data": record.extracted_data or {},
        "model_used": record.model_used
    }


@router.post(
    "/sync"
)
def sync(
    admin: Admin,
    limit: int = Query(default=50, ge=1, le=100)
):
    try:
        return sync_inbox(max_messages=limit)

    except Exception:
        logger.exception("Gmail inbox sync failed")

        raise HTTPException(
            status_code=502,
            detail="Gmail sync failed; check server logs"
        )



@router.get("/threads")
def threads(
    user: CurrentUser,
    db: Db,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100)
):
    # Total number of conversations in MySQL.
    total = db.scalar(
        select(func.count(EmailThread.id))
    ) or 0

    # Unread count across all conversations,
    # not just the current page.
    unread_count = db.scalar(
        select(func.count(EmailThread.id))
        .where(EmailThread.is_read.is_(False))
    ) or 0

    total_pages = max(
        1,
        (total + page_size - 1) // page_size
    )

    offset = (page - 1) * page_size

    rows = db.scalars(
        select(EmailThread)
        .order_by(
            EmailThread.last_message_at.desc(),
            EmailThread.id.desc()
        )
        .offset(offset)
        .limit(page_size)
    ).all()

    return {
        "items": [
            {
                "id": row.id,
                "gmail_thread_id": row.gmail_thread_id,
                "subject": row.subject,
                "last_message_at": row.last_message_at,
                "is_read": row.is_read
            }
            for row in rows
        ],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "unread_count": unread_count
    }


@router.get(
    "/threads/{thread_id}"
)
def thread_detail(
    thread_id: int,
    user: CurrentUser,
    db: Db
):
    thread = db.get(EmailThread, thread_id)

    if thread is None:
        raise HTTPException(
            status_code=404,
            detail="Thread not found"
        )

    messages = db.scalars(
        select(EmailMessage)
        .where(EmailMessage.thread_id == thread_id)
        .order_by(
            EmailMessage.sent_at,
            EmailMessage.id
        )
    ).all()

    message_ids = [msg.id for msg in messages]


    # Load saved attachment analyses for this thread.
    # This does not run AI or download attachments.
    attachment_analyses = {}

    if message_ids:
        analysis_rows = db.execute(
            select(
                EmailAttachment.id,
                EmailAttachmentAnalysis
            )
            .join(
                EmailAttachmentAnalysis,
                EmailAttachmentAnalysis.email_attachment_id
                == EmailAttachment.id
            )
            .where(
                EmailAttachment.email_message_id.in_(
                    message_ids
                )
            )
        ).all()

        for attachment_id, analysis in analysis_rows:
            attachment_analyses[attachment_id] = {
                "status": analysis.status,
                "analysis_type": analysis.analysis_type,
                "summary": analysis.summary,
                "model_used": analysis.model_used,
                "requires_review": analysis.requires_review,
                "error_message": (
                    analysis.error_message
                    if analysis.status == "failed"
                    else None
                )
            }

    def attachments_with_analysis(message_id):
        items = list_attachments(db, message_id)

        return [
            {
                **item,
                "analysis": attachment_analyses.get(
                    item["id"]
                )
            }
            for item in items
        ]


    classifications = {}

    if message_ids:
        records = db.scalars(
            select(EmailClassification).where(
                EmailClassification.email_message_id.in_(
                    message_ids
                )
            )
        ).all()

        classifications = {
            record.email_message_id: record
            for record in records
        }

    return {
        "id": thread.id,
        "subject": thread.subject,
        "gmail_thread_id": thread.gmail_thread_id,
        "messages": [
            {
                "id": msg.id,
                "sender": msg.sender,
                "recipient": msg.recipient,
                "subject": msg.subject,
                "body_text": msg.body_text,
                "remote_images": msg.remote_images or [],
                "sent_at": msg.sent_at,
                "attachments": attachments_with_analysis(
                    msg.id
                ),
                "classification": serialize_classification(
                    classifications.get(msg.id)
                )
            }
            for msg in messages
        ]
    }


class ThreadReadUpdate(BaseModel):
    is_read: bool


@router.patch(
    "/threads/{thread_id}/read"
)
def update_thread_read(
    thread_id: int,
    data: ThreadReadUpdate,
    user: CurrentUser,
    db: Db
):
    thread = db.get(
        EmailThread, 
        thread_id
    )

    if thread is None:
        raise HTTPException(
            status_code=404,
            detail="Thread not found"
        )

    thread.is_read = data.is_read

    db.commit()
    db.refresh(thread)

    return {
        "id": thread.id,
        "is_read": thread.is_read
    }


@router.get("/messages/{message_id}/remote-images/{image_index}")
def view_remote_image(
    message_id: int,
    image_index: int,
    user: CurrentUser,
    db: Db
):
    message = db.get(EmailMessage, message_id)

    if message is None:
        raise HTTPException(404, "Email message not found")

    images = message.remote_images or []

    if image_index < 0 or image_index >= len(images):
        raise HTTPException(404, "Remote image not found")

    if image_index >= 30:
        raise HTTPException(400, "Image limit exceeded")

    url = images[image_index].get("url")

    if not url:
        raise HTTPException(400, "Invalid remote image")

    content, mime_type = fetch_remote_image(url)

    return Response(
        content=content,
        media_type=mime_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox"
        }
    )


@router.get("/messages/{message_id}/html-preview")
def get_email_html_preview(
    message_id: int,
    user: CurrentUser,
    db: Db
):
    message = db.get(EmailMessage, message_id)

    if message is None:
        raise HTTPException(
            404,
            "Email message not found"
        )

    if not message.body_html:
        return {
            "message_id": message_id,
            "has_html": False,
            "html": None
        }

    sanitized = sanitize_email_html(
        message.body_html,
        remote_images=message.remote_images or []
    )

    return {
        "message_id": message_id,
        "has_html": True,
        "html": sanitized
    }
