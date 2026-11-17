from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc).replace(
        tzinfo=None
    )

class EmailAttachmentAnalysis(Base):
    __tablename__ = "email_attachment_analyses"

    __table_args__ = (
        UniqueConstraint(
            "email_attachment_id",
            name="uq_attachment_analysis"
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    email_attachment_id: Mapped[int] = mapped_column(
        ForeignKey("email_attachments.id"),
        nullable=False,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        nullable=False
    )

    analysis_type: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    model_used: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    requires_review: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
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
