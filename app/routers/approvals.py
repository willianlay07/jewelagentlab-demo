from fastapi import APIRouter

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import Db
from app.core.dependencies import Admin

from app.models.product import Product

from app.schemas.product import ProductOut,RejectRequest

from app.services.approval_service import review

router = APIRouter(
    prefix="/admin/approvals",
    tags=["Approvals"]
)

@router.get(
    "/pending",
    response_model=list[ProductOut]
)
def pending(
    db: Db,
    admin: Admin
):
    return db.scalars(
        select(Product).options(
            selectinload(Product.images)
        ).where(Product.status == "pending")
    ).all()

@router.post(
    "/{pid}/approve",
    response_model=ProductOut
)
def approve(
    pid: int,
    db: Db,
    admin: Admin
):
    return review(
        db,
        admin,
        pid,
        "approved"
    )

@router.post(
    "/{pid}/reject",
    response_model=ProductOut
)
def reject(
    pid: int,
    data: RejectRequest,
    db: Db,
    admin: Admin
): 
    return review(
        db,
        admin,
        pid,
        "rejected",
        data.reason
    )