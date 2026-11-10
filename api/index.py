"""Vercel Python funksiyasi: /api/* so'rovlari shu yerga keladi va FastAPI ilovasiga uzatiladi."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402,F401  (Vercel `app` o'zgaruvchisini qidiradi)
