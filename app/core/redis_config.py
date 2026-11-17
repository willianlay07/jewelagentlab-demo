import os
from functools import lru_cache

from dotenv import load_dotenv
from redis import Redis
from rq import Queue

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
INDEXING_QUEUE_NAME = "product_indexing"

@lru_cache(maxsize=1)
def get_redis() -> Redis:
    return Redis.from_url(REDIS_URL)

def get_indexing_queue() -> Queue:
    return Queue(
        INDEXING_QUEUE_NAME,
        connection=get_redis()
    )