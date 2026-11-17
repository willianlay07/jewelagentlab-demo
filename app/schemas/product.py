from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

class ProductCreate(BaseModel):
    code: str = Field(
        min_length=1,
        max_length=80
    )
    name: str = Field(
        min_length=1,
        max_length=255
    )
    category: str
    silver_price: Decimal | None = Field(
        default=None,
        ge=0
    )
    gold_price: Decimal | None = Field(
        default=None,
        ge=0
    )
    description: str | None = None
    attributes: dict = Field(
        default_factory=dict
    )

class ProductUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    silver_price: Decimal | None = Field(
        default=None,
        ge=0
    )
    gold_price: Decimal | None = Field(
        default=None,
        ge=0
    )
    description: str | None = None
    attributes: dict | None = None

class ImageOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )
    id: int
    image_path: str
    sort_order:int

class ProductOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )
    id: int
    code: str
    name: str
    category: str
    silver_price: Decimal | None
    gold_price: Decimal | None
    description: str | None
    attributes: dict
    status: str
    created_by: int
    reviewed_by: int | None
    rejection_reason: str|None
    images: list[ImageOut] = Field(
        default_factory=list
    )

class RejectRequest(BaseModel):
    reason:str  = Field(
        min_length=1,
        max_length=2000
    )
