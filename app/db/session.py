from typing import Annotated
from fastapi import Depends

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    bind=engine
)

def get_db():
    with SessionLocal() as db:
        yield db

Db = Annotated[
    Session,
    Depends(get_db)
]