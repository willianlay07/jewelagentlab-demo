from fastapi import HTTPException
from sqlalchemy import update

from app.models.email_send import EmailSend


def begin_email_send(db, send_id: int):
    """
    Atomically transition reserved -> sending.

    Does not call Gmail.
    """

    result = db.execute(
        update(EmailSend)
        .where(
            EmailSend.id == send_id,
            EmailSend.status == "reserved"
        )
        .values(status="sending")
    )

    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(
            409,
            "Send is not reserved or has already started"
        )

    db.commit()

    record = db.get(EmailSend, send_id)

    return {
        "send_id": record.id,
        "draft_id": record.draft_id,
        "status": record.status,
        "rfc_message_id": record.rfc_message_id
    }
