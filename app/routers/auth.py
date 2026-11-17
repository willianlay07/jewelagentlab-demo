from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.db.session import Db

from app.core.dependencies import CurrentUser

from app.schemas.auth import TokenOut
from app.schemas.user import UserOut
from app.services.auth_service import login_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post(
    "/login",
    response_model=TokenOut
)
def login(
    form: Annotated[
        OAuth2PasswordRequestForm,
        Depends()
    ],
    db: Db
):
    return TokenOut(
        access_token=login_user(
            db,
            form.username,
            form.password
        )
    )

@router.get(
    "/me",
    response_model=UserOut
)
def me(
    user: CurrentUser
):
    return user