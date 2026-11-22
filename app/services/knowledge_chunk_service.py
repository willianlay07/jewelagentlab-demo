from sqlalchemy import select

from app.models.knowledge import KnowledgeChunk
from app.services.knowledge_extraction_service import extract_document
from app.services.knowledge_chunking_service import chunk_document
from app.rag.knowledge_vector_store import delete_document_vectors


def save_document_chunks(db, document):
    """
    Extract and save document chunks.

    Safe to retry:
    - Reuses existing chunk IDs.
    - Updates existing content.
    - Creates missing chunks.
    - Removes obsolete chunks.
    - Clears old Chroma vectors before rebuilding.
    """

    pages = extract_document(document.file_path)
    chunks = chunk_document(pages)

    if not chunks:
        raise ValueError(
            "No extractable text found in document"
        )

    # Read existing chunks.
    existing_chunks = db.scalars(
        select(KnowledgeChunk).where(
            KnowledgeChunk.document_id == document.id
        )
    ).all()

    existing_by_index = {
        chunk.chunk_index: chunk
        for chunk in existing_chunks
    }

    new_indices = set()

    # Update or create chunks.
    for chunk_data in chunks:
        index = chunk_data["chunk_index"]
        new_indices.add(index)

        existing = existing_by_index.get(index)

        if existing:
            existing.content = chunk_data["content"]
            existing.page_number = chunk_data["page_number"]
            existing.chroma_id = None
        else:
            db.add(
                KnowledgeChunk(
                    document_id=document.id,
                    chunk_index=index,
                    content=chunk_data["content"],
                    page_number=chunk_data["page_number"],
                )
            )

    # Remove obsolete chunks.
    for old_chunk in existing_chunks:
        if old_chunk.chunk_index not in new_indices:
            db.delete(old_chunk)

    # Clear old vectors for this document.
    # Other documents and product vectors are untouched.
    delete_document_vectors(document.id)

    db.commit()

    return len(chunks)
