import logging
import os
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from .config import settings

log = logging.getLogger("qarz")

_serverless = bool(os.getenv("VERCEL"))
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
    **({"poolclass": NullPool} if _serverless else {}),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


_ready = False


def ensure_db() -> None:
    """Jadvallarni (bir marta) yaratadi va bo'sh bazaga demo ma'lumot qo'shadi."""
    global _ready
    if _ready:
        return
    from . import models  # noqa: F401
    from .seed import seed_demo, seed_demo_i_owe

    Base.metadata.create_all(engine)
    run_migrations()
    with SessionLocal() as db:
        seed_demo(db)
        seed_demo_i_owe(db)
    _ready = True


# Sxema o'zgarishlari — faqat QO'SHISH (hech qachon jadval/ustun o'chirilmaydi), shuning uchun
# sayt yangilanganda foydalanuvchilar ma'lumotlari saqlanib qoladi. Har biri bir marta bajariladi.
MIGRATIONS = [
    (1, "ALTER TABLE qarz_users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0"),
    (2, "ALTER TABLE qarz_debtors ADD COLUMN IF NOT EXISTS direction VARCHAR(10) NOT NULL DEFAULT 'owes_me'"),
    (3, "CREATE INDEX IF NOT EXISTS ix_qarz_debtors_direction ON qarz_debtors (direction)"),
    (4, "ALTER TABLE qarz_users ADD COLUMN IF NOT EXISTS demo_reset_at TIMESTAMPTZ"),
]


def run_migrations() -> None:
    with engine.begin() as conn:
        conn.execute(text("SELECT pg_advisory_xact_lock(724502)"))   # bir vaqtda ikki server bajarmasin
        conn.execute(text("CREATE TABLE IF NOT EXISTS qarz_schema_migrations "
                          "(version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"))
        done = {r[0] for r in conn.execute(text("SELECT version FROM qarz_schema_migrations"))}
        for version, sql in MIGRATIONS:
            if version not in done:
                conn.execute(text(sql))
                conn.execute(text("INSERT INTO qarz_schema_migrations (version) VALUES (:v)"), {"v": version})
                log.info("Migratsiya %s bajarildi", version)


def try_init_db() -> None:
    try:
        ensure_db()
    except Exception as e:  # noqa: BLE001
        log.error("Bazani tayyorlab bo'lmadi: %s", e)


def get_db() -> Generator[Session, None, None]:
    ensure_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
