from fastapi import HTTPException

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import StaffCreate, StaffUpdate
from app.core.security import hash_password

def find_staff(
    db: Session,
    staff_id: int
) -> User:

    staff = db.get(User, staff_id)

    if not staff or staff.role != "staff":
        raise HTTPException(
            status_code=404, 
            detail="Staff not found"
        )
    
    return staff

def create_staff(
    db: Session,
    data: StaffCreate
) -> User:

    email = str(data.email).lower()

    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(
            status_code=409, 
            detail="Email exists"
        )

    staff = User(
        email=email, 
        full_name=data.full_name, 
        password_hash=hash_password(data.password), 
        role="staff"
    )

    db.add(staff)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, 
            detail="Email exists"
        )

    db.refresh(staff)
    return staff

def list_staff(
    db: Session, 
    limit: int, 
    offset: int
):
    return db.scalars(select(User).where(User.role == "staff").order_by(User.id).limit(limit).offset(offset)).all()


def update_staff(
    db: Session,
    staff_id: int,
    data: StaffUpdate
) -> User:

    staff = find_staff(
        db,
        staff_id
    )

    for key, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(staff, key, value)

    db.commit()
    db.refresh(staff)
    return staff

def reset_staff_password(
    db: Session, 
    staff_id: int, 
    password: str
) -> None:
    staff = find_staff(db, staff_id)
    staff.password_hash = hash_password(password)

    db.commit()