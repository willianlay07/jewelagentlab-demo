import hashlib

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.product import Product
from app.rag.vector_store import collection, product_text
from app.services.indexing_service import schedule_sync

def content_hash(product) -> str:
    return hashlib.sha256(
        product_text(product).encode("utf-8")
    ).hexdigest()

def reconcile() -> dict:
    """Detect missing, stale, and orphan vectors; schedule durable sync jobs.
    For accurate stale detection, vector_store.index_product MUST save content_hash.
    """
    c = collection()
    with SessionLocal() as db:
        products = db.scalars(select(Product)).all()
        by_id = {p.id: p for p in products}
        # For ~1,000 products, a full scan is reasonable.
        vectors = c.get(include=["metadatas"])
        existing = {int(pid): meta or {} for pid, meta in zip(vectors["ids"], vectors["metadatas"])}
        wanted = []
        for pid, p in by_id.items():
            if p.status == "approved":
                if pid not in existing or existing[pid].get("content_hash") != content_hash(p):
                    wanted.append(pid)
            elif pid in existing:
                wanted.append(pid)
        for pid in existing:
            if pid not in by_id:
                wanted.append(pid)
        # Avoid creating unlimited duplicate pending jobs.
        from app.models.indexing_job import IndexingJob
        for pid in set(wanted):
            active = db.scalar(select(IndexingJob.id).where(
                IndexingJob.product_id == pid,
                IndexingJob.status.in_(("pending", "queued", "processing"))
            ).limit(1))
            if active is None:
                schedule_sync(db, pid)
        db.commit()
        return {"missing_or_stale_or_orphan": len(set(wanted)), "total_vectors": len(existing)}

if __name__ == "__main__":
    print(reconcile())
