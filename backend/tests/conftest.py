import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://ombor:ombor@localhost:5432/qarz_test")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import database  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    database._ready = False
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(engine)


def register(c: TestClient, phone: str) -> dict:
    r = c.post("/api/auth/register", json={"name": "Sotuvchi", "phone": phone, "password": "secret12", "shop_name": "Test do‘kon"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def user(client):
    return register(client, "+998 91 111 22 33")
