from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, ForeignKey, Numeric, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )
    code: Mapped[str] = mapped_column(
        String(80),
        unique=True
    )
    name: Mapped[str] = mapped_column(
        String(255)
    )
    category: Mapped[str] = mapped_column(
        String(50)
    )
    silver_price: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )
    gold_price: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    attributes: Mapped[dict] = mapped_column(
        JSON,
        default=dict
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        index=True
    )
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )
    reviewed_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        nullable=True
    )
    rejection_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    images: Mapped[list["ProductImage"]] = relationship(
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order"
    )


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id")
    )
    image_path: Mapped[str] = mapped_column(
        String(500)
    )
    sort_order: Mapped[int] = mapped_column(
        default=0
    )


class ApprovalLog(Base):
    __tablename__ = "product_approval_logs"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id")
    )
    reviewer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )
    decision: Mapped[str] = mapped_column(
        String(20)
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=True
    )
