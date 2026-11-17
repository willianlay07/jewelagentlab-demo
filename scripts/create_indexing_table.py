
from app.db.base import Base
from app.db.session import engine

from app.models.indexing_job import IndexingJob


def create_table():
    Base.metadata.create_all(
        bind=engine,
        tables=[IndexingJob.__table__]
    )

    print("Indexing jobs table initialized successfully.")


if __name__ == "__main__":
    create_table()
