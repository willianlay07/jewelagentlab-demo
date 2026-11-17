from datetime import datetime, timezone, timedelta

import jwt
from pwdlib import PasswordHash
from app.core.config import settings

hasher = PasswordHash.recommended()

def hash_password(
    password: str
) -> str:
    return hasher.hash(
        password
    )

def verify_password(
    password: str,
    hashed: str
) -> bool:

    return hasher.verify(
        password,
        hashed
    )

def create_access_token(
    user_id: int
) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm="HS256"
    )

def decode_access_token(
    token: str
) -> int:
   
    payload = jwt.decode(
        token, 
        settings.jwt_secret, 
        algorithms=["HS256"], 
        options={
            "require": ["sub", "exp"]
        }
    )

    return int(payload["sub"])