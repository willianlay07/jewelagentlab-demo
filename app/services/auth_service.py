from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import HTTPException

from app.models.user import User
from app.core.security import verify_password, create_access_token

def login_user(
    db: Session,
    email: str,
    password: str
) -> str:

    user = db.scalar(
        select(User).where(User.email == email.strip().lower())
    )

    if not user or not verify_password(password, user.password_hash) or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    return create_access_token(
        user.id
    )