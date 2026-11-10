"""Ro'yxatdan o'tish, kirish va hisob xavfsizligi.

- Parollar faqat bcrypt xeshi ko'rinishida saqlanadi (asl parolni hech kim ko'ra olmaydi).
- Parolni terib topishga qarshi: bitta raqamga 15 daqiqada 5 ta, bitta IP'ga 20 ta xato urinish.
- Parol o'zgarsa yoki "barcha qurilmalardan chiqish" bosilsa, eski tokenlar darhol yaroqsiz bo'ladi.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..i18n import http_error
from ..logic import summaries
from ..models import Debtor, LoginAttempt, User
from ..schemas import LoginIn, PasswordChangeIn, PasswordConfirmIn, ProfileIn, RegisterIn, TokenOut, UserOut
from ..security import create_token, get_current_user, hash_password, password_ok, verify_password
from ..seed import reset_demo_if_due

router = APIRouter(prefix="/auth", tags=["Auth"])

WINDOW = timedelta(minutes=15)
MAX_PER_PHONE = 5
MAX_PER_IP = 20


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")
    return (ip or "unknown")[:64]


def is_demo(user: User) -> bool:
    return user.phone == settings.demo_phone


def token_out(user: User) -> TokenOut:
    return TokenOut(access_token=create_token(user), user=UserOut.model_validate(user))


def check_rate_limit(db: Session, phone: str, ip: str) -> None:
    since = datetime.now(timezone.utc) - WINDOW
    failed = (LoginAttempt.success.is_(False)) & (LoginAttempt.at >= since)
    by_phone = db.scalar(select(func.count()).where(failed, LoginAttempt.phone == phone)) or 0
    by_ip = db.scalar(select(func.count()).where(failed, LoginAttempt.ip == ip)) or 0
    if by_phone >= MAX_PER_PHONE or by_ip >= MAX_PER_IP:
        cond = (LoginAttempt.phone == phone) if by_phone >= MAX_PER_PHONE else (LoginAttempt.ip == ip)
        first = db.scalar(select(func.min(LoginAttempt.at)).where(failed, cond))
        wait = WINDOW - (datetime.now(timezone.utc) - first) if first else WINDOW
        raise http_error(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_attempts", m=max(1, int(wait.total_seconds() // 60) + 1))


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if not password_ok(data.password):
        raise http_error(422, "weak_password")
    if db.scalar(select(User).where(User.phone == data.phone)):
        raise http_error(status.HTTP_409_CONFLICT, "phone_taken")
    user = User(name=data.name.strip(), phone=data.phone, shop_name=data.shop_name.strip(),
                password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    return token_out(user)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    check_rate_limit(db, data.phone, ip)
    user = db.scalar(select(User).where(User.phone == data.phone))
    ok = bool(user) and verify_password(data.password, user.password_hash)
    db.add(LoginAttempt(phone=data.phone, ip=ip, success=ok))
    db.execute(delete(LoginAttempt).where(LoginAttempt.at < datetime.now(timezone.utc) - timedelta(days=2)))
    if ok:
        db.execute(delete(LoginAttempt).where(LoginAttempt.phone == data.phone, LoginAttempt.success.is_(False)))
    db.commit()
    if not ok:
        raise http_error(status.HTTP_401_UNAUTHORIZED, "bad_credentials")
    reset_demo_if_due(db, user)
    db.refresh(user)
    return token_out(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(data: ProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if is_demo(user):
        raise http_error(status.HTTP_403_FORBIDDEN, "demo_forbidden")
    user.name, user.shop_name = data.name.strip(), data.shop_name.strip()
    db.commit()
    return user


@router.post("/password", response_model=TokenOut)
def change_password(data: PasswordChangeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if is_demo(user):
        raise http_error(status.HTTP_403_FORBIDDEN, "demo_forbidden")
    if not verify_password(data.current_password, user.password_hash):
        raise http_error(status.HTTP_400_BAD_REQUEST, "wrong_password")
    if not password_ok(data.new_password):
        raise http_error(422, "weak_password")
    if data.current_password == data.new_password:
        raise http_error(status.HTTP_400_BAD_REQUEST, "same_password")
    user.password_hash = hash_password(data.new_password)
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    return token_out(user)


@router.post("/logout-all", response_model=TokenOut)
def logout_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if is_demo(user):
        raise http_error(status.HTTP_403_FORBIDDEN, "demo_forbidden")
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    return token_out(user)


@router.get("/export")
def export_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Barcha varaqlar va yozuvlarning zaxira nusxasi (JSON fayl; rasmlarsiz)."""
    debtors = list(db.scalars(select(Debtor).where(Debtor.user_id == user.id).order_by(Debtor.number)))
    sums = {s.id: s for s in summaries(db, debtors)}
    out = {
        "app": "Qarzingniber", "version": 1, "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {"name": user.name, "phone": user.phone, "shop_name": user.shop_name},
        "sheets": [{
            "number": d.number, "name": d.name, "phone": d.phone, "note": d.note,
            "direction": d.direction, "balance": sums[d.id].balance,
            "entries": [{"kind": e.kind.value, "amount": e.amount, "date": e.happened_at.isoformat(),
                         "due_date": e.due_date.isoformat() if e.due_date else None, "note": e.note,
                         "photos": len(e.photos)} for e in d.entries],
        } for d in debtors],
    }
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return JSONResponse(out, headers={"Content-Disposition": f'attachment; filename="qarzingniber-zaxira-{stamp}.json"'})


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(data: PasswordConfirmIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if is_demo(user):
        raise http_error(status.HTTP_403_FORBIDDEN, "demo_forbidden")
    if not verify_password(data.password, user.password_hash):
        raise http_error(status.HTTP_400_BAD_REQUEST, "wrong_password")
    db.delete(user)
    db.commit()
