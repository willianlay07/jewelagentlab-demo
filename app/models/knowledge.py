from datetime import date, datetime, timezone

from sqlalchemy import (
    String,
    Text,
    ForeignKey,
    Date,
    DateTime,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now():
    return datetime.now(timezone.utc)


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    title: Mapped[str] = mapped_column(
        String(255)
    )

    filename: Mapped[str] = mapped_column(
        String(255)
    )

    file_path: Mapped[str] = mapped_column(
        String(500)
    )

    file_type: Mapped[str] = mapped_column(
        String(20)
    )

    visibility: Mapped[str] = mapped_column(
        String(20),
        default="all_users",
        index=True,
    )

    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
    )

    supersedes_document_id: Mapped[int | None] = mapped_column(
        ForeignKey("knowledge_documents.id"),
        nullable=True,
    )

    effective_from: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    effective_to: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="processing",
        index=True,
    )

    uploaded_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
    )

    chunks: Mapped[list["KnowledgeChunk"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    __table_args__ = (
        UniqueConstraint(
            "document_id",
            "chunk_index",
            name="uq_knowledge_document_chunk",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    document_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_documents.id"),
        index=True,
    )

    chunk_index: Mapped[int] = mapped_column(
        Integer
    )

    content: Mapped[str] = mapped_column(
        Text
    )

    page_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    chroma_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
    )

    document: Mapped["KnowledgeDocument"] = relationship(
        back_populates="chunks",
    )