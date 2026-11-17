from decimal import Decimal
from sqlalchemy import and_, or_
from app.models.product import Product


def price_type(filters):
    metal = str(filters.get("price_type") or filters.get("metal") or "").lower()
    if metal == "silver":
        return "silver"
    if metal in ("gold", "white gold", "yellow gold", "rose gold"):
        return "gold"
    return None


def sql_price_filter(filters):
    minimum = filters.get("min_price")
    maximum = filters.get("max_price")
    if minimum is None and maximum is None:
        return None
    conditions = []
    for col in (Product.silver_price, Product.gold_price):
        part = [col.is_not(None)]
        if minimum is not None:
            part.append(col >= Decimal(str(minimum)))
        if maximum is not None:
            part.append(col <= Decimal(str(maximum)))
        conditions.append(and_(*part))
    kind = price_type(filters)
    return conditions[0] if kind == "silver" else conditions[1] if kind == "gold" else or_(*conditions)


def matches_price(product, filters):
    minimum = filters.get("min_price")
    maximum = filters.get("max_price")
    if minimum is None and maximum is None:
        return True
    kind = price_type(filters)
    values = ([product.silver_price] if kind == "silver" else
              [product.gold_price] if kind == "gold" else
              [product.silver_price, product.gold_price])
    return any(v is not None and
               (minimum is None or v >= Decimal(str(minimum))) and
               (maximum is None or v <= Decimal(str(maximum))) for v in values)
