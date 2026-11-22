from datetime import date

from app.services.knowledge_hybrid_service import hybrid_search


def version_aware_search(
    db,
    query: str,
    user,
    mode: str = "current",
    as_of_date: date | None = None,
    limit: int = 5,
) -> list[dict]:

    if mode not in ("current", "historical", "compare"):
        raise ValueError("Invalid search mode")

    if mode == "historical" and as_of_date is None:
        raise ValueError(
            "as_of_date is required for historical search"
        )

    results = hybrid_search(
        db=db,
        query=query,
        user=user,
        limit=max(limit * 5, 20),
        include_historical=(mode != "current"),
    )

    if mode == "current":
        return [
            item for item in results
            if item["status"] == "current"
            and (
                item["effective_from"] is None
                or date.fromisoformat(item["effective_from"]) <= date.today()
            )
        ][:limit]

    if mode == "historical":
        return [
            item for item in results
            if (
                item["effective_from"] is None
                or date.fromisoformat(item["effective_from"]) <= as_of_date
            )
            and (
                item["effective_to"] is None
                or date.fromisoformat(item["effective_to"]) >= as_of_date
            )
        ][:limit]

    # Compare current and superseded versions.
    return [
        item for item in results
        if item["status"] in ("current", "superseded")
    ][:limit]