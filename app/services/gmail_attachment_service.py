import base64
import logging
from io import BytesIO

from fastapi import HTTPException
from googleapiclient.errors import HttpError
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select

from app.models.email_attachment import EmailAttachment
from app.models.email_message import EmailMessage
from app.services.gmail_sync_service import gmail_client

import hashlib

from sqlalchemy.dialects.mysql import insert as mysql_insert


logger = logging.getLogger(__name__)

MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf"
}



def find_attachments(payload):
    """
    Identify attachments by their MIME part position.
    This position stays consistent across repeated syncs
    of the same Gmail message.
    """
    results = []

    def walk(part, path="root"):
        filename = part.get("filename") or ""
        body = part.get("body") or {}
        attachment_id = body.get("attachmentId")

        if filename and attachment_id:
            results.append({
                "part_key": path,
                "gmail_attachment_id": attachment_id,
                "filename": filename[:500],
                "mime_type": part.get(
                    "mimeType",
                    "application/octet-stream"
                ),
                "size": int(body.get("size") or 0)
            })

        for index, child in enumerate(part.get("parts", [])):
            walk(child, f"{path}.{index}")

    walk(payload)
    return results





def save_attachment_metadata(db, message, payload):
    found = find_attachments(payload)
    created = 0

    for item in found:
        attachment_id = item["gmail_attachment_id"]
        part_key = item["part_key"]

        # Retain a hash for compatibility with the
        # existing attachment_hash column.
        attachment_hash = hashlib.sha256(
            f"{message.gmail_message_id}:{part_key}".encode()
        ).hexdigest()

        statement = mysql_insert(
            EmailAttachment.__table__
        ).values(
            email_message_id=message.id,
            part_key=part_key,
            gmail_attachment_id=attachment_id,
            attachment_hash=attachment_hash,
            filename=item["filename"],
            mime_type=item["mime_type"],
            size=item["size"]
        )

        # Refresh the Gmail attachment ID if it changes,
        # without creating another database record.
        statement = statement.on_duplicate_key_update(
            gmail_attachment_id=statement.inserted.gmail_attachment_id,
            filename=statement.inserted.filename,
            mime_type=statement.inserted.mime_type,
            size=statement.inserted.size
        )

        result = db.execute(statement)

        if result.rowcount == 1:
            created += 1

    return created




def list_attachments(db, message_id):
    records = db.scalars(
        select(EmailAttachment)
        .where(
            EmailAttachment.email_message_id == message_id
        )
        .order_by(EmailAttachment.id)
    ).all()

    return [
        {
            "id": item.id,
            "filename": item.filename,
            "mime_type": item.mime_type,
            "size": item.size,
            "can_download": (
                item.mime_type in ALLOWED_TYPES
                and 0 < item.size <= MAX_ATTACHMENT_SIZE
            )
        }
        for item in records
    ]


def get_attachment_data(db, attachment_id):
    attachment = db.get(EmailAttachment, attachment_id)

    if attachment is None:
        raise HTTPException(
            404,
            "Attachment not found"
        )

    if attachment.mime_type not in ALLOWED_TYPES:
        raise HTTPException(
            415,
            "Unsupported attachment type"
        )

    if (
        attachment.size <= 0
        or attachment.size > MAX_ATTACHMENT_SIZE
    ):
        raise HTTPException(
            413,
            "Attachment exceeds the allowed size"
        )

    message = db.get(
        EmailMessage,
        attachment.email_message_id
    )

    if message is None:
        raise HTTPException(
            404,
            "Email message not found"
        )

    service = gmail_client()

    try:
        response = (
            service.users()
            .messages()
            .attachments()
            .get(
                userId="me",
                messageId=message.gmail_message_id,
                id=attachment.gmail_attachment_id
            )
            .execute()
        )

    except HttpError:
        logger.exception(
            "Gmail attachment retrieval failed"
        )

        raise HTTPException(
            502,
            "Unable to retrieve Gmail attachment"
        )

    encoded = response.get("data", "")

    # Check encoded length before decoding.
    if len(encoded) > (
        (MAX_ATTACHMENT_SIZE + 2) // 3 * 4 + 8
    ):
        raise HTTPException(
            413,
            "Attachment too large"
        )

    try:
        data = base64.urlsafe_b64decode(
            encoded + "=" * (-len(encoded) % 4)
        )

    except (ValueError, base64.binascii.Error):
        raise HTTPException(
            502,
            "Invalid attachment data"
        )

    if len(data) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(
            413,
            "Attachment too large"
        )

    # Verify content rather than trusting Gmail MIME metadata.
    if attachment.mime_type == "application/pdf":
        if not data.startswith(b"%PDF-"):
            raise HTTPException(
                415,
                "Invalid PDF file"
            )

    else:
        try:
            with Image.open(BytesIO(data)) as img:
                actual_type = Image.MIME.get(img.format)

                if actual_type != attachment.mime_type:
                    raise HTTPException(
                        415,
                        "Image format does not match MIME type"
                    )

                img.verify()

        except (
            UnidentifiedImageError,
            OSError,
            ValueError
        ):
            raise HTTPException(
                415,
                "Invalid image file"
            )

    return attachment, data
