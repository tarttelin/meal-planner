import os
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from firebase_admin import auth, initialize_app

ALLOWED_DOMAIN = os.environ.get("ALLOWED_DOMAIN", "")
API_KEY = os.environ.get("API_KEY", "")
_initialized = False


def _init_firebase():
    global _initialized
    if not _initialized:
        try:
            initialize_app()
        except ValueError:
            pass
        _initialized = True


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not ALLOWED_DOMAIN:
            return await call_next(request)

        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if not path.startswith("/api/"):
            return await call_next(request)

        # API key auth (for Claude Code / scripts)
        if API_KEY and request.headers.get("x-api-key") == API_KEY:
            request.state.user_email = "api-key"
            return await call_next(request)

        # Firebase token auth (for browser users)
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing auth token")

        token = auth_header[7:]
        _init_firebase()
        try:
            decoded = auth.verify_id_token(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid auth token")

        email = decoded.get("email", "")
        if not email.endswith(f"@{ALLOWED_DOMAIN}"):
            raise HTTPException(status_code=403, detail="Access denied")

        request.state.user_email = email
        return await call_next(request)
