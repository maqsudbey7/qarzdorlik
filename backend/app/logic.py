"""Qarzdor varag'i bo'yicha hisob-kitob (balans, muddatlar)."""
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Debtor, Entry, EntryKind
from .schemas import DebtorSummary
from .timeutil import today


@dataclass
class Row:
    kind: EntryKind
    amount: int
    happened_at: datetime
    due_date: date | None


def summarize(d: Debtor, rows: list[Row], t: date | None = None) -> DebtorSummary:
    """To'lovlar eng eski qarzdan boshlab yopiladi (FIFO) — shunda qaysi qarz hali ochiq ekani aniq bo'ladi."""
    t = t or today()
    debts = sorted((r for r in rows if r.kind == EntryKind.debt), key=lambda r: r.happened_at)
    total_debt = sum(r.amount for r in debts)
    total_paid = sum(r.amount for r in rows if r.kind == EntryKind.payment)
    pool = total_paid
    open_dues: list[date] = []
    for r in debts:
        covered = min(pool, r.amount)
        pool -= covered
        if r.amount - covered > 0 and r.due_date:
            open_dues.append(r.due_date)
    balance = total_debt - total_paid
    next_due = min(open_dues) if open_dues and balance > 0 else None
    return DebtorSummary(
        id=d.id, number=d.number, name=d.name, phone=d.phone, note=d.note, direction=d.direction or "owes_me",
        created_at=d.created_at,
        total_debt=total_debt, total_paid=total_paid, balance=balance, entries_count=len(rows),
        last_entry_at=max((r.happened_at for r in rows), default=None),
        next_due=next_due, overdue=bool(next_due and next_due < t),
    )


def summaries(db: Session, debtors: list[Debtor]) -> list[DebtorSummary]:
    """Bir nechta varaq uchun bitta so'rov bilan jamlanma (rasmlar yuklanmaydi)."""
    if not debtors:
        return []
    rows: dict[int, list[Row]] = defaultdict(list)
    q = select(Entry.debtor_id, Entry.kind, Entry.amount, Entry.happened_at, Entry.due_date).where(
        Entry.debtor_id.in_([d.id for d in debtors]))
    for debtor_id, kind, amount, happened_at, due in db.execute(q):
        rows[debtor_id].append(Row(kind, amount, happened_at, due))
    t = today()
    return [summarize(d, rows[d.id], t) for d in debtors]


def balance_of(db: Session, debtor_id: int, exclude_entry: int | None = None) -> int:
    """Hozirgi qarz (ixtiyoriy ravishda bitta yozuvni hisobga olmasdan)."""
    q = select(Entry.kind, Entry.amount).where(Entry.debtor_id == debtor_id)
    if exclude_entry:
        q = q.where(Entry.id != exclude_entry)
    return sum(a if k == EntryKind.debt else -a for k, a in db.execute(q))
