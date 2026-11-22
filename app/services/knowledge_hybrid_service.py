from app.services.knowledge_retrieval_service import semantic_search
from app.services.knowledge_bm25_service import bm25_search, tokenize


# Common words that are not useful for relevance scoring.
STOP_WORDS = {
    "a", "an", "the", "is", "are", "was", "were",
    "what", "which", "who", "when", "where", "how",
    "do", "does", "did", "can", "could", "would",
    "of", "for", "to", "in", "on", "at", "by",
    "with", "and", "or", "from", "about", "me",
    "my", "our", "your", "this", "that", "it",
    "be", "been", "has", "have", "had",
}


def meaningful_tokens(text: str) -> set[str]:
    return {
        token
        for token in tokenize(text)
        if token not in STOP_WORDS and len(token) > 2
    }


def relevance_score(query: str, item: dict) -> float:
    """
    Simple lexical relevance score.

    Combines:
    - Document title matching
    - Content matching
    - Query keyword coverage
    """

    query_tokens = meaningful_tokens(query)

    if not query_tokens:
        return 0.0

    title_tokens = meaningful_tokens(
        item.get("document_title", "")
    )

    content_tokens = meaningful_tokens(
        item.get("content", "")
    )

    title_matches = query_tokens & title_tokens
    content_matches = query_tokens & content_tokens

    coverage = len(
        title_matches | content_matches
    ) / len(query_tokens)

    title_bonus = (
        len(title_matches) / len(query_tokens)
    ) * 0.5

    return coverage + title_bonus


def hybrid_search(
    db,
    query: str,
    user,
    limit: int = 5,
    include_historical: bool = False,
) -> list[dict]:

    if not query.strip() or limit <= 0:
        return []

    candidate_limit = max(limit * 5, 20)

    semantic_results = semantic_search(
        db=db,
        query=query,
        user=user,
        limit=candidate_limit,
        include_historical=include_historical,
    )

    bm25_results = bm25_search(
        db=db,
        query=query,
        user=user,
        limit=candidate_limit,
        include_historical=include_historical,
    )

    # Remove baseline-only BM25Plus matches.
    query_tokens = meaningful_tokens(query)

    bm25_results = [
        item for item in bm25_results
        if query_tokens.intersection(
            meaningful_tokens(item["content"])
            | meaningful_tokens(
                item.get("document_title", "")
            )
        )
    ]

    # Reciprocal Rank Fusion.
    k = 60
    scores = {}
    by_chunk_id = {}

    for results in (semantic_results, bm25_results):
        for rank, item in enumerate(results, start=1):
            chunk_id = item["chunk_id"]

            scores[chunk_id] = (
                scores.get(chunk_id, 0.0)
                + 1.0 / (k + rank)
            )

            by_chunk_id[chunk_id] = item

    # Apply lexical relevance filtering.
    ranked = []

    for chunk_id, item in by_chunk_id.items():
        relevance = relevance_score(query, item)

        # Require at least one meaningful query keyword match.
        if relevance <= 0:
            continue

        ranked.append({
            **item,
            "rrf_score": round(scores[chunk_id], 6),
            "relevance_score": round(relevance, 4),
            "search_method": "hybrid",
        })

    # Rank by keyword relevance first, RRF second.
    ranked.sort(
        key=lambda item: (
            item["relevance_score"],
            item["rrf_score"],
        ),
        reverse=True,
    )

    return ranked[:limit]
