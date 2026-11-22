from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator

class KnowledgeSearchRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=2000
    )

    mode: Literal[
        "current", 
        "historical", 
        "compare"
    ] = "current"

    as_of_date: date | None = None

    limit: int = Field(
        default=5, 
        ge=1, 
        le=10
    )

    @model_validator(
        mode="after"
    )
    def validate_historical_date(self):
        if self.mode == "historical" and self.as_of_date is None:
            raise ValueError(
                "as_of_date is required for historical search"
            )
        return self