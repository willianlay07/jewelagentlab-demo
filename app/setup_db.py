from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password

from app.db.base import Base
from app.db.session import engine, SessionLocal

import app.models # Registers SQLAlchemy models before create_all
from app.models.user import User


def main():
    if len(settings.admin_password) < 8:
        raise RuntimeError("Admin password must have at least 12 characters")

    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        email = settings.admin_email.strip().lower()
        if db.scalar(select(User).where(User.email == email)):
            print("Admin email already exists; unchanged")
            return
        
        db.add(
            User(
                email=email, 
                full_name="ORRO Administrator", 
                password_hash=hash_password(settings.admin_password), 
                role="admin"
            )
        )
        db.commit()
        print("Initial Admin created")

if __name__ == "__main__":
    main()