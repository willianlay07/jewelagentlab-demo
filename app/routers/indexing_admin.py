from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from app.core.dependencies import Admin
from app.db.session import Db
from app.models.indexing_job import IndexingJob, utcnow
from app.services.indexing_service import schedule_sync
from app.services.indexing_reconciliation import reconcile

router = APIRouter(
    prefix="/admin/indexing", 
    tags=["Indexing"]
)

@router.get("/jobs")
def jobs(
    db: Db, 
    admin: Admin
):
    rows = db.scalars(
        select(IndexingJob).order_by(IndexingJob.id.desc()).limit(100)
    ).all()

    return [
        {
            "id": j.id, 
            "product_id": j.product_id, 
            "action": j.action,
            "status": j.status, 
            "attempts": j.attempts, 
            "last_error": j.last_error
        } for j in rows
    ]

@router.post(
    "/jobs/{job_id}/retry"
)
def retry(
    job_id: int, 
    db: Db, 
    admin: Admin
):
    
    job = db.get(IndexingJob, job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    
    if job.status != "failed":
        raise HTTPException(409, "Only failed jobs can be manually retried")
    
    job.status = "pending"
    job.attempts = 0
    job.next_retry_at = utcnow()
    job.last_error = None
    db.commit()
    
    return {
        "id": job.id, 
        "status": job.status
    }

@router.post("/reconcile")
def run_reconcile(
    admin: Admin
):
    return reconcile()
