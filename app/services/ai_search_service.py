from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.tools.price_filters import matches_price

from app.models.product import Product
from app.tools.product_search import search_structured
from app.rag.vector_store import search as vector_search


def matches_filters(product, filters):
    attrs = product.attributes or {}

    # Category
    if filters.get("category"):
        if product.category.lower() != filters["category"].lower():
            return False

    if not matches_price(product, filters):
        return False

    # Exact jewellery attributes
    for key in (
        "main_stone_shape",
        "prong_count",
        "band_style"
    ):
        expected = filters.get(key)

        if expected is None:
            continue

        actual = attrs.get(key)

        if actual is None:
            return False

        if str(actual).strip().lower() != str(expected).strip().lower():
            return False

    return True


def find_named_products(db, question: str) -> list[Product]:
    """
    Find approved products explicitly mentioned by
    their full name or product code in a question.
    """
    import re

    if not question or not question.strip():
        return []

    approved = db.scalars(
        select(Product).where(Product.status == "approved")
    ).all()

    question_normalized = re.sub(
        r"\s+", " ", question.casefold()
    ).strip()

    matches = []

    for product in approved:
        name = re.sub(
            r"\s+", " ", product.name.casefold()
        ).strip()

        code = product.code.strip()

        name_matched = (
            bool(name) and name in question_normalized
        )

        code_matched = bool(
            code and re.search(
                rf"(?<!\w){re.escape(code)}(?!\w)",
                question,
                re.IGNORECASE
            )
        )

        if name_matched or code_matched:
            matches.append(product)

    return matches


def retrieve_products(db, filters: dict, semantic_query: str, limit: int = 5) -> list[dict]:
    # Existing structured search returns SQLAlchemy Product objects.
    structured = search_structured(db, filters, limit=1000) if filters else []
    structured_ids = [p.id for p in structured]
    semantic_ids = vector_search(semantic_query, limit=1000) if semantic_query else []

    if semantic_query and filters:
        # MySQL determines which products match the filters.
        allowed = set(structured_ids)

        # Rank matching products using ChromaDB.
        ranked_ids = [
            pid for pid in semantic_ids
            if pid in allowed
        ]

        # Include matching products that ChromaDB missed.
        ids = ranked_ids + [
            pid for pid in structured_ids
            if pid not in ranked_ids
        ]
    elif semantic_query:
        ids = semantic_ids
    elif filters:
        ids = structured_ids
    else:
        ids = []

    ids = list(dict.fromkeys(ids))
    if not ids:
        return []

    # MySQL remains the source of truth: never expose unapproved products.
    products = db.scalars(
        select(Product).options(selectinload(Product.images)).where(
            Product.id.in_(ids), Product.status == "approved"
        )
    ).all()

    products = [
        p for p in products
        if matches_filters(p, filters)
    ]

    by_id = {p.id: p for p in products}
    result = []
    for pid in ids:
        p = by_id.get(pid)
        if p is None:
            continue
        result.append({
            "id": p.id, "code": p.code, "name": p.name,
            "category": p.category,
            "silver_price": p.silver_price, "gold_price": p.gold_price,
            "description": p.description, "attributes": p.attributes or {},
            "images": [
                {"id": im.id, "image_path": im.image_path, "sort_order": im.sort_order}
                for im in p.images
            ],
        })
    return result[:limit]


def execute(db, state: dict) -> dict:
    # Backward-compatible helper for older code that imports execute().
    products = state.get("products")
    if products is None:
        products = retrieve_products(
            db, state.get("filters", {}), state.get("semantic_query", ""),
            state.get("limit", 5)
        )
    return {
        "answer": state.get("answer") or (
            f"Found {len(products)} matching approved product(s)." if products
            else "No matching approved products found. Try different filters."
        ),
        "products": products,
        "search_method": state.get("search_method", "structured"),
        "model_used": state.get("model_used"),
    }
