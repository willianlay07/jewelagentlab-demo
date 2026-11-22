import chromadb

from app.core.ai_config import ai_settings
from app.rag.embeddings import embed

COLLECTION_NAME = "jewelagentlab_knowledge"


def collection():
    if ai_settings.chroma_mode == "http":
        client = chromadb.HttpClient(
            host=ai_settings.chroma_host,
            port=ai_settings.chroma_port,
        )
    else:
        client = chromadb.PersistentClient(
            path=ai_settings.chroma_path,
        )

    return client.get_or_create_collection(
        name=COLLECTION_NAME
    )


def index_chunks(
    document, 
    chunks
):
    if not chunks:
        raise ValueError("No chunks to index")

    texts = [chunk.content for chunk in chunks]

    embeddings = embed(texts)

    ids = [
        f"knowledge_{document.id}_{chunk.id}"
        for chunk in chunks
    ]

    metadatas = [
        {
            "document_id": document.id,
            "chunk_id": chunk.id,
            "version": document.version,
            "visibility": document.visibility,
            "page_number": chunk.page_number or 0,
        }
        for chunk in chunks
    ]

    collection().upsert(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    return ids


def delete_document_vectors(
    document_id: int
):
    collection().delete(
        where={"document_id": document_id}
    )