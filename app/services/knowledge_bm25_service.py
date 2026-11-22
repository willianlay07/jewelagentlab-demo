import re

from rank_bm25 import BM25Plus
from sqlalchemy import select

from app.models.knowledge import (
    KnowledgeDocument,
    KnowledgeChunk,
)


def tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def bm25_search(
    db,
    query: str,
    user,
    limit: int = 5,
    include_historical: bool = False,
) -> list[dict]:

    if not query.strip() or limit <= 0:
        return []

    # MySQL applies permissions before retrieval.
    stmt = (
        select(KnowledgeChunk, KnowledgeDocument)
        .join(
            KnowledgeDocument,
            KnowledgeChunk.document_id == KnowledgeDocument.id,
        )
    )

    if user.role != "admin":
        stmt = stmt.where(
            KnowledgeDocument.visibility == "all_users"
        )

    if include_historical:
        stmt = stmt.where(
            KnowledgeDocument.status.in_(
                ["current", "superseded"]
            )
        )
    else:
        stmt = stmt.where(
            KnowledgeDocument.status == "current"
        )

    rows = db.execute(stmt).all()

    if not rows:
        return []

    tokenized_corpus = [
        tokenize(chunk.content)
        for chunk, _ in rows
    ]

    bm25 = BM25Plus(tokenized_corpus)

    scores = bm25.get_scores(tokenize(query))

    ranked = sorted(
        zip(rows, scores),
        key=lambda item: item[1],
        reverse=True,
    )

    matches = []

    for (chunk, document), score in ranked:
        if score <= 0:
            continue

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
            "bm25_score": float(score),
        })

        if len(matches) >= limit:
            break

    return matches