"""Hisobot: jami qarz, bu oy / bu yil berilgan va qaytarilgan, oyma-oy grafik."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..logic import summaries
from ..models import Debtor, Entry, EntryKind, User
from ..schemas import MonthFlow, RecentEntry, StatsOut
from ..security import get_current_user
from ..timeutil import today

router = APIRouter(tags=["Hisobot"])

# Oy va yil chegaralari Toshkent vaqti bo'yicha
local_time = func.timezone("Asia/Tashkent", Entry.happened_at)
is_debt = Entry.kind == EntryKind.debt
is_pay = Entry.kind == EntryKind.payment


@router.get("/stats", response_model=StatsOut)
def stats(year: int | None = Query(None, ge=2000, le=2100), user: User = Depends(get_current_user),
          db: Session = Depends(get_db)):
    t = today()
    year = year or t.year
    month = func.extract("month", local_time)
    flows = {
        int(m): (g, p) for m, g, p in db.execute(
            select(month,
                   func.coalesce(func.sum(case((is_debt, Entry.amount))), 0),
                   func.coalesce(func.sum(case((is_pay, Entry.amount))), 0))
            .where(Entry.user_id == user.id, func.extract("year", local_time) == year).group_by(month)
        )
    }
    monthly = [MonthFlow(month=m, given=flows.get(m, (0, 0))[0], paid=flows.get(m, (0, 0))[1]) for m in range(1, 13)]

    cur = flows if year == t.year else {
        int(m): (g, p) for m, g, p in db.execute(
            select(month,
                   func.coalesce(func.sum(case((is_debt, Entry.amount))), 0),
                   func.coalesce(func.sum(case((is_pay, Entry.amount))), 0))
            .where(Entry.user_id == user.id, func.extract("year", local_time) == t.year).group_by(month)
        )
    }
    month_given, month_paid = cur.get(t.month, (0, 0))

    all_debtors = summaries(db, list(db.scalars(select(Debtor).where(Debtor.user_id == user.id))))
    with_debt = [d for d in all_debtors if d.balance > 0]
    overdue = [d for d in with_debt if d.overdue]

    recent_rows = db.execute(
        select(Entry, Debtor.number, Debtor.name).join(Debtor, Debtor.id == Entry.debtor_id)
        .where(Entry.user_id == user.id).order_by(Entry.happened_at.desc(), Entry.id.desc()).limit(8)
    ).all()

    return StatsOut(
        outstanding=sum(d.balance for d in with_debt), debtors_total=len(all_debtors), debtors_with_debt=len(with_debt),
        overdue_count=len(overdue), overdue_amount=sum(d.balance for d in overdue),
        month_given=month_given, month_paid=month_paid,
        year_given=sum(m.given for m in monthly), year_paid=sum(m.paid for m in monthly), year=year, monthly=monthly,
        top=sorted(with_debt, key=lambda d: d.balance, reverse=True)[:5],
        recent=[RecentEntry(id=e.id, debtor_id=e.debtor_id, debtor_number=num, debtor_name=name, kind=e.kind,
                            amount=e.amount, happened_at=e.happened_at, photos=len(e.photos))
                for e, num, name in recent_rows],
    )
