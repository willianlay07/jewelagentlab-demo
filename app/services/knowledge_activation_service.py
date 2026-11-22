from datetime import date

from fastapi import HTTPException
from sqlalchemy import select

from app.models.knowledge import KnowledgeDocument, KnowledgeChunk


def activate_document(
    db, 
    document_id: int
):
    document = db.get(KnowledgeDocument, document_id)

    if document is None:
        raise HTTPException(404, "Document not found")

    if document.status not in ("processing", "current"):
        raise HTTPException(
            409,
            "Document cannot be activated",
        )

    chunks = db.scalars(
        select(KnowledgeChunk).where(
            KnowledgeChunk.document_id == document.id
        )
    ).all()

    if not chunks or any(not c.chroma_id for c in chunks):
        raise HTTPException(
            409,
            "Document is not fully indexed",
        )

    previous = None

    if document.supersedes_document_id:
        previous = db.get(
            KnowledgeDocument,
            document.supersedes_document_id,
        )

        if previous is None:
            raise HTTPException(
                409,
                "Previous document not found",
            )

        if previous.status not in ("current", "superseded"):
            raise HTTPException(
                409,
                "Previous document must be activated first",
            )

        if (
            document.effective_from is not None
            and previous.effective_from is not None
            and document.effective_from <= previous.effective_from
        ):
            raise HTTPException(
                409,
                "New version must have a later effective date",
            )

    document.status = "current"

    if previous:
        previous.status = "superseded"

        if document.effective_from:
            previous.effective_to = date.fromordinal(
                document.effective_from.toordinal() - 1
            )

    db.commit()
    db.refresh(document)

    return document