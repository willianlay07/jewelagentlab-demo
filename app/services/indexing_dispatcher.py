import logging
import time
from datetime import timedelta

from app.core.redis_config import get_indexing_queue

from sqlalchemy import select, update, or_
from app.db.session import SessionLocal
from app.models.indexing_job import IndexingJob, utcnow

log = logging.getLogger(__name__)

def dispatch_once(
    batch_size: int = 25
) -> int:
    """Run ONE dispatcher instance. Poll MySQL; recover jobs lost in Redis."""

    queue = get_indexing_queue()

    now = utcnow()
    sent = 0

    with SessionLocal() as db:
        # Requeue work stranded by worker crashes or lost Redis queue state.
        db.execute(update(IndexingJob).where(
            IndexingJob.status.in_(("queued", "processing")),
            IndexingJob.updated_at < now - timedelta(minutes=10)
        ).values(status="pending", next_retry_at=now, updated_at=now))

        db.commit()

        jobs = db.scalars(select(IndexingJob).where(
            IndexingJob.status == "pending", IndexingJob.next_retry_at <= now
        ).order_by(IndexingJob.id).limit(batch_size).with_for_update(skip_locked=True)).all()
        
        for job in jobs:
            job.status = "queued"
            job.updated_at = now

        ids = [j.id for j in jobs]
        db.commit()

    for job_id in ids:
        try:
            # Unique dispatch ID; duplicates can be harmlessly skipped by worker.
            queue.enqueue("app.workers.indexing_worker.process_indexing_job", job_id,
                          job_timeout=180, result_ttl=600)
            sent += 1
        except Exception:
            log.exception("Redis enqueue failed for job %s", job_id)
            with SessionLocal() as db:
                job = db.get(IndexingJob, job_id)
                if job and job.status == "queued":
                    job.status = "pending"
                    job.next_retry_at = utcnow() + timedelta(seconds=30)
                    db.commit()

    return sent

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    while True:
        try:
            dispatch_once()
        except Exception:
            log.exception("Dispatcher cycle failed")
        time.sleep(5)