from sqlalchemy import select
from app.db.session import SessionLocal

from app.models.product import Product
from app.rag.vector_store import index_product, collection

def main():
    with SessionLocal() as db:
        products = db.scalars(
            select(Product).where(Product.status == "approved")
        ).all()

        approved_ids = {
            str(p.id)
            for p in products
        }

        c = collection()
        existing = c.get()["ids"]

        stale = [x for x in existing if x not in approved_ids]

        if stale: c.delete(
            ids=stale
        )

        for p in products:
            index_product(p)
            print("Indexed", p.id, p.code)

        print(f"Indexed {len(products)} approved products")

if __name__ == "__main__":
    main()