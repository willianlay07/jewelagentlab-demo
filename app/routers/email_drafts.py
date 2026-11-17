import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.dependencies import CurrentUser
from app.db.session import Db
from app.models.email_draft import EmailDraft
from app.schemas.email_draft import EmailDraftUpdate

from pydantic import BaseModel
from app.services.gmail_send_service import send_gmail_reply

from app.services.email_draft_service import (
    generate_draft,
    get_draft,
    update_draft,
    review_draft,
    serialize
)
from app.models.email_send import EmailSend
from app.services.email_send_reservation_service import (
    reserve_email_send,
)
from app.services.gmail_send_service import prepare_gmail_reply
from app.models.email_message import EmailMessage

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/gmail/drafts",
    tags=["Email Drafts"]
)


@router.post(
    "/generate/{message_id}"
)
def generate(
    message_id: int,
    user: CurrentUser,
    db: Db
):
    try:
        return generate_draft(
            db, 
            user, 
            message_id
        )

    except HTTPException:
        raise

    except Exception:
        logger.exception("Email draft generation failed")
        raise HTTPException(
            502,
            "Draft generation failed; check server logs"
        )


@router.get("")
def list_drafts(
    user: CurrentUser,
    db: Db
):
    drafts = db.scalars(
        select(EmailDraft).order_by(
            EmailDraft.created_at.desc()
        )
    ).all()

    return [serialize(draft) for draft in drafts]


@router.get(
    "/{draft_id}"
)
def detail(
    draft_id: int,
    user: CurrentUser,
    db: Db
):
    return serialize(
        get_draft(db, draft_id)
    )


@router.patch(
    "/{draft_id}"
)
def edit(
    draft_id: int,
    data: EmailDraftUpdate,
    user: CurrentUser,
    db: Db
):
    return update_draft(
        db, 
        user, 
        draft_id, 
        data
    )


@router.post(
    "/{draft_id}/approve"
)
def approve(
    draft_id: int,
    user: CurrentUser,
    db: Db
):
    return review_draft(
        db, 
        user, 
        draft_id, 
        "approved"
    )


@router.post(
    "/{draft_id}/reject"
)
def reject(
    draft_id: int,
    user: CurrentUser,
    db: Db
):
    return review_draft(
        db, 
        user, 
        draft_id, 
        "rejected"
    )


class EmailSendConfirmation(BaseModel):
    confirm: bool



@router.post("/{draft_id}/send")
def send_approved_email(
    draft_id: int,
    data: EmailSendConfirmation,
    user: CurrentUser,
    db: Db
):
    # Only authorized staff/admin can send.
    if user.role not in ("admin", "staff"):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to send emails"
        )

    # Sending must be explicitly confirmed.
    if not data.confirm:
        raise HTTPException(
            status_code=400,
            detail="Explicit send confirmation required"
        )

    draft = db.get(EmailDraft, draft_id)

    if draft is None:
        raise HTTPException(
            status_code=404,
            detail="Email draft not found"
        )

    if draft.status != "approved":
        raise HTTPException(
            status_code=409,
            detail="Only approved drafts can be sent"
        )

    # Check whether a reservation already exists.
    existing = db.scalar(
        select(EmailSend).where(
            EmailSend.draft_id == draft_id
        )
    )

    if existing is not None:
        if existing.status != "reserved":
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Email send already processed "
                    f"or in progress: {existing.status}"
                )
            )
    else:
        # Create a reservation for a newly approved draft.
        reserve_email_send(
            db=db,
            draft_id=draft_id,
            user=user
        )

    return send_gmail_reply(
        db=db,
        draft_id=draft_id,
        user=user
    )



@router.get("/{draft_id}/send-status")
def get_email_send_status(
    draft_id: int,
    user: CurrentUser,
    db: Db
):
    draft = db.get(EmailDraft, draft_id)

    if draft is None:
        raise HTTPException(
            404,
            "Email draft not found"
        )

    record = db.scalar(
        select(EmailSend).where(
            EmailSend.draft_id == draft_id
        )
    )

    if record is None:
        return {
            "draft_id": draft_id,
            "status": "not_reserved",
            "sent_at": None,
            "gmail_message_id": None
        }

    return {
        "draft_id": draft_id,
        "status": record.status,
        "sent_at": record.sent_at,
        "gmail_message_id": record.gmail_message_id
    }


@router.get("/{draft_id}/send-preview")
def get_email_send_preview(
    draft_id: int,
    user: CurrentUser,
    db: Db
):
    if user.role not in ("admin", "staff"):
        raise HTTPException(
            403,
            "Not authorized to preview email sending"
        )

    draft = db.get(EmailDraft, draft_id)

    if draft is None:
        raise HTTPException(404, "Draft not found")

    if draft.status != "approved":
        raise HTTPException(
            409,
            "Only approved drafts can be sent"
        )

    existing = db.scalar(
        select(EmailSend).where(
            EmailSend.draft_id == draft_id
        )
    )

    if existing and existing.status != "reserved":
        raise HTTPException(
            409,
            f"Email already processed: {existing.status}"
        )

    prepared = prepare_gmail_reply(
        db,
        draft_id,
        require_reservation=False
    )

    return {
        "draft_id": draft.id,
        "recipient": prepared["recipient"],
        "subject": prepared["subject"],
        "body": draft.body,
        "status": "ready"
    }
