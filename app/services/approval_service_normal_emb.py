from datetime import datetime, timezone

from fastapi import HTTPException

from app.models.product import ApprovalLog
from app.services.product_service import get
from app.rag.vector_store import index_product, remove_product
from app.services.indexing_service import schedule_sync

def review(db, admin, pid, decision, reason=None):
    p = get(db, admin, pid)

    if p.status != "pending":
        raise HTTPException(
            409,
            "Product not pending"
        )

    if decision not in ("approved", "rejected"):
        raise HTTPException(
            422,
            "Invalid approval decision"
        )

    p.status = decision
    p.reviewed_by = admin.id
    p.reviewed_at = datetime.now(
        timezone.utc
    ).replace(tzinfo=None)

    p.rejection_reason = (
        reason if decision == "rejected" else None
    )

    db.add(
        ApprovalLog(
            product_id=pid,
            reviewer_id=admin.id,
            decision=decision,
            reason=reason
        )
    )

    db.commit()

    # Synchronize ChromaDB after MySQL commit
    if decision == "approved":
        index_product(p)
    else:
        remove_product(p.id)

    return get(db, admin, pid)
