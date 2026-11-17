from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class EmailThread(Base):
    __tablename__ = "email_threads"

    id: Mapped[int] = mapped_column(primary_key=True)

    gmail_thread_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True
    )

    subject: Mapped[str] = mapped_column(
        String(500),
        default=""
    )

    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utcnow
    )
