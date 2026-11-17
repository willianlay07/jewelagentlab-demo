from datetime import datetime, timezone

from sqlalchemy import (
    String, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class EmailDraft(Base):
    __tablename__ = "email_drafts"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    email_message_id: Mapped[int] = mapped_column(
        ForeignKey("email_messages.id"),
        unique=True,
        index=True
    )

    subject: Mapped[str] = mapped_column(
        String(500)
    )

    body: Mapped[str] = mapped_column(
        Text
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="pending_review"
    )

    category: Mapped[str] = mapped_column(
        String(50)
    )

    product_references: Mapped[list] = mapped_column(
        JSON, 
        default=list
    )

    model_used: Mapped[str | None] = mapped_column(
        String(100), 
        nullable=True
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), 
        nullable=True
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=utcnow, 
        onupdate=utcnow
    )


class EmailDraftAudit(Base):
    __tablename__ = "email_draft_audit"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    draft_id: Mapped[int] = mapped_column(
        ForeignKey("email_drafts.id"),
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    action: Mapped[str] = mapped_column(
        String(30)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow
    )