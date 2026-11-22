from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.product import Product, ApprovalLog
from app.services.indexing_service import schedule_sync


def get(
    db,
    user,
    pid
):
    p = db.scalar(
        select(Product).options(
            selectinload(Product.images)
        ).where(Product.id == pid)
    )

    if not p:
        raise HTTPException(
            404,
            "Product not found"
        )

    if (
        user.role != "admin"
        and p.created_by != user.id
        and p.status != "approved"
    ):
        raise HTTPException(403, "Not allowed to view this product")

    return p

def create(
    db,
    user,
    data
):
    if db.scalar(
        select(Product.id).where(Product.code == data.code)
    ) is not None:
        raise HTTPException(
            409,
            "Duplicate product code"
        )

    if data.category not in ("ring","necklace","earrings","bracelet","bangle"):
        raise HTTPException(
            422,
            "Invalid category"
        )

    values = data.model_dump()
    if values.get("silver_price") is None and values.get("gold_price") is None:
        raise HTTPException(422, "Enter a silver or gold price")

    p = Product(
        **values,
        created_by=user.id,
        status="draft"
    )
    
    db.add(p)
    db.commit()

    return get(
        db,
        user,
        p.id
    )

def update(
    db, 
    user, 
    pid, 
    data
):
    p = get(db, user, pid)

    # Staff cannot edit products created by another user.
    if user.role != "admin" and p.created_by != user.id:
        raise HTTPException(
            403,
            "You cannot edit another user's product"
        )

    if user.role != "admin" and p.status not in ("draft", "rejected"):
        raise HTTPException(
            409,
            "Submitted product cannot be edited"
        )

    value = data.model_dump(
        exclude_unset=True
    )

    # Validate category only when provided
    if "category" in value:
        if value["category"] not in (
            "ring", "necklace", "earrings", "bracelet", "bangle"
        ):
            raise HTTPException(
                422,
                "Invalid category"
            )

    if "silver_price" in value or "gold_price" in value:
        silver = value.get("silver_price", p.silver_price)
        gold = value.get("gold_price", p.gold_price)
        if silver is None and gold is None:
            raise HTTPException(422, "At least one metal price is required")

    # Update only submitted fields
    for k, v in value.items():
        setattr(p, k, v)

    if value:
        if p.status == "approved":
            p.status = "pending"
            schedule_sync(db, pid)

        p.reviewed_by = None
        p.reviewed_at = None

    db.commit()
    return get(
        db,
        user,
        pid
    )



def submit(
    db,
    user,
    pid
):
    p = get(
        db,
        user,
        pid
    )

    if user.role != "admin" and p.created_by != user.id:
        raise HTTPException(403, "You cannot submit another user's product")

    if p.status not in ("draft","rejected"): 
        raise HTTPException(409,"Not a draft or rejected product")

    if not p.images: 
        raise HTTPException(422,"Upload an image first")

    p.status = "pending"

    p.rejection_reason=None

    db.commit()

    return get(
        db,
        user,
        pid
    )