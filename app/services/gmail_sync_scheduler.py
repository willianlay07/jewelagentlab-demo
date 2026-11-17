import logging
import os
import time

from redis import Redis
from rq import Queue
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://localhost:6379/0"
)

QUEUE_NAME = "gmail_sync"
INTERVAL_SECONDS = 300
JOB_ID = "gmail-periodic-sync"

COOLDOWN_KEY = "gmail:sync:rate_limit_until"

def get_queue():
    redis = Redis.from_url(REDIS_URL)

    return Queue(
        QUEUE_NAME,
        connection=redis
    )


def schedule_once():
    queue = get_queue()

    # Respect Gmail API rate-limit cooldown.
    cooldown_until = queue.connection.get(
        COOLDOWN_KEY
    )

    if cooldown_until:
        now = int(
            datetime.now(timezone.utc).timestamp()
        )

        remaining = int(cooldown_until) - now

        if remaining > 0:
            logger.warning(
                "Gmail sync paused by rate limit. "
                "Approximately %s seconds remaining.",
                remaining
            )
            return False

    # Avoid creating another job while one is queued or running.
    existing = queue.fetch_job(JOB_ID)

    if existing and existing.get_status(refresh=True) in (
        "queued",
        "started",
        "deferred",
        "scheduled"
    ):
        logger.info("Gmail sync already pending or running")
        return False

    # Remove an old completed/failed job before reusing the ID.
    if existing:
        existing.delete()

    queue.enqueue(
        "app.workers.gmail_sync_worker.process_gmail_sync",
        job_id=JOB_ID,
        job_timeout=180,
        result_ttl=30,
        failure_ttl=3600
    )

    logger.info("Gmail sync job queued")

    return True


def main():
    logging.basicConfig(level=logging.INFO)

    logger.info(
        "Gmail sync scheduler started (every %s seconds)",
        INTERVAL_SECONDS
    )

    while True:
        try:
            schedule_once()

        except Exception:
            logger.exception("Failed to schedule Gmail sync")

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
