from typing import Annotated
import jwt

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from app.db.session import Db
from app.models.user import User
from app.core.security import decode_access_token

bearer = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)

def current_user(
    token: Annotated[
        str,
        Depends(bearer)
    ],
    db: Db
) -> User:
    try:
        user = db.get(User, decode_access_token(token))
    
    except (jwt.PyJWTError, ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=401, 
            detail="Invalid token"
        )
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=401, 
            detail="Invalid or disabled account"
        )

    return user

CurrentUser = Annotated[
    User,
    Depends(
        current_user
    )
]

def admin_only(
    user: CurrentUser
) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Admin only"
        )
    
    return user

Admin = Annotated[
    User,
    Depends(
        admin_only
    )
]