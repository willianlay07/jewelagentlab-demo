import os
from cryptography.fernet import Fernet
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from app.core.google_config import SCOPES, google_settings


def state_signer():
    from app.core.config import settings
    return URLSafeTimedSerializer(settings.jwt_secret, salt="gmail-oauth-state")


def new_flow(state=None):
    flow = Flow.from_client_config(
        google_settings(),
        scopes=SCOPES,
        state=state,
        autogenerate_code_verifier=False
    )

    flow.redirect_uri = os.environ["GOOGLE_REDIRECT_URI"]

    return flow


def authorize_url(admin_id: int):
    state = state_signer().dumps({"admin_id": admin_id})
    flow = new_flow(state=state)
    url, _ = flow.authorization_url(access_type="offline", prompt="consent", include_granted_scopes="false")
    return url


def verify_state(state: str):
    return state_signer().loads(state, max_age=600)


def exchange_code(code: str, state: str):
    flow = new_flow(state=state)
    flow.fetch_token(code=code)
    credentials = flow.credentials
    if not credentials.refresh_token:
        raise ValueError("Google did not provide a refresh token. Reconnect with consent.")
    service = build("gmail", "v1", credentials=credentials, cache_discovery=False)
    email = service.users().getProfile(userId="me").execute()["emailAddress"]
    return email, encrypt_token(credentials.refresh_token)


def encrypt_token(token: str):
    return Fernet(os.environ["GMAIL_TOKEN_ENCRYPTION_KEY"].encode()).encrypt(token.encode()).decode()
