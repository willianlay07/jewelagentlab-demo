from pydantic import BaseModel, Field
from decimal import Decimal

class SearchRequest(BaseModel):
    question: str = Field(
        min_length=2,
        max_length=1000
    )
    limit: int = Field(
        default = 5, 
        ge = 1, 
        le = 20
    )

class SearchImage(BaseModel):
    id: int
    image_path: str
    sort_order: int

class SearchProduct(BaseModel):
    id: int
    code: str
    name: str
    category: str
    silver_price: Decimal | None
    gold_price: Decimal | None
    description: str | None
    attributes: dict

    images: list[SearchImage] = Field(
        default_factory=list
    )

class SearchResponse(BaseModel):
    answer: str
    products: list[SearchProduct]
    search_method: str
    model_used: str | None