"""Demo hisob: bir nechta qarzdor, yil davomidagi yozuvlar va namunaviy "spisok" rasmlari."""
import secrets
from datetime import datetime, timedelta, timezone
from xml.sax.saxutils import escape

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import settings
from .models import Debtor, Entry, EntryKind, Photo, User
from .security import hash_password
from .timeutil import TASHKENT

SHOP = "Baraka Market"

# ism, telefon, izoh, [(necha kun oldin, tur, summa, izoh, muddat (kun, berilgandan keyin), spisok qatorlari)]
DEMO = [
    ("Akmal aka (Chilonzor)", "+998901112233", "Har oy oxirida to‘laydi", [
        (95, "debt", 4_200_000, "Guruch 5 qop, yog‘ 2 quti", None, [("Guruch Lazer 25 kg", 5, 520_000), ("Kungaboqar yog‘i 5 L", 2, 800_000)]),
        (70, "payment", 4_200_000, "Naqd", None, None),
        (24, "debt", 6_150_000, "Shakar, un, makaron", 14, [("Shakar 50 kg", 5, 610_000), ("Un 50 kg", 6, 380_000), ("Makaron (quti)", 6, 140_000)]),
        (12, "payment", 2_000_000, "Karta orqali", None, None),
    ]),
    ("Oila market", "+998935554433", "", [
        (40, "debt", 3_050_000, "Shakar 5 qop", 30, [("Shakar 50 kg", 5, 610_000)]),
        (2, "debt", 1_080_000, "Mineral suv 40 blok", 7, None),
    ]),
    ("Dilnoza opa", "+998977776655", "Qo‘shni do‘kon", [
        (200, "debt", 900_000, "Choy, shirinlik", None, None),
        (180, "payment", 900_000, "", None, None),
        (6, "debt", 1_450_000, "Kir yuvish kukuni, sovun", 10, [("Kir yuvish kukuni 3 kg", 4, 260_000), ("Suyuq sovun", 2, 205_000)]),
    ]),
    ("Bobur usta", "+998991234567", "Qurilish ustasi", [
        (150, "debt", 7_800_000, "Sement 120 qop", 60, None),
        (120, "payment", 5_000_000, "", None, None),
        (60, "payment", 2_800_000, "", None, None),
        (30, "debt", 9_300_000, "Sement 150 qop", 45, [("Sement M400 50 kg", 150, 62_000)]),
        (3, "payment", 3_000_000, "Bo‘lib to‘layapti", None, None),
    ]),
    ("Sardor (Qo‘yliq bozor)", "+998946667788", "", [
        (300, "debt", 2_500_000, "Naqd qarz", 30, None),
        (250, "payment", 2_500_000, "", None, None),
    ]),
    ("Gulnora kafe", "+998901234500", "Kafe uchun mahsulot", [
        (45, "debt", 2_340_000, "Guruch, yog‘, ziravor", 20, [("Guruch 25 kg", 3, 520_000), ("Yog‘ 5 L", 2, 336_000), ("Ziravorlar", 1, 108_000)]),
        (15, "payment", 1_000_000, "", None, None),
    ]),
    ("Jasur", "", "Telefon raqami yo‘q", [
        (1, "debt", 350_000, "Sigaret, ichimlik", None, None),
    ]),
]


# Men qarzdor bo'lgan odamlar (ulgurji yetkazib beruvchilar)
DEMO_I_OWE = [
    ("Agro Trade (ulgurji)", "+998712001020", "Guruch va yog‘ yetkazib beruvchi", [
        (20, "debt", 12_000_000, "Guruch 20 qop nasiyaga", 25, None),
        (8, "payment", 5_000_000, "Bank orqali", None, None),
    ]),
    ("Rustam aka (qo‘shni)", "+998909998877", "Naqd pul", [
        (5, "debt", 3_000_000, "Tovar olish uchun naqd", 10, None),
    ]),
]


def _add_sheets(db: Session, user: User, items: list, start: int, direction: str) -> None:
    now = datetime.now(TASHKENT).replace(second=0, microsecond=0)
    for number, (name, phone, note, entries) in enumerate(items, start=start):
        d = Debtor(user_id=user.id, number=number, name=name, phone=phone, note=note, direction=direction,
                   share_token=secrets.token_urlsafe(18))
        db.add(d)
        for days, kind, amount, text, due_in, lines in entries:
            when = (now - timedelta(days=days)).replace(hour=10 + days % 8, minute=(days * 7) % 60)
            e = Entry(debtor=d, user_id=user.id, kind=EntryKind(kind), amount=amount, happened_at=when, note=text,
                      due_date=(when + timedelta(days=due_in)).date() if due_in else None)
            if lines:
                data = receipt_svg(SHOP, when, lines)
                e.photos.append(Photo(content_type="image/svg+xml", size=len(data), data=data))
            db.add(e)


def seed_demo_i_owe(db: Session) -> None:
    """Demo hisobga "men qarzdorman" varaqlarini qo'shish (eski bazada ham, faqat bir marta)."""
    user = db.scalar(select(User).where(User.phone == settings.demo_phone))
    if user is None or db.scalar(select(Debtor.id).where(Debtor.user_id == user.id, Debtor.direction == "i_owe").limit(1)):
        return
    try:
        db.execute(select(User.id).where(User.id == user.id).with_for_update())
        start = (db.scalar(select(func.max(Debtor.number)).where(Debtor.user_id == user.id)) or 0) + 1
        _add_sheets(db, user, DEMO_I_OWE, start, "i_owe")
        db.commit()
    except IntegrityError:
        db.rollback()


def receipt_svg(shop: str, when: datetime, lines: list[tuple[str, int, int]]) -> bytes:
    """Qo'lda yozilgan spisokka o'xshash namunaviy rasm (demo uchun)."""
    def sp(n: int) -> str:
        return f"{n:,}".replace(",", " ")

    h = 230 + len(lines) * 44
    rows = []
    for i, (name, qty, price) in enumerate(lines):
        y = 168 + i * 44
        rows.append(
            f'<text x="36" y="{y}" class="t">{i + 1}. {escape(name)}</text>'
            f'<text x="36" y="{y + 20}" class="s">{qty} × {sp(price)}</text>'
            f'<text x="444" y="{y + 10}" class="t" text-anchor="end">{sp(qty * price)}</text>'
        )
    total = sum(q * p for _, q, p in lines)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="480" height="{h}" viewBox="0 0 480 {h}">
<style>.t{{font:600 17px 'Courier New',monospace;fill:#1e293b}}.s{{font:14px 'Courier New',monospace;fill:#64748b}}
.h{{font:700 22px 'Courier New',monospace;fill:#0f172a}}</style>
<rect width="480" height="{h}" fill="#fffdf5"/>
{"".join(f'<line x1="0" x2="480" y1="{y}" y2="{y}" stroke="#dbeafe" stroke-width="1"/>' for y in range(120, h, 22))}
<line x1="24" x2="24" y1="0" y2="{h}" stroke="#fca5a5" stroke-width="2"/>
<text x="240" y="48" class="h" text-anchor="middle">SPISOK</text>
<text x="240" y="76" class="s" text-anchor="middle">{escape(shop)} · {when:%d.%m.%Y}</text>
<line x1="36" x2="444" y1="104" y2="104" stroke="#334155" stroke-dasharray="4 4"/>
<text x="36" y="132" class="s">Mahsulot</text><text x="444" y="132" class="s" text-anchor="end">Summa</text>
{"".join(rows)}
<line x1="36" x2="444" y1="{h - 74}" y2="{h - 74}" stroke="#334155" stroke-dasharray="4 4"/>
<text x="36" y="{h - 40}" class="h">JAMI:</text>
<text x="444" y="{h - 40}" class="h" text-anchor="end">{sp(total)} so‘m</text>
</svg>'''
    return svg.encode()


def seed_demo(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)):
        return
    try:
        user = User(name="Demo sotuvchi", phone=settings.demo_phone, shop_name=SHOP,
                    password_hash=hash_password(settings.demo_password))
        db.add(user)
        db.flush()
        _add_sheets(db, user, DEMO, 1, "owes_me")
        db.commit()
    except IntegrityError:  # bir vaqtda ikkita serverless nusxa seed qilsa
        db.rollback()


DEMO_RESET_EVERY = timedelta(minutes=30)


def reset_demo_if_due(db: Session, user: User) -> None:
    """Demo hisobga hamma kira oladi — kimdir o'zgartirib yuborsa ham har 30 daqiqada asl holiga qaytadi."""
    if user.phone != settings.demo_phone:
        return
    now = datetime.now(timezone.utc)
    locked = db.scalar(select(User).where(User.id == user.id).with_for_update())
    if locked.demo_reset_at and now - locked.demo_reset_at < DEMO_RESET_EVERY:
        db.rollback()
        return
    for d in list(locked.debtors):
        db.delete(d)
    db.flush()
    locked.name, locked.shop_name = "Demo sotuvchi", SHOP
    _add_sheets(db, locked, DEMO, 1, "owes_me")
    _add_sheets(db, locked, DEMO_I_OWE, len(DEMO) + 1, "i_owe")
    locked.demo_reset_at = now
    db.commit()
