from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class IndexingJob(Base):
    __tablename__ = "indexing_jobs"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )
    # Deliberately no FK: deletion jobs must survive product deletion.
    product_id: Mapped[int] = mapped_column(
        Integer, 
        nullable=False, 
        index=True
    )
    action: Mapped[str] = mapped_column(
        String(10), 
        nullable=False
    )  # sync/delete
    status: Mapped[str] = mapped_column(
        String(20), 
        nullable=False, 
        default="pending"
    )
    attempts: Mapped[int] = mapped_column(
        Integer, 
        nullable=False, 
        default=0
    )
    max_attempts: Mapped[int] = mapped_column(
        Integer, 
        nullable=False, 
        default=5
    )
    next_retry_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=utcnow, 
        nullable=False
    )
    last_error: Mapped[str | None] = mapped_column(
        Text, 
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=utcnow, 
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=utcnow, 
        onupdate=utcnow, 
        nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    __table_args__ = (Index("ix_indexing_due", "status", "next_retry_at"),)
