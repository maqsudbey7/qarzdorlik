import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from .config import settings
from .database import engine, try_init_db
from .i18n import lang_var, pick_lang, tr
from .routers import auth, debtors, public, stats

log = logging.getLogger("qarz")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Baza ishlamasa ham ilova ishga tushadi; so'rovlar aniq xabar (503) qaytaradi.
    try_init_db()
    if settings.jwt_secret == "dev-secret-change-me":
        log.warning("JWT_SECRET o‘rnatilmagan — production’da albatta o‘zgartiring!")
    yield


app = FastAPI(
    title="Qarz daftar API",
    description="Qarzdorlar daftari: varaqlar, qarz va to‘lov yozuvlari, dalil rasmlari, hisobot",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class LanguageMiddleware:
    """`Accept-Language: ru` bo'lsa xabarlar ruscha, aks holda o'zbekcha (sof ASGI — contextvar endpoint'gacha yetadi)."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            header = dict(scope.get("headers") or []).get(b"accept-language", b"").decode("latin-1")
            token = lang_var.set(pick_lang(header))
            try:
                await self.app(scope, receive, send)
            finally:
                lang_var.reset(token)
        else:
            await self.app(scope, receive, send)


app.add_middleware(LanguageMiddleware)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    errors = exc.errors()
    first = errors[0] if errors else {}
    field = ".".join(str(x) for x in first.get("loc", [])[1:])
    msg = str(first.get("msg") or tr("invalid_data")).removeprefix("Value error, ")
    return JSONResponse(
        status_code=422,
        content={
            "detail": f"{field}: {msg}" if field else msg,
            "errors": [{"loc": e.get("loc"), "msg": str(e.get("msg")), "type": e.get("type")} for e in errors],
        },
    )


@app.exception_handler(OperationalError)
async def db_unavailable(_: Request, exc: OperationalError):
    log.error("Baza xatosi: %s", exc.orig)
    return JSONResponse(status_code=503, content={"detail": tr("db_unavailable")})


@app.exception_handler(SQLAlchemyError)
async def db_error(_: Request, exc: SQLAlchemyError):
    log.exception("SQL xatosi", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": tr("db_error")})


for r in (auth.router, debtors.router, stats.router, public.router):
    app.include_router(r, prefix="/api")


@app.get("/api/health", tags=["Tizim"])
def health():
    """Server va baza holati (Vercel’da sozlamani tekshirish uchun)."""
    if not settings.database_configured:
        return JSONResponse(status_code=503, content={"status": "error", "database": "not_configured", "detail": tr("db_unavailable")})
    try:
        with engine.connect() as conn:
            conn.execute(text("select 1"))
    except Exception as e:  # noqa: BLE001
        return JSONResponse(status_code=503, content={"status": "error", "database": type(e).__name__, "detail": tr("db_unavailable")})
    return {"status": "ok", "database": "ok"}


# Production: React build (frontend/dist) ni shu server ko'rsatadi.
dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if (dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            return JSONResponse({"detail": tr("not_found")}, status_code=404)
        file = dist / path
        return FileResponse(file if path and file.is_file() else dist / "index.html")
