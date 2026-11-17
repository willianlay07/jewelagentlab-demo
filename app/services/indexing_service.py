from sqlalchemy import select
from app.models.indexing_job import IndexingJob, utcnow

def schedule_sync(
    db,
    product_id: int,
    action: str = "sync"
) -> IndexingJob:

    """Call BEFORE db.commit(), in the same transaction as the product change.

    A sync job reads current MySQL state at execution time. If no longer approved,
    it deletes the vector. Repeated jobs are safe to process.

    Create indexing jobs transactionally when products are approved or changed.
    """

    if action not in ("sync", "delete"):
        raise ValueError("Unsupported indexing action")

    job = IndexingJob(
        product_id=product_id,
        action=action,
        status="pending",
        attempts=0,
        next_retry_at=utcnow()
    )

    db.add(job)
    return job