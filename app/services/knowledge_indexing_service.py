from sqlalchemy import select

from app.models.knowledge import KnowledgeChunk
from app.rag.knowledge_vector_store import (
    index_chunks,
    delete_document_vectors,
)


def index_document(db, document):
    chunks = db.scalars(
        select(KnowledgeChunk)
        .where(KnowledgeChunk.document_id == document.id)
        .order_by(KnowledgeChunk.chunk_index)
    ).all()

    if not chunks:
        raise ValueError("Document has no chunks")

    try:
        # Generate embeddings and upsert into ChromaDB.
        ids = index_chunks(document, chunks)

        if len(ids) != len(chunks):
            raise RuntimeError(
                "Chroma indexing count mismatch"
            )

        # Synchronize vector IDs with MySQL.
        for chunk, chroma_id in zip(chunks, ids):
            chunk.chroma_id = chroma_id

        db.commit()

        return len(ids)

    except Exception:
        db.rollback()

        # Remove partially indexed vectors for this document.
        # This does not affect other documents.
        try:
            delete_document_vectors(document.id)
        except Exception:
            # Preserve the original exception.
            pass

        raise