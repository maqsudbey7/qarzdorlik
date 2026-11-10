import logging
import os
from collections.abc import Generator

from sqlalchemy import create_engine
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
    from .seed import seed_demo

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_demo(db)
    _ready = True


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
