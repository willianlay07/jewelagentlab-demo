from datetime import datetime, timezone
from fastapi import HTTPException

from app.models.product import ApprovalLog
from app.services.product_service import get
from app.services.indexing_service import schedule_sync

def review(
    db,
    admin,
    pid,
    decision,
    reason=None
):
    p = get(
        db,
        admin,
        pid
    )

    if p.status != "pending":
        raise HTTPException(
            409,
            "Product not pending"
        )

    p.status = decision
    p.reviewed_by = admin.id
    p.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    p.rejection_reason = reason if decision == "rejected" else None

    db.add(
        ApprovalLog(
            product_id=pid,
            reviewer_id=admin.id,
            decision=decision,
            reason=reason
        )
    )

    schedule_sync(db, pid)
    db.commit()

    return get(
        db,
        admin,
        pid
    )