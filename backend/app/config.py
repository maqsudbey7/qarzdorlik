import os

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Vercel + Neon `DATABASE_URL` yoki `POSTGRES_URL` beradi — ikkalasi ham qabul qilinadi.
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/qarz",
        validation_alias=AliasChoices("DATABASE_URL", "POSTGRES_URL", "database_url"),
    )
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_days: int = 60
    cors_origins: list[str] = ["http://localhost:5174"]
    demo_phone: str = "+998900000000"
    demo_password: str = "demo123"
    max_photo_bytes: int = 4_000_000   # Vercel so'rov chegarasi ~4.5 MB; frontend rasmni siqib yuboradi
    max_photos_per_entry: int = 6

    @field_validator("database_url")
    @classmethod
    def use_psycopg3(cls, v: str) -> str:
        for prefix in ("postgresql+psycopg2://", "postgresql://", "postgres://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix):]
        return v

    @property
    def database_configured(self) -> bool:
        return not os.getenv("VERCEL") or bool(os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL"))


settings = Settings()
