import chromadb
from app.core.ai_config import ai_settings
from app.rag.embeddings import embed

def collection():
    if ai_settings.chroma_mode == "http":
        client = chromadb.HttpClient(
            host=ai_settings.chroma_host,
            port=ai_settings.chroma_port
        )
    else:
        client = chromadb.PersistentClient(
            path=ai_settings.chroma_path
        )

    return client.get_or_create_collection(
        name="orro_approved_products"
    )


def product_text(
    p
) -> str:

    attributes = ", ".join(
        f"{k}: {v}"
        for k, v in (p.attributes or {}).items()
    )

    return (f"{p.name}. Category: {p.category}. "
            f"Silver price SGD: {p.silver_price if p.silver_price is not None else 'unavailable'}. "
            f"Gold price SGD: {p.gold_price if p.gold_price is not None else 'unavailable'}. "
            f"{p.description or ''}. {attributes}")

def index_product(
    p
):
    if p.status != "approved":
        remove_product(p.id)
        return

    collection().upsert(
        ids=[str(p.id)],
        documents=[product_text(p)],
        embeddings=embed([product_text(p)]),
        metadatas=[{"product_id":p.id}]
    )

def remove_product(
    product_id: int
):
    collection().delete(
        ids=[str(product_id)]
    )

def search(
    query: str,
    limit: int = 20
) -> list[int]:
    c = collection()

    if c.count() == 0:
        return []

    result = c.query(
        query_embeddings=embed([query]),
        n_results=min(
            limit,c.count()
        )
    )

    return [
        int(x)
        for x in result["ids"][0]
    ]