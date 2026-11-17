import logging

from fastapi import APIRouter, HTTPException

from app.core.dependencies import CurrentUser
from app.db.session import Db

from app.services.email_classification_service import (
    classify_email,
    get_classification
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/gmail/classification",
    tags=["Email Classification"]
)


@router.post(
    "/{message_id}"
)
def classify(
    message_id: int,
    user: CurrentUser,
    db: Db,
    force: bool = False
):
    try:
        return classify_email(
            db,
            message_id,
            force=force
        )

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "Email classification failed for message %s",
            message_id
        )

        raise HTTPException(
            status_code=502,
            detail="Email classification failed"
        )


@router.get(
    "/{message_id}"
)
def get_result(
    message_id: int,
    user: CurrentUser,
    db: Db
):
    return get_classification(
        db,
        message_id
    )
