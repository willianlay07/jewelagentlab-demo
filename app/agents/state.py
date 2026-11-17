from typing import TypedDict, Any

class SearchState(TypedDict, total=False):
    # Input
    question: str
    limit: int

    # Routing
    route: str
    model_used: str | None
    search_method: str

    # Parsed search constraints
    filters: dict[str, Any]
    semantic_query: str

    # Retrieval
    product_ids: list[int]
    products: list[dict[str, Any]]

    # Generation
    answer: str