from fastapi import HTTPException
from sqlalchemy import select

from app.models.knowledge import KnowledgeDocument

def validate_new_version(
    db, 
    previous_document_id: int
):
    previous = db.get(KnowledgeDocument, previous_document_id)

    if previous is None:
        raise HTTPException(
            status_code=404,
            detail="Previous document not found",
        )

    if previous.status not in ("current", "processing"):
        raise HTTPException(
            status_code=409,
            detail="Cannot replace this document version",
        )

    existing = db.scalar(
        select(KnowledgeDocument.id).where(
            KnowledgeDocument.supersedes_document_id
            == previous_document_id,
            KnowledgeDocument.status != "failed",
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="A replacement version already exists",
        )

    return previous