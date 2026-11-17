from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc).replace(
        tzinfo=None
    )

class EmailClassification(Base):
    __tablename__ = "email_classifications"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    email_message_id: Mapped[int] = mapped_column(
        ForeignKey("email_messages.id"),
        unique=True,
        index=True
    )

    category: Mapped[str] = mapped_column(
        String(50)
    )

    confidence: Mapped[float] = mapped_column(
        Float
    )

    summary: Mapped[str] = mapped_column(
        String(500)
    )

    requires_review: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    extracted_data: Mapped[dict] = mapped_column(
        JSON,
        default=dict
    )

    model_used: Mapped[str] = mapped_column(
        String(100)
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