import logging

logger = logging.getLogger(__name__)

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from app.core.dependencies import Admin
from app.db.session import Db, SessionLocal
from app.models.gmail_connection import GmailConnection
from app.models.user import User
from app.services.gmail_oauth_service import authorize_url, verify_state, exchange_code


router = APIRouter(prefix="/gmail", tags=["Gmail"])


@router.get("/oauth/connect")
def connect(admin: Admin):
    """Call with admin Bearer token; open returned authorization_url in browser."""
    return {"authorization_url": authorize_url(admin.id)}


@router.get("/oauth/callback")
def callback(state: str, code: str | None = None, error: str | None = None):
    if error:
        raise HTTPException(400, f"Google authorization failed: {error}")
    if not code:
        raise HTTPException(400, "Missing authorization code")
    try:
        payload = verify_state(state)
    except Exception:
        logger.exception("Gmail OAuth callback failed")

        raise HTTPException(
            status_code=400,
            detail="Gmail connection failed; check server logs"
        )
    with SessionLocal() as db:
        admin = db.get(User, payload.get("admin_id"))
        if not admin or not admin.is_active or admin.role != "admin":
            raise HTTPException(403, "Admin no longer authorized")
    try:
        email, encrypted_token = exchange_code(code, state)

    except Exception as exc:
        logger.exception("Gmail token exchange failed")

        raise HTTPException(
            status_code=400,
            detail="Gmail connection failed; check server logs"
        ) from exc
    with SessionLocal() as db:
        connection = db.get(GmailConnection, 1)
        if connection is None:
            connection = GmailConnection(id=1, email=email, encrypted_refresh_token=encrypted_token)
            db.add(connection)
        else:
            connection.email = email
            connection.encrypted_refresh_token = encrypted_token
        db.commit()
    return {"connected": True, "email": email, "message": "Gmail connected. You can close this page."}


@router.get("/status")
def status(admin: Admin, db: Db):
    connection = db.get(GmailConnection, 1)
    return {"connected": connection is not None, "email": connection.email if connection else None}
