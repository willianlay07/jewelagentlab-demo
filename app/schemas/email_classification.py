from typing import Literal
from pydantic import BaseModel, Field

class EmailClassificationResult(BaseModel):
    category: Literal[
        "product_enquiry",
        "order_enquiry",
        "customer_support",
        "general"
    ]

    confidence: float = Field(
        ge=0,
        le=1
    )

    summary: str = Field(
        max_length=500
    )

    requires_review: bool = False

    product_category: str | None = None
    metal: Literal["silver", "gold"] | None = None
    max_price: float | None = None
    order_number: str | None = None