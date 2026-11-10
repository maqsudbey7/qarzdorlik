"""Mijoz uchun ochiq varaq: havola orqali faqat ko'rish (tahrirlash yo'q)."""
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..i18n import http_error
from ..logic import summaries
from ..models import Debtor, Photo
from ..schemas import EntryOut, PublicSheet
from .debtors import image_response

router = APIRouter(prefix="/public", tags=["Ochiq varaq"])


def by_token(db: Session, token: str) -> Debtor:
    d = db.scalar(select(Debtor).where(Debtor.share_token == token)) if len(token) >= 16 else None
    if d is None:
        raise http_error(status.HTTP_404_NOT_FOUND, "page_not_found")
    return d


@router.get("/{token}", response_model=PublicSheet)
def public_sheet(token: str, db: Session = Depends(get_db)):
    d = by_token(db, token)
    s = summaries(db, [d])[0]
    return PublicSheet(shop_name=d.user.shop_name, owner_name=d.user.name, number=d.number, name=d.name,
                       total_debt=s.total_debt, total_paid=s.total_paid, balance=s.balance,
                       entries=[EntryOut.model_validate(e) for e in d.entries])


@router.get("/{token}/photos/{photo_id}", response_class=Response)
def public_photo(token: str, photo_id: int, db: Session = Depends(get_db)):
    d = by_token(db, token)
    p = db.get(Photo, photo_id)
    if p is None or p.entry.debtor_id != d.id:
        raise http_error(status.HTTP_404_NOT_FOUND, "photo_not_found")
    return image_response(p)
