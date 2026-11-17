from datetime import datetime, timezone

from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Text
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc).replace(
        tzinfo=None
    )

class EmailSend(Base):
    __tablename__ = "email_sends"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    draft_id: Mapped[int] = mapped_column(
        ForeignKey("email_drafts.id"),
        unique=True,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="reserved",
        nullable=False
    )

    gmail_message_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    rfc_message_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    gmail_thread_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    requested_by: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    requested_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utcnow
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )