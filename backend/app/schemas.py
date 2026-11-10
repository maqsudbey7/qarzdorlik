import re
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .i18n import tr
from .models import EntryKind


def normalize_phone(v: str) -> str:
    v = re.sub(r"[^\d+]", "", v or "")
    if not re.fullmatch(r"\+?\d{9,15}", v):
        raise ValueError(tr("bad_phone"))
    return v


def optional_phone(v: str | None) -> str:
    """Bo'sh yoki faqat "+998" bo'lsa — telefonsiz."""
    return normalize_phone(v) if v and re.sub(r"\D", "", v) not in ("", "998") else ""


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str
    password: str = Field(min_length=6, max_length=128)
    shop_name: str = Field(default="", max_length=120)

    _phone = field_validator("phone")(normalize_phone)


class LoginIn(BaseModel):
    phone: str
    password: str

    _phone = field_validator("phone")(normalize_phone)


class ProfileIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    shop_name: str = Field(default="", max_length=120)


class UserOut(ORM):
    id: int
    name: str
    phone: str
    shop_name: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Qarzdorlar ----------
class DebtorIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = ""
    note: str = Field(default="", max_length=1000)

    _phone = field_validator("phone")(optional_phone)


class DebtorSummary(BaseModel):
    """Ro'yxatdagi qarzdor (varaq) — jamlangan raqamlar bilan."""
    id: int
    number: int
    name: str
    phone: str
    note: str
    created_at: datetime
    total_debt: int        # jami berilgan qarz
    total_paid: int        # jami qaytarilgan
    balance: int           # hozirgi qarzi
    entries_count: int
    last_entry_at: datetime | None
    next_due: date | None  # eng yaqin qaytarish muddati (qarzi bo'lsa)
    overdue: bool


class PhotoOut(ORM):
    id: int
    content_type: str
    size: int


class EntryIn(BaseModel):
    kind: EntryKind
    amount: int = Field(gt=0, le=10**13)
    happened_at: datetime | None = Field(default=None, description="Bo'sh bo'lsa — hozirgi vaqt")
    due_date: date | None = None
    note: str = Field(default="", max_length=1000)


class EntryOut(ORM):
    id: int
    kind: EntryKind
    amount: int
    happened_at: datetime
    due_date: date | None
    note: str
    created_at: datetime
    photos: list[PhotoOut]


class DebtorDetail(DebtorSummary):
    share_token: str
    entries: list[EntryOut]


# ---------- Hisobot ----------
class MonthFlow(BaseModel):
    month: int
    given: int
    paid: int


class RecentEntry(BaseModel):
    id: int
    debtor_id: int
    debtor_number: int
    debtor_name: str
    kind: EntryKind
    amount: int
    happened_at: datetime
    photos: int


class StatsOut(BaseModel):
    outstanding: int           # jami qolgan qarz
    debtors_total: int
    debtors_with_debt: int
    overdue_count: int
    overdue_amount: int
    month_given: int
    month_paid: int
    year_given: int
    year_paid: int
    year: int
    monthly: list[MonthFlow]   # tanlangan yil bo'yicha 12 oy
    top: list[DebtorSummary]   # eng ko'p qarzdorlar
    recent: list[RecentEntry]


# ---------- Ochiq varaq (mijoz uchun) ----------
class PublicSheet(BaseModel):
    shop_name: str
    owner_name: str
    number: int
    name: str
    total_debt: int
    total_paid: int
    balance: int
    entries: list[EntryOut]
