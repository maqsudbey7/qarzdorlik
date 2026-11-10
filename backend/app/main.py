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
from .i18n import field_label, lang_var, pick_lang, tr
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
    title="Qarzingniber API",
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


V_KEYS = {
    "missing": "v_missing", "string_too_short": "v_short", "string_too_long": "v_long",
    "int_parsing": "v_number", "int_type": "v_number", "int_from_float": "v_number", "float_parsing": "v_number",
    "greater_than_equal": "v_min", "greater_than": "v_gt", "less_than_equal": "v_bad", "date_parsing": "v_date",
    "date_from_datetime_parsing": "v_date", "datetime_parsing": "v_date", "datetime_from_date_parsing": "v_date",
    "literal_error": "v_choice", "enum": "v_choice",
}


def friendly(err: dict) -> str:
    """Pydantic xatosini oddiy gapga aylantirish: «Ism» to'ldirilishi shart."""
    loc = [x for x in err.get("loc", [])[1:] if isinstance(x, str)]
    kind = err.get("type", "")
    ctx = err.get("ctx") or {}
    if kind == "value_error" or not loc:
        return str(err.get("msg") or tr("invalid_data")).removeprefix("Value error, ")
    if kind == "string_too_short" and ctx.get("min_length") == 1:
        kind = "missing"
    n = ctx.get("min_length") or ctx.get("max_length") or ctx.get("ge") or ctx.get("gt") or ""
    return tr(V_KEYS.get(kind, "v_bad"), f=field_label(loc[-1]), n=n)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    errors = exc.errors()
    msgs = [friendly(e) for e in errors] or [tr("invalid_data")]
    return JSONResponse(status_code=422, content={"detail": msgs[0], "errors": [{"loc": e.get("loc"), "msg": m} for e, m in zip(errors, msgs)]})


@app.exception_handler(OperationalError)
async def db_unavailable(_: Request, exc: OperationalError):
    log.error("Baza xatosi: %s", exc.orig)
    return JSONResponse(status_code=503, content={"detail": tr("db_unavailable")})


@app.exception_handler(SQLAlchemyError)
async def db_error(_: Request, exc: SQLAlchemyError):
    log.exception("SQL xatosi", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": tr("db_error")})


@app.exception_handler(Exception)
async def unexpected(_: Request, exc: Exception):
    log.exception("Kutilmagan xato", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": tr("server_error")})


class SecurityHeaders:
    """Brauzer darajasidagi himoya sarlavhalari."""

    HEADERS = [
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
        (b"referrer-policy", b"strict-origin-when-cross-origin"),
        (b"permissions-policy", b"geolocation=(), microphone=()"),
        (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
    ]

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        path = scope.get("path", "")
        no_store = path.startswith("/api/") and not path.startswith("/api/docs") and "/photos/" not in path

        async def wrapped(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers") or []) + self.HEADERS
                if no_store:
                    headers.append((b"cache-control", b"no-store"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, wrapped)


app.add_middleware(SecurityHeaders)


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
