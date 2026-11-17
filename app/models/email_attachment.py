from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Integer,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Text
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc).replace(
        tzinfo=None
    )


class EmailAttachment(Base):
    __tablename__ = "email_attachments"

    __table_args__ = (
        UniqueConstraint(
            "email_message_id",
            "part_key",
            name="uq_email_attachment_part"
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    email_message_id: Mapped[int] = mapped_column(
        ForeignKey("email_messages.id"),
        index=True
    )

    gmail_attachment_id: Mapped[str] = mapped_column(
        Text
    )

    attachment_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False
    )

    filename: Mapped[str] = mapped_column(
        String(500)
    )

    mime_type: Mapped[str] = mapped_column(
        String(150)
    )

    size: Mapped[int] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utcnow
    )

    part_key: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )