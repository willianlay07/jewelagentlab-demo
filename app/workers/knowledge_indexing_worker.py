import logging
from datetime import date

from app.db.session import SessionLocal
from app.models.knowledge import KnowledgeDocument
from app.services.knowledge_chunk_service import save_document_chunks
from app.services.knowledge_indexing_service import index_document
from app.services.knowledge_activation_service import activate_document

log = logging.getLogger(__name__)


def process_knowledge_document(document_id: int):
    """
    RQ worker entrypoint.

    Extracts, chunks, embeds and indexes a document.
    Activates it only after successful indexing.
    """

    with SessionLocal() as db:
        document = db.get(KnowledgeDocument, document_id)

        if document is None:
            log.warning(
                "Knowledge document %s not found",
                document_id,
            )
            return

        # Avoid reprocessing an already activated document.
        if document.status != "processing":
            log.info(
                "Skipping document %s with status %s",
                document_id,
                document.status,
            )
            return

        try:
            log.info(
                "Processing knowledge document %s",
                document_id,
            )

            # 1. Extract text and save chunks.
            chunk_count = save_document_chunks(
                db,
                document,
            )

            log.info(
                "Document %s: %s chunks saved",
                document_id,
                chunk_count,
            )

            # 2. Generate embeddings and index ChromaDB.
            vector_count = index_document(
                db,
                document,
            )

            log.info(
                "Document %s: %s vectors indexed",
                document_id,
                vector_count,
            )

            # 3. Activate immediately if effective.
            if (
                document.effective_from is None
                or document.effective_from <= date.today()
            ):
                activate_document(db, document_id)

                log.info(
                    "Document %s activated",
                    document_id,
                )
            else:
                # Keep future-dated documents pending.
                log.info(
                    "Document %s indexed; future activation date %s",
                    document_id,
                    document.effective_from,
                )

            return {
                "document_id": document_id,
                "chunks": chunk_count,
                "vectors": vector_count,
                "status": document.status,
            }

        except Exception:
            db.rollback()

            document = db.get(
                KnowledgeDocument,
                document_id,
            )

            if document and document.status == "processing":
                document.status = "failed"
                db.commit()

            log.exception(
                "Knowledge indexing failed for document %s",
                document_id,
            )

            raise
