from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.core.dependencies import CurrentUser
from app.db.session import Db

from app.models.email_message import EmailMessage

from app.services.gmail_attachment_service import (
    list_attachments,
    get_attachment_data
)


router = APIRouter(
    prefix="/gmail/attachments",
    tags=["Gmail Attachments"]
)


@router.get("/message/{message_id}")
def message_attachments(
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

    return list_attachments(db, message_id)


@router.get("/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    user: CurrentUser,
    db: Db
):
    attachment, data = get_attachment_data(
        db,
        attachment_id
    )

    # Always download instead of executing/rendering
    # untrusted attachments in the application.
    filename = attachment.filename.replace(
        "\r", ""
    ).replace("\n", "")

    filename = filename.replace(
        "/", "_"
    ).replace("\\", "_")

    filename = filename or "attachment"

    disposition = (
        "attachment; filename=\"attachment\"; "
        f"filename*=UTF-8''{quote(filename, safe='')}"
    )

    return Response(
        content=data,
        media_type=attachment.mime_type,
        headers={
            "Content-Disposition": disposition,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store"
        }
    )