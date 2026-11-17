from email.utils import make_msgid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.email_draft import EmailDraft
from app.models.email_send import EmailSend


def reserve_email_send(db, draft_id: int, user):
    """
    Reserve one sending operation per approved draft.

    This function does NOT call Gmail.
    """

    draft = db.scalar(
        select(EmailDraft)
        .where(EmailDraft.id == draft_id)
        .with_for_update()
    )

    if draft is None:
        raise HTTPException(
            404,
            "Email draft not found"
        )

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

    if existing is not None:
        raise HTTPException(
            409,
            f"Send already reserved: {existing.status}"
        )

    record = EmailSend(
        draft_id=draft.id,
        requested_by=user.id,
        status="reserved",
        rfc_message_id=make_msgid(
            domain="orro.com"
        )
    )

    db.add(record)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409,
            "Send already reserved"
        )

    db.refresh(record)

    return {
        "send_id": record.id,
        "draft_id": record.draft_id,
        "status": record.status,
        "rfc_message_id": record.rfc_message_id
    }
