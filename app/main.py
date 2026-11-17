from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    admin,
    products,
    approvals,
    ai_search,
    gmail,
    gmail_inbox,
    email_classification,
    email_drafts,
    gmail_attachments
)

from app.agents.graph import build_graph

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ai_graph = build_graph()
    yield


app = FastAPI(
    title="ORRO Jewellery AI Sales Assistant",
    lifespan=lifespan
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "http://127.0.0.1:8081"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Product Images Configuration
IMAGE_DIR = Path("data/product_images")

IMAGE_DIR.mkdir(
    parents=True,
    exist_ok=True
)

app.mount(
    "/data/product_images",
    StaticFiles(directory=str(IMAGE_DIR)),
    name="product_images"
)


# API Routers
for router in (
    auth.router,
    admin.router,
    products.router,
    approvals.router,
    ai_search.router,
    gmail.router,
    gmail_inbox.router,
    email_classification.router,
    email_drafts.router,
    gmail_attachments.router
):
    app.include_router(router)


# Health Check
@app.get("/health")
def health():
    return {
        "status": "ok"
    }
