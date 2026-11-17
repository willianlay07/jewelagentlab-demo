from datetime import datetime, timezone
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class GmailConnection(Base):
    __tablename__ = "gmail_connections"

    id: Mapped[int] = mapped_column(
        Integer, 
        primary_key=True
    )
    email: Mapped[str] = mapped_column(
        String(255), 
        nullable=False
    )
    encrypted_refresh_token: Mapped[str] = mapped_column(
        Text, 
        nullable=False
    )
    connected_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=utcnow, 
        nullable=False
    )