import base64
import os

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime, parseaddr

from cryptography.fernet import Fernet
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from sqlalchemy import select

from app.core.google_config import SCOPES
from app.db.session import SessionLocal

from app.models.gmail_connection import GmailConnection
from app.models.email_thread import EmailThread
from app.models.email_message import EmailMessage

from html.parser import HTMLParser
from urllib.parse import urlsplit


def gmail_client():
    with SessionLocal() as db:
        connection = db.get(GmailConnection, 1)

        if connection is None:
            raise ValueError(
                "Connect the shared Gmail account first"
            )

        encrypted = connection.encrypted_refresh_token

    refresh_token = Fernet(
        os.environ["GMAIL_TOKEN_ENCRYPTION_KEY"].encode()
    ).decrypt(encrypted.encode()).decode()

    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        scopes=SCOPES
    )

    credentials.refresh(Request())

    return build(
        "gmail",
        "v1",
        credentials=credentials,
        cache_discovery=False
    )


def header(payload, name):
    for item in payload.get("headers", []):
        if item.get("name", "").lower() == name.lower():
            return item.get("value", "")

    return ""


def extract_text(part):
    # Extract plain-text content, including multipart emails.
    if (
        part.get("mimeType") == "text/plain"
        and part.get("body", {}).get("data")
    ):
        encoded = part["body"]["data"]

        return base64.urlsafe_b64decode(
            encoded + "=" * (-len(encoded) % 4)
        ).decode("utf-8", errors="replace")

    for child in part.get("parts", []):
        result = extract_text(child)

        if result:
            return result

    return ""


def message_date(message, payload):
    value = header(payload, "Date")

    if value:
        try:
            parsed = parsedate_to_datetime(value)

            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)

            return parsed.astimezone(
                timezone.utc
            ).replace(tzinfo=None)

        except (ValueError, TypeError, OverflowError):
            pass

    millis = message.get("internalDate")

    if millis:
        return datetime.fromtimestamp(
            int(millis) / 1000,
            tz=timezone.utc
        ).replace(tzinfo=None)

    return None


class RemoteImageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []
        self.seen = set()

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "img":
            return

        attributes = dict(attrs)
        src = (attributes.get("src") or "").strip()

        if not src or len(src) > 2048:
            return

        try:
            parsed = urlsplit(src)
        except ValueError:
            return

        # Only retain HTTPS references.
        if parsed.scheme.lower() != "https":
            return

        if not parsed.hostname:
            return

        if src in self.seen:
            return

        self.seen.add(src)

        self.images.append({
            "url": src,
            "alt": (
                attributes.get("alt") or ""
            )[:200]
        })


def extract_html(part):
    if (
        part.get("mimeType") == "text/html"
        and part.get("body", {}).get("data")
    ):
        encoded = part["body"]["data"]

        return base64.urlsafe_b64decode(
            encoded + "=" * (-len(encoded) % 4)
        ).decode("utf-8", errors="replace")

    for child in part.get("parts", []):
        html = extract_html(child)

        if html:
            return html

    return ""


def extract_remote_images(payload):
    html = extract_html(payload)

    if not html:
        return []

    parser = RemoteImageParser()
    parser.feed(html)

    return parser.images[:30]


def sync_inbox(max_messages=50):
    from app.services.gmail_attachment_service import (
        save_attachment_metadata
    )

    service = gmail_client()

    profile = service.users().getProfile(
        userId="me"
    ).execute()

    connected_email = (
        profile.get("emailAddress") or ""
    ).strip().lower()

    listing = service.users().messages().list(
        userId="me",
        labelIds=["INBOX"],
        maxResults=max_messages
    ).execute()

    created = 0
    attachments_created = 0

    messages = listing.get("messages", [])

    with SessionLocal() as db:
        for item in messages:
            msg_id = item["id"]

            
            existing = db.scalar(
                select(EmailMessage).where(
                    EmailMessage.gmail_message_id == msg_id
                )
            )

            # Already imported: skip Gmail API detail request.
            if existing is not None:
                continue

            # Only download newly discovered messages.
            message = service.users().messages().get(
                userId="me",
                id=msg_id,
                format="full"
            ).execute()

            payload = message.get("payload", {})



            gmail_thread_id = message["threadId"]
            subject = header(payload, "Subject")
            date = message_date(message, payload)

            sender = header(payload, "From")
            recipient = header(payload, "To")

            sender_email = parseaddr(sender)[1].strip().lower()

            is_incoming = (
                bool(sender_email)
                and sender_email != connected_email
            )

            thread = db.scalar(
                select(EmailThread).where(
                    EmailThread.gmail_thread_id == gmail_thread_id
                )
            )

            
            if thread is None:
                thread = EmailThread(
                    gmail_thread_id=gmail_thread_id,
                    subject=subject,
                    is_read=not is_incoming
                )

                db.add(thread)
                db.flush()

            elif is_incoming:
                # Only a newly imported incoming message
                # can reset an existing thread to unread.
                #
                # Avoid resetting the status for an older
                # message imported during historical sync.
                if (
                    date is not None
                    and (
                        thread.last_message_at is None
                        or date > thread.last_message_at
                    )
                ):
                    thread.is_read = False


            if date and (
                thread.last_message_at is None
                or date > thread.last_message_at
            ):
                thread.last_message_at = date

            if not thread.subject and subject:
                thread.subject = subject

            email_record = EmailMessage(
                thread_id=thread.id,
                gmail_message_id=msg_id,
                sender=sender,
                recipient=recipient,
                subject=subject,
                body_text=extract_text(payload),
                body_html=extract_html(payload)[:2_000_000] or None,
                remote_images=extract_remote_images(payload),
                sent_at=date
            )

            db.add(email_record)
            db.flush()

            attachments_created += save_attachment_metadata(
                db,
                email_record,
                payload
            )

            created += 1

        db.commit()

    return {
        "imported": created,
        "scanned": len(messages),
        "attachments_imported": attachments_created
    }
