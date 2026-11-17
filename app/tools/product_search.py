from sqlalchemy import select
from app.models.product import Product
from app.tools.price_filters import sql_price_filter

ALLOWED = {
    "category",
    "min_price",
    "max_price",
    "main_stone_shape",
    "prong_count",
    "band_style",
    "metal", "price_type"
}

def search_structured(
    db,
    filters: dict,
    limit: int = 20
) -> list[int]:

    stmt = select(Product).where(Product.status == "approved")

    if filters.get("category"):
        stmt = stmt.where(Product.category == filters["category"])

    price_clause = sql_price_filter(filters)
    if price_clause is not None:
        stmt = stmt.where(price_clause)

    for key in ("main_stone_shape", "prong_count", "band_style"):
        if filters.get(key) is not None:
            stmt = stmt.where(
                Product.attributes[key].as_string() == str(filters[key])
            )

    return list(
        db.scalars(
            stmt.order_by(Product.id.desc()).limit(limit)
        ).unique().all()
    )