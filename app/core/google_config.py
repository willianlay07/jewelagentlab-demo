import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]

def google_settings():
    required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "GMAIL_TOKEN_ENCRYPTION_KEY"]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        raise RuntimeError("Missing Gmail environment settings: " + ", ".join(missing))
    Fernet(os.environ["GMAIL_TOKEN_ENCRYPTION_KEY"].encode())
    return {
        "web": {
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [os.environ["GOOGLE_REDIRECT_URI"]],
        }
    }