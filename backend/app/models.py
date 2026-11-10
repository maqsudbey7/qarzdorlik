"""Qarz daftar modellari.

    User 1 ── N Debtor (varaq, #raqam) 1 ── N Entry (qarz / to'lov) 1 ── N Photo (spisok, chek)

Jadvallar `qarz_` prefiksi bilan — bir bazada boshqa loyihalar bilan to'qnashmaydi.
"""
import enum
from datetime import date, datetime

from sqlalchemy import (BigInteger, CheckConstraint, Date, DateTime, Enum, ForeignKey, Integer, LargeBinary, String,
                        Text, UniqueConstraint, func)
from sqlalchemy.orm import Mapped, deferred, mapped_column, relationship

from .database import Base


class EntryKind(str, enum.Enum):
    debt = "debt"          # qarz berildi (+)
    payment = "payment"    # to'lov olindi (−)


class User(Base):
    __tablename__ = "qarz_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    shop_name: Mapped[str] = mapped_column(String(120), default="")   # eslatma xabarlarida ko'rinadi
    password_hash: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    debtors: Mapped[list["Debtor"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Debtor(Base):
    """Qarzdorning alohida varag'i. `number` — foydalanuvchi uchun tartib raqami (#1, #2, ...)."""

    __tablename__ = "qarz_debtors"
    __table_args__ = (UniqueConstraint("user_id", "number", name="uq_debtor_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("qarz_users.id", ondelete="CASCADE"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    share_token: Mapped[str] = mapped_column(String(40), unique=True, index=True)  # mijozga ko'rsatish havolasi
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="debtors")
    entries: Mapped[list["Entry"]] = relationship(back_populates="debtor", cascade="all, delete-orphan",
                                                  order_by="Entry.happened_at.desc(), Entry.id.desc()")


class Entry(Base):
    """Varaqdagi bitta yozuv: qarz berildi yoki to'lov olindi."""

    __tablename__ = "qarz_entries"
    __table_args__ = (CheckConstraint("amount > 0", name="ck_entry_amount_pos"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    debtor_id: Mapped[int] = mapped_column(ForeignKey("qarz_debtors.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("qarz_users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[EntryKind] = mapped_column(Enum(EntryKind, native_enum=False, length=10,
                                                 values_callable=lambda e: [m.value for m in e]))
    amount: Mapped[int] = mapped_column(BigInteger)
    happened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    due_date: Mapped[date | None] = mapped_column(Date)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    debtor: Mapped[Debtor] = relationship(back_populates="entries")
    photos: Mapped[list["Photo"]] = relationship(back_populates="entry", cascade="all, delete-orphan",
                                                 order_by="Photo.id", lazy="selectin")


class Photo(Base):
    """Dalil uchun rasm (spisok, chek, nakladnoy). Baytlari bazada saqlanadi — alohida xizmat kerak emas."""

    __tablename__ = "qarz_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("qarz_entries.id", ondelete="CASCADE"), index=True)
    content_type: Mapped[str] = mapped_column(String(30))
    size: Mapped[int] = mapped_column(Integer)
    data: Mapped[bytes] = deferred(mapped_column(LargeBinary))   # ro'yxatlarda yuklanmaydi
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    entry: Mapped[Entry] = relationship(back_populates="photos")
