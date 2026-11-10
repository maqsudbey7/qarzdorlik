"""O'zbekiston vaqti (UTC+5, yozgi vaqt yo'q) — qarz muddatlari mahalliy sana bo'yicha hisoblanadi."""
from datetime import date, datetime, timedelta, timezone

TASHKENT = timezone(timedelta(hours=5), "Asia/Tashkent")


def today() -> date:
    return datetime.now(TASHKENT).date()
