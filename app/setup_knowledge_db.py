from app.db.base import Base
from app.db.session import engine

# Register the Knowledge Base models
from app.models.knowledge import (
    KnowledgeDocument,
    KnowledgeChunk,
)


def setup_knowledge_db():
    Base.metadata.create_all(
        bind=engine,
        tables=[
            KnowledgeDocument.__table__,
            KnowledgeChunk.__table__,
        ],
    )

    print("Knowledge Base tables created successfully!")


if __name__ == "__main__":
    setup_knowledge_db()