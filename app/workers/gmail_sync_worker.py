import logging

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.email_message import EmailMessage
from app.models.email_classification import EmailClassification

from app.services.gmail_sync_service import sync_inbox
from app.services.email_classification_service import classify_email

from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from googleapiclient.errors import HttpError
from rq import get_current_job

import os
import re
from redis import Redis

logger = logging.getLogger(__name__)

CLASSIFICATION_BATCH_SIZE = 20

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://localhost:6379/0"
)

COOLDOWN_KEY = "gmail:sync:rate_limit_until"
DEFAULT_COOLDOWN = 300

def classify_pending_emails():

    with SessionLocal() as db:
        # Find emails without classification records.
        message_ids = db.scalars(
            select(EmailMessage.id)
            .outerjoin(
                EmailClassification,
                EmailClassification.email_message_id == EmailMessage.id
            )
            .where(EmailClassification.id.is_(None))
            .order_by(EmailMessage.id)
            .limit(CLASSIFICATION_BATCH_SIZE)
        ).all()

    completed = 0
    failed = 0

    for message_id in message_ids:
        try:
            # Separate transaction for each email.
            with SessionLocal() as db:
                result = classify_email(
                    db,
                    message_id=message_id
                )

            logger.info(
                "Email %s classified: %s",
                message_id,
                result["category"]
            )

            completed += 1

        except Exception:
            failed += 1

            logger.exception(
                "Failed to classify email %s",
                message_id
            )

    return {
        "classified": completed,
        "failed": failed
    }



def handle_gmail_rate_limit(exc: HttpError):
    status = exc.resp.status

    if status not in (429, 403):
        return False

    content = (
        exc.content.decode("utf-8", errors="replace")
        if isinstance(exc.content, bytes)
        else str(exc.content)
    )

    if status == 403 and not any(
        reason in content
        for reason in (
            "rateLimitExceeded",
            "userRateLimitExceeded",
            "quotaExceeded"
        )
    ):
        return False

    delay = DEFAULT_COOLDOWN

    # Gmail may return Retry-After as seconds
    # or an HTTP date.
    retry_after = exc.resp.get("retry-after")

    if retry_after:
        try:
            delay = max(1, int(retry_after))
        except (ValueError, TypeError):
            try:
                retry_time = parsedate_to_datetime(
                    retry_after
                )

                if retry_time.tzinfo is None:
                    retry_time = retry_time.replace(
                        tzinfo=timezone.utc
                    )

                delay = max(
                    1,
                    int(
                        (
                            retry_time -
                            datetime.now(timezone.utc)
                        ).total_seconds()
                    )
                )
            except (ValueError, TypeError):
                pass

    # Gmail can also include a retry timestamp
    # in the error message.
    match = re.search(
        r"Retry after "
        r"(\d{4}-\d{2}-\d{2}T"
        r"\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)",
        content
    )

    if match:
        try:
            retry_time = datetime.fromisoformat(
                match.group(1).replace("Z", "+00:00")
            )

            delay = max(
                delay,
                int(
                    (
                        retry_time -
                        datetime.now(timezone.utc)
                    ).total_seconds()
                ) + 5
            )
        except ValueError:
            pass

    # Prevent unreasonably short cooldowns.
    delay = max(60, delay)

    redis = Redis.from_url(REDIS_URL)

    # Preserve an existing longer cooldown.
    # This prevents concurrent workers shortening it.
    until = int(
        datetime.now(timezone.utc).timestamp()
    ) + delay

    redis.eval(
        """
        local old = tonumber(redis.call('GET', KEYS[1]) or '0')
        local proposed = tonumber(ARGV[1])

        if proposed > old then
            redis.call('SET', KEYS[1], proposed, 'EX', ARGV[2])
        end

        return 1
        """,
        1,
        COOLDOWN_KEY,
        until,
        delay + 60
    )

    logger.warning(
        "Gmail rate limit reached. "
        "Automatic sync paused for approximately %s seconds.",
        delay
    )

    return True



def process_gmail_sync():
    logger.info("Starting automatic Gmail synchronization")

    # Step 1: Import Gmail messages.
    try:
        sync_result = sync_inbox(max_messages=50)

    except HttpError as exc:
        if handle_gmail_rate_limit(exc):
            return {
                "gmail_sync": {
                    "status": "rate_limited",
                    "message": "Gmail API rate limit reached"
                },
                "classification": {
                    "status": "skipped"
                }
            }

        raise

    logger.info(
        "Gmail synchronization completed: %s",
        sync_result
    )

    # Step 2: Classify emails that have no classification.
    classification_result = classify_pending_emails()

    logger.info(
        "Email classification completed: %s",
        classification_result
    )

    return {
        "gmail_sync": sync_result,
        "classification": classification_result
    }