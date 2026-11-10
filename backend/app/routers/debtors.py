"""Qarzdorlar (varaqlar), yozuvlar va dalil rasmlari."""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..i18n import http_error
from ..logic import balance_of, summaries
from ..models import Debtor, Entry, EntryKind, Photo, User
from ..schemas import DebtorDetail, DebtorIn, DebtorSummary, EntryIn, EntryOut, PhotoOut
from ..security import get_current_user

router = APIRouter(tags=["Qarzdorlar"])

IMAGE_SIGNATURES = {
    "image/jpeg": lambda b: b[:3] == b"\xff\xd8\xff",
    "image/png": lambda b: b[:8] == b"\x89PNG\r\n\x1a\n",
    "image/webp": lambda b: b[:4] == b"RIFF" and b[8:12] == b"WEBP",
}


# ---------- Yordamchilar ----------
def own_debtor(db: Session, user: User, debtor_id: int, lock: bool = False) -> Debtor:
    q = select(Debtor).where(Debtor.id == debtor_id, Debtor.user_id == user.id)
    d = db.scalar(q.with_for_update() if lock else q)
    if d is None:
        raise http_error(status.HTTP_404_NOT_FOUND, "debtor_not_found")
    return d


def own_entry(db: Session, user: User, entry_id: int) -> Entry:
    e = db.get(Entry, entry_id)
    if e is None or e.user_id != user.id:
        raise http_error(status.HTTP_404_NOT_FOUND, "entry_not_found")
    return e


def detail(db: Session, d: Debtor) -> DebtorDetail:
    s = summaries(db, [d])[0]
    return DebtorDetail(**s.model_dump(), share_token=d.share_token,
                        entries=[EntryOut.model_validate(e) for e in d.entries])


def check_entry(data: EntryIn) -> datetime:
    when = data.happened_at or datetime.now(timezone.utc)
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    if when > datetime.now(timezone.utc) + timedelta(minutes=10):
        raise http_error(status.HTTP_400_BAD_REQUEST, "future_date")
    if data.due_date and data.kind != EntryKind.debt:
        raise http_error(status.HTTP_400_BAD_REQUEST, "due_only_debt")
    return when


def fmt(n: int) -> str:
    return f"{n:,}".replace(",", " ")


# ---------- Qarzdorlar ----------
@router.get("/debtors", response_model=list[DebtorSummary])
def list_debtors(
    q: str | None = Query(None, description="Ism, telefon yoki varaq raqami (#12)"),
    filter: str = Query("all", pattern="^(all|debt|clear|overdue)$"),
    sort: str = Query("recent", pattern="^(recent|balance|name|number)$"),
    direction: str | None = Query(None, pattern="^(owes_me|i_owe)$", description="owes_me — menga qarzdorlar, i_owe — men qarzdorman"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Debtor).where(Debtor.user_id == user.id)
    if direction:
        stmt = stmt.where(Debtor.direction == direction)
    if q and q.strip():
        term = q.strip()
        digits = "".join(ch for ch in term if ch.isdigit())
        if term.startswith("#") and term[1:].isdigit():
            # "#12" — faqat varaq raqami bo'yicha
            stmt = stmt.where(Debtor.number == int(term[1:]))
        else:
            conds = [Debtor.name.ilike(f"%{term}%")]
            if term.isdigit():
                conds.append(Debtor.number == int(term))
            if len(digits) >= 3:
                conds.append(Debtor.phone.contains(digits))
            stmt = stmt.where(or_(*conds))
    rows = summaries(db, list(db.scalars(stmt)))
    if filter == "debt":
        rows = [r for r in rows if r.balance > 0]
    elif filter == "clear":
        rows = [r for r in rows if r.balance <= 0]
    elif filter == "overdue":
        rows = [r for r in rows if r.overdue]
    epoch = datetime.min.replace(tzinfo=timezone.utc)
    key = {
        "recent": lambda r: (r.last_entry_at or r.created_at or epoch),
        "balance": lambda r: r.balance,
        "name": lambda r: r.name.lower(),
        "number": lambda r: r.number,
    }[sort]
    return sorted(rows, key=key, reverse=sort in ("recent", "balance"))


@router.post("/debtors", response_model=DebtorDetail, status_code=status.HTTP_201_CREATED)
def create_debtor(data: DebtorIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Foydalanuvchi qatorini bloklab, keyingi raqamni olamiz — bir vaqtda ikkita varaq bir xil raqam olmaydi
    db.execute(select(User.id).where(User.id == user.id).with_for_update())
    number = (db.scalar(select(func.max(Debtor.number)).where(Debtor.user_id == user.id)) or 0) + 1
    d = Debtor(user_id=user.id, number=number, name=data.name.strip(), phone=data.phone, note=data.note,
               direction=data.direction, share_token=secrets.token_urlsafe(18))
    db.add(d)
    db.commit()
    db.refresh(d)
    return detail(db, d)


@router.get("/debtors/{debtor_id}", response_model=DebtorDetail)
def get_debtor(debtor_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return detail(db, own_debtor(db, user, debtor_id))


@router.put("/debtors/{debtor_id}", response_model=DebtorDetail)
def update_debtor(debtor_id: int, data: DebtorIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = own_debtor(db, user, debtor_id)
    d.name, d.phone, d.note, d.direction = data.name.strip(), data.phone, data.note, data.direction
    db.commit()
    return detail(db, d)


@router.post("/debtors/{debtor_id}/share", response_model=DebtorDetail)
def reset_share_link(debtor_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mijozga berilgan havolani yangilash (eskisi ishlamay qoladi)."""
    d = own_debtor(db, user, debtor_id)
    d.share_token = secrets.token_urlsafe(18)
    db.commit()
    return detail(db, d)


@router.delete("/debtors/{debtor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_debtor(debtor_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(own_debtor(db, user, debtor_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Yozuvlar ----------
@router.post("/debtors/{debtor_id}/entries", response_model=EntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(debtor_id: int, data: EntryIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = own_debtor(db, user, debtor_id, lock=True)
    when = check_entry(data)
    if data.kind == EntryKind.payment:
        rest = balance_of(db, d.id)
        if data.amount > rest:
            raise http_error(status.HTTP_409_CONFLICT, "payment_too_much", rest=fmt(max(rest, 0)))
    e = Entry(debtor_id=d.id, user_id=user.id, kind=data.kind, amount=data.amount, happened_at=when,
              due_date=data.due_date, note=data.note.strip())
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@router.put("/entries/{entry_id}", response_model=EntryOut)
def update_entry(entry_id: int, data: EntryIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    e = own_entry(db, user, entry_id)
    own_debtor(db, user, e.debtor_id, lock=True)
    when = check_entry(data)
    others = balance_of(db, e.debtor_id, exclude_entry=e.id)
    if others + (data.amount if data.kind == EntryKind.debt else -data.amount) < 0:
        raise http_error(status.HTTP_409_CONFLICT, "balance_negative")
    e.kind, e.amount, e.happened_at, e.due_date, e.note = data.kind, data.amount, when, data.due_date, data.note.strip()
    db.commit()
    db.refresh(e)
    return e


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    e = own_entry(db, user, entry_id)
    own_debtor(db, user, e.debtor_id, lock=True)
    if e.kind == EntryKind.debt and balance_of(db, e.debtor_id, exclude_entry=e.id) < 0:
        raise http_error(status.HTTP_409_CONFLICT, "balance_negative")
    db.delete(e)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Rasmlar ----------
@router.post("/entries/{entry_id}/photos", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
async def upload_photo(entry_id: int, file: UploadFile = File(...), user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    e = own_entry(db, user, entry_id)
    if len(e.photos) >= settings.max_photos_per_entry:
        raise http_error(status.HTTP_400_BAD_REQUEST, "too_many_photos", n=settings.max_photos_per_entry)
    data = await file.read(settings.max_photo_bytes + 1)
    if len(data) > settings.max_photo_bytes:
        raise http_error(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "image_too_big", mb=settings.max_photo_bytes // 1_000_000)
    # Fayl turini nomiga emas, ichidagi baytlarga qarab tekshiramiz
    ctype = next((t for t, ok in IMAGE_SIGNATURES.items() if ok(data)), None)
    if ctype is None:
        raise http_error(status.HTTP_400_BAD_REQUEST, "bad_image")
    p = Photo(entry_id=e.id, content_type=ctype, size=len(data), data=data)
    db.add(p)
    db.commit()
    return PhotoOut(id=p.id, content_type=p.content_type, size=p.size)


def image_response(p: Photo) -> Response:
    return Response(p.data, media_type=p.content_type, headers={
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    })


@router.get("/photos/{photo_id}", response_class=Response, responses={200: {"content": {"image/jpeg": {}}}})
def get_photo(photo_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.get(Photo, photo_id)
    if p is None or p.entry.user_id != user.id:
        raise http_error(status.HTTP_404_NOT_FOUND, "photo_not_found")
    return image_response(p)


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(photo_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.get(Photo, photo_id)
    if p is None or p.entry.user_id != user.id:
        raise http_error(status.HTTP_404_NOT_FOUND, "photo_not_found")
    db.delete(p)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
