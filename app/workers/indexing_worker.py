import logging
from datetime import timedelta

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.product import Product
from app.models.indexing_job import IndexingJob, utcnow
from app.rag.vector_store import index_product, remove_product

log = logging.getLogger(__name__)
DELAYS = (30, 120, 600, 1800)

def process_indexing_job(
    job_id: int
):
    """RQ entrypoint. Re-reads the CURRENT product; never trusts stale job payloads."""

    with SessionLocal() as db:

        job = db.get(IndexingJob, job_id)

        if job is None or job.status not in ("queued", "pending"):
            return

        job.status = "processing"
        job.attempts += 1
        db.commit()

        product_id = job.product_id

        try:
            # Missing, pending, rejected, or draft => delete stale vector.
            p = db.scalar(
                select(Product).where(Product.id == product_id)
            )
            
            if p is None or p.status != "approved":
                remove_product(product_id)
            else:
                index_product(p)

                # Recheck after embedding call in case approval changed mid-flight.
                db.expire_all()
                current = db.get(Product, product_id)
                if current is None or current.status != "approved":
                    remove_product(product_id)

            job.status = "completed"
            job.last_error = None
            job.completed_at = utcnow()
            db.commit()
        except Exception as exc:
            db.rollback()

            job = db.get(IndexingJob, job_id)
            job.last_error = str(exc)[:1000]

            if job.attempts >= job.max_attempts:
                job.status = "failed"
            else:
                job.status = "pending"
                job.next_retry_at = utcnow() + timedelta(seconds=DELAYS[min(job.attempts - 1, len(DELAYS)-1)])
            
            db.commit()
            log.exception("Index job %s failed (attempt %s)", job_id, job.attempts)
            # No raise: retries are controlled by the durable MySQL dispatcher.