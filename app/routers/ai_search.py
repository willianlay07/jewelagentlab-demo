import logging
from fastapi import APIRouter, Request, HTTPException

from app.core.dependencies import CurrentUser
from app.db.session import Db
from app.schemas.ai_search import SearchRequest, SearchResponse
from app.services.ai_search_service import execute

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai-search", tags=["AI Search"])


@router.post("", response_model=SearchResponse)
def ai_search(data: SearchRequest, request: Request, db: Db, user: CurrentUser):
    try:
        graph = request.app.state.ai_graph
        state = graph.invoke(
            {"question": data.question, "limit": data.limit},
            config={"configurable": {"db": db}},
        )
        return execute(db, state)
    except Exception as exc:
        logger.exception("AI search failed")
        raise HTTPException(
            status_code=503, detail="AI search temporarily unavailable"
        ) from exc
