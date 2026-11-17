from app.rag.vector_store import remove_product
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.product import Product, ApprovalLog


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

    if user.role != "admin" and p.created_by != user.id:
        raise HTTPException(
            403,
            "Not your product"
        )

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

    p = Product(
        **data.model_dump(),
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

    # Update only submitted fields
    for k, v in value.items():
        setattr(p, k, v)

    was_approved = p.status == "approved"

    if value:
        if was_approved:
            p.status = "pending"

        p.reviewed_by = None
        p.reviewed_at = None

    db.commit()

    if was_approved and value:
        remove_product(p.id)

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