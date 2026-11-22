from datetime import date
from typing import Any, TypedDict


class KnowledgeState(
    TypedDict, 
    total=False
):
    intent: str
    question: str
    mode: str
    as_of_date: date | None
    limit: int

    db: Any
    user: Any

    sources: list[dict]
    answer: str
    model_used: str | None

    citation_verified: bool
    citations: list[dict]