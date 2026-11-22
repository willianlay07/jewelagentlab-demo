from typing import Annotated
from fastapi import APIRouter, File, UploadFile, HTTPException

from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.db.session import Db
from app.core.dependencies import CurrentUser
from app.models.product import Product

from app.schemas.product import ProductCreate, ProductUpdate, ProductOut
from app.services import (
    product_service as ps,
    image_service,vision_service
)

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)

@router.post(
    "/",
    response_model=ProductOut,
    status_code=201
)
def create(
    data: ProductCreate,
    db: Db,
    user: CurrentUser
):
    return ps.create(
        db,
        user,
        data
    )

@router.get(
    "/",
    response_model=list[ProductOut]
)
def listing(
    db: Db,
    user: CurrentUser
):
    stmt = (
        select(Product)
        .options(selectinload(Product.images))
        .order_by(Product.id.desc())
    )

    if user.role != "admin":
        stmt = stmt.where(
            or_(
                Product.status == "approved",
                Product.created_by == user.id
            )
        )

    return db.scalars(stmt).all()

@router.get(
    "/{pid}",
    response_model=ProductOut
)
def detail(
    pid: int,
    db: Db,
    user: CurrentUser
):
    return ps.get(
        db,
        user,
        pid
    )

@router.patch(
    "/{pid}",
    response_model=ProductOut
)
def edit(
    pid: int,
    data: ProductUpdate,
    db: Db,
    user: CurrentUser
):
    return ps.update(
        db,
        user,
        pid,
        data
    )

@router.post(
    "/{pid}/images",
    response_model=ProductOut
)
async def images(
    pid: int,
    db: Db,
    user: CurrentUser,
    files: Annotated[
        list[UploadFile],
        File()
    ]
): 
    return await image_service.upload(
        db,
        user,
        pid,
        files
    )

@router.post(
    "/{pid}/analyze"
)
def analyze(
    pid: int,
    db: Db,
    user: CurrentUser
):
    p = ps.get(
        db,
        user,
        pid
    )

    if user.role != "admin" and p.created_by != user.id:
        raise HTTPException(
            403,
            "You cannot analyze another user's product"
        )

    if user.role!="admin" and p.status not in ("draft","rejected"): 
        raise HTTPException(
            409,
            "Cannot analyze submitted product"
        )
    
    if not p.images: 
        raise HTTPException(
            422,
            "Upload image first"
        )
    
    return {
        "suggestions": vision_service.analyze(p.images[0].image_path),
        "requires_staff_review": True
    }

@router.post(
    "/{pid}/submit",
    response_model=ProductOut
)
def submit(
    pid: int,
    db: Db,
    user: CurrentUser
):
    return ps.submit(
        db,
        user,
        pid
    )