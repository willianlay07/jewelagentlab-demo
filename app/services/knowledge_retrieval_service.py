from sqlalchemy import select

from app.models.knowledge import (
    KnowledgeDocument,
    KnowledgeChunk,
)
from app.rag.embeddings import embed
from app.rag.knowledge_vector_store import collection


def semantic_search(
    db,
    query: str,
    user,
    limit: int = 5,
    include_historical: bool = False,
) -> list[dict]:

    if not query.strip() or limit <= 0:
        return []

    # Search the separate Knowledge Base collection.
    chroma = collection()

    if chroma.count() == 0:
        return []

    results = chroma.query(
        query_embeddings=embed([query]),
        n_results=min(max(limit * 5, 20), chroma.count()),
        include=["distances"],
    )

    ids = results["ids"][0]

    if not ids:
        return []

    # MySQL is the source of truth for permissions,
    # document status and version information.
    stmt = (
        select(KnowledgeChunk, KnowledgeDocument)
        .join(
            KnowledgeDocument,
            KnowledgeChunk.document_id == KnowledgeDocument.id,
        )
        .where(KnowledgeChunk.chroma_id.in_(ids))
    )

    if user.role != "admin":
        stmt = stmt.where(
            KnowledgeDocument.visibility == "all_users"
        )

    if not include_historical:
        stmt = stmt.where(
            KnowledgeDocument.status == "current"
        )
    else:
        stmt = stmt.where(
            KnowledgeDocument.status.in_(
                ["current", "superseded"]
            )
        )

    rows = db.execute(stmt).all()

    by_chroma_id = {
        chunk.chroma_id: (chunk, document)
        for chunk, document in rows
    }

    matches = []

    for chroma_id, distance in zip(
        ids,
        results["distances"][0],
    ):
        pair = by_chroma_id.get(chroma_id)

        if pair is None:
            continue

        chunk, document = pair

        matches.append({
            "document_id": document.id,
            "document_title": document.title,
            "filename": document.filename,
            "version": document.version,
            "status": document.status,
            "effective_from": (
                document.effective_from.isoformat()
                if document.effective_from else None
            ),
            "effective_to": (
                document.effective_to.isoformat()
                if document.effective_to else None
            ),
            "chunk_id": chunk.id,
            "page_number": chunk.page_number,
            "content": chunk.content,
            "distance": float(distance),
        })

        if len(matches) >= limit:
            break

    return matches