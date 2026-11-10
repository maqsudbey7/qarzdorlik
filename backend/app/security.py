from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .i18n import http_error
from .models import User

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def password_ok(p: str) -> bool:
    """Kamida 8 belgi, harf ham, raqam ham bo'lsin."""
    return len(p) >= 8 and any(c.isalpha() for c in p) and any(c.isdigit() for c in p)


def create_token(user: User) -> str:
    payload = {"sub": str(user.id), "app": "qarz", "ver": user.token_version or 0,
               "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if creds is None:
        raise http_error(status.HTTP_401_UNAUTHORIZED, "login_required")
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])
        user = db.get(User, int(payload["sub"])) if payload.get("app") == "qarz" else None
        if user is not None and payload.get("ver", 0) != (user.token_version or 0):
            user = None   # parol almashgan yoki "hamma qurilmadan chiqish" bosilgan
    except (jwt.PyJWTError, KeyError, ValueError):
        user = None
    if user is None:
        raise http_error(status.HTTP_401_UNAUTHORIZED, "session_expired")
    return user
