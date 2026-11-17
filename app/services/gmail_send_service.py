from email.message import EmailMessage as MIMEEmailMessage

from fastapi import HTTPException

from email.utils import parseaddr
from app.models.email_send import EmailSend

from app.models.email_draft import EmailDraft
from app.models.email_message import EmailMessage
from app.models.email_thread import EmailThread
from app.services.gmail_sync_service import gmail_client
from sqlalchemy import select

import base64
import logging

from googleapiclient.errors import HttpError

from app.models.email_draft import EmailDraftAudit
from app.services.email_send_state_service import begin_email_send
from app.models.email_draft import utcnow

logger = logging.getLogger(__name__)


def get_header(payload, name):
    for item in payload.get("headers", []):
        if item.get("name", "").lower() == name.lower():
            return item.get("value", "")

    return ""


def prepare_gmail_reply(
    db,
    draft_id: int,
    require_reservation: bool = True
):
    draft = db.get(EmailDraft, draft_id)

    if draft is None:
        raise HTTPException(404, "Email draft not found")

    if draft.status != "approved":
        raise HTTPException(
            409,
            "Only approved drafts can be sent"
        )

    message = db.get(
        EmailMessage,
        draft.email_message_id
    )

    if message is None:
        raise HTTPException(
            404,
            "Original email message not found"
        )

    thread = db.get(
        EmailThread,
        message.thread_id
    )

    if thread is None:
        raise HTTPException(
            404,
            "Original email thread not found"
        )

    # Extract customer email address.
    customer_email = parseaddr(
        message.sender
    )[1].strip().lower()

    if not customer_email:
        raise HTTPException(
            422,
            "Customer email address is invalid"
        )

    service = gmail_client()

    profile = service.users().getProfile(
        userId="me"
    ).execute()

    sender_email = profile["emailAddress"].strip().lower()

    if sender_email != "wilyanhein2013@gmail.com":
        raise HTTPException(
            403,
            "Unexpected Gmail sender account"
        )

    # Fetch original Gmail headers.
    original = service.users().messages().get(
        userId="me",
        id=message.gmail_message_id,
        format="metadata",
        metadataHeaders=[
            "Message-ID",
            "References",
            "Reply-To",
            "Subject"
        ]
    ).execute()

    payload = original.get("payload", {})

    original_message_id = get_header(
        payload,
        "Message-ID"
    )

    references = get_header(
        payload,
        "References"
    )

    reply_to = parseaddr(
        get_header(payload, "Reply-To")
    )[1].strip().lower()

    recipient = reply_to or customer_email

    if not original_message_id:
        raise HTTPException(
            422,
            "Original email has no Message-ID header"
        )

    # Prepare MIME reply.
    reply = MIMEEmailMessage()

    reply["From"] = sender_email

    reply["To"] = recipient
    reply["Subject"] = draft.subject
    reply["In-Reply-To"] = original_message_id
    reply["References"] = (
        f"{references} {original_message_id}".strip()
    )

    send_record = db.scalar(
        select(EmailSend).where(
            EmailSend.draft_id == draft_id
        )
    )

    if send_record is None:
        if require_reservation:
            raise HTTPException(
                409,
                "Email send reservation not found"
            )
    else:
        if send_record.status != "reserved":
            raise HTTPException(
                409,
                f"Cannot prepare send: {send_record.status}"
            )

        if not send_record.rfc_message_id:
            raise HTTPException(
                409,
                "Reserved RFC Message-ID is missing"
            )

        reply["Message-ID"] = send_record.rfc_message_id

    reply.set_content(draft.body)

    return {
        "draft_id": draft.id,
        "recipient": recipient,
        "subject": draft.subject,
        "gmail_thread_id": thread.gmail_thread_id,
        "message_id": reply["Message-ID"],
        "mime_message": reply
    }


def send_gmail_reply(db, draft_id: int, user):
    """
    Send an approved Gmail reply.

    No automatic retry after Gmail is called.
    """

    # 1. Prepare before changing the database status.
    prepared = prepare_gmail_reply(db, draft_id)

    recipient = prepared["recipient"].strip().lower()

    
    

    send_record = db.scalar(
        select(EmailSend).where(
            EmailSend.draft_id == draft_id
        )
    )

    if send_record is None:
        raise HTTPException(
            409,
            "Send reservation not found"
        )

    send_id = send_record.id

    # 2. Atomically claim the send.
    begin_email_send(db, send_id)

    # 3. Prepare Gmail request.
    raw_message = base64.urlsafe_b64encode(
        prepared["mime_message"].as_bytes()
    ).decode("ascii")

    try:
        service = gmail_client()

        # Gmail may accept the message even if the
        # HTTP response is lost. Never blindly retry.
        response = service.users().messages().send(
            userId="me",
            body={
                "raw": raw_message,
                "threadId": prepared["gmail_thread_id"]
            }
        ).execute(num_retries=0)

    except Exception as exc:
        logger.exception(
            "Gmail send outcome uncertain for draft %s",
            draft_id
        )

        db.rollback()

        record = db.get(EmailSend, send_id)
        record.status = "uncertain"
        record.error_message = (
            f"{type(exc).__name__}: {str(exc)}"
        )[:2000]

        db.commit()

        raise HTTPException(
            502,
            "Gmail send outcome uncertain. "
            "Do not resend until the result is verified."
        )

    # 4. Save Gmail's confirmed response.
    try:
        gmail_message_id = response.get("id")
        gmail_thread_id = response.get("threadId")

        if not gmail_message_id:
            raise ValueError(
                "Gmail returned no message ID"
            )

        record = db.get(EmailSend, send_id)
        record.status = "sent"
        record.gmail_message_id = gmail_message_id
        record.gmail_thread_id = gmail_thread_id
        record.sent_at = utcnow()
        record.error_message = None

        db.add(
            EmailDraftAudit(
                draft_id=draft_id,
                user_id=user.id,
                action="sent"
            )
        )

        db.commit()

    except Exception:
        db.rollback()

        logger.exception(
            "Gmail accepted draft %s, "
            "but database confirmation failed",
            draft_id
        )

        raise HTTPException(
            500,
            "Gmail accepted the send, but database "
            "confirmation failed. Do not resend."
        )

    return {
        "send_id": send_id,
        "draft_id": draft_id,
        "status": "sent",
        "gmail_message_id": gmail_message_id,
        "gmail_thread_id": gmail_thread_id
    }
