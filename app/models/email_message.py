from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column


from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class EmailMessage(Base):
    __tablename__ = "email_messages"

    id: Mapped[int] = mapped_column(primary_key=True)

    thread_id: Mapped[int] = mapped_column(
        ForeignKey("email_threads.id"),
        index=True
    )

    gmail_message_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True
    )

    sender: Mapped[str] = mapped_column(
        String(500),
        default=""
    )

    recipient: Mapped[str] = mapped_column(
        String(500),
        default=""
    )

    subject: Mapped[str] = mapped_column(
        String(500),
        default=""
    )

    body_text: Mapped[str] = mapped_column(
        Text,
        default=""
    )

    body_html: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    remote_images: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utcnow
    )
