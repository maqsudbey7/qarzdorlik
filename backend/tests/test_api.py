from datetime import datetime, timedelta, timezone

from app.timeutil import today
from tests.conftest import register

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 200


def new_debtor(c, h, name, phone=""):
    r = c.post("/api/debtors", headers=h, json={"name": name, "phone": phone})
    assert r.status_code == 201, r.text
    return r.json()


def add(c, h, did, kind, amount, **kw):
    return c.post(f"/api/debtors/{did}/entries", headers=h, json={"kind": kind, "amount": amount, **kw})


def test_numbering_and_search(client, user):
    a = new_debtor(client, user, "Akmal aka", "+998 90 111 22 33")
    b = new_debtor(client, user, "Oila market")
    assert (a["number"], b["number"]) == (1, 2) and a["share_token"]
    # boshqa foydalanuvchida raqamlash o'zidan boshlanadi
    other = register(client, "+998 93 000 00 01")
    assert new_debtor(client, other, "Boshqa")["number"] == 1
    search = lambda q: [d["name"] for d in client.get("/api/debtors", headers=user, params={"q": q}).json()]  # noqa: E731
    assert search("akmal") == ["Akmal aka"]
    assert search("#2") == ["Oila market"]
    assert search("1112233") == ["Akmal aka"]
    # boshqaning varag'i ko'rinmaydi
    assert client.get(f"/api/debtors/{a['id']}", headers=other).status_code == 404


def test_entries_balance_rules(client, user):
    d = new_debtor(client, user, "Akmal")
    assert add(client, user, d["id"], "debt", 1_000_000, note="Guruch 2 qop").status_code == 201
    assert add(client, user, d["id"], "payment", 1_500_000).status_code == 409          # qarzdan ko'p
    assert add(client, user, d["id"], "payment", 100, due_date=str(today())).status_code == 400  # muddat faqat qarzga
    future = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    assert add(client, user, d["id"], "debt", 100, happened_at=future).status_code == 400
    past = (datetime.now(timezone.utc) - timedelta(days=40)).isoformat()
    first = add(client, user, d["id"], "debt", 500_000, happened_at=past).json()
    pay = add(client, user, d["id"], "payment", 1_200_000).json()
    detail = client.get(f"/api/debtors/{d['id']}", headers=user).json()
    assert (detail["total_debt"], detail["total_paid"], detail["balance"]) == (1_500_000, 1_200_000, 300_000)
    assert detail["entries"][-1]["id"] == first["id"]   # yangi yozuvlar tepada
    # qarzni o'chirsak to'lovlar ko'p bo'lib qoladi — ruxsat yo'q
    assert client.delete(f"/api/entries/{first['id']}", headers=user).status_code == 409
    assert client.put(f"/api/entries/{pay['id']}", headers=user, json={"kind": "payment", "amount": 2_000_000}).status_code == 409
    upd = client.put(f"/api/entries/{pay['id']}", headers=user, json={"kind": "payment", "amount": 1_500_000, "note": "to‘liq"})
    assert upd.status_code == 200
    assert client.get(f"/api/debtors/{d['id']}", headers=user).json()["balance"] == 0


def test_overdue_fifo(client, user):
    d = new_debtor(client, user, "Bobur")
    t = today()
    old = (datetime.now(timezone.utc) - timedelta(days=20)).isoformat()
    add(client, user, d["id"], "debt", 100, happened_at=old, due_date=str(t - timedelta(days=5)))
    add(client, user, d["id"], "debt", 50, due_date=str(t + timedelta(days=7)))
    s = client.get(f"/api/debtors/{d['id']}", headers=user).json()
    assert s["overdue"] is True and s["next_due"] == str(t - timedelta(days=5))
    add(client, user, d["id"], "payment", 100)   # eski qarz yopildi
    s = client.get(f"/api/debtors/{d['id']}", headers=user).json()
    assert s["overdue"] is False and s["next_due"] == str(t + timedelta(days=7))
    assert [x["name"] for x in client.get("/api/debtors?filter=overdue", headers=user).json()] == []


def test_photos(client, user):
    d = new_debtor(client, user, "Dilnoza")
    e = add(client, user, d["id"], "debt", 900_000).json()
    up = lambda data, name="spisok.jpg": client.post(f"/api/entries/{e['id']}/photos", headers=user, files={"file": (name, data, "image/jpeg")})  # noqa: E731
    r = up(JPEG)
    assert r.status_code == 201 and r.json()["content_type"] == "image/jpeg"
    assert up(b"<html>not an image</html>", "x.jpg").status_code == 400   # tur nomiga emas, baytlarga qarab
    img = client.get(f"/api/photos/{r.json()['id']}", headers=user)
    assert img.status_code == 200 and img.content == JPEG and img.headers["content-type"] == "image/jpeg"
    other = register(client, "+998 93 000 00 02")
    assert client.get(f"/api/photos/{r.json()['id']}", headers=other).status_code == 404
    for _ in range(5):
        assert up(JPEG).status_code == 201
    assert up(JPEG).status_code == 400   # 6 tadan ko'p emas
    assert len(client.get(f"/api/debtors/{d['id']}", headers=user).json()["entries"][0]["photos"]) == 6
    assert client.delete(f"/api/photos/{r.json()['id']}", headers=user).status_code == 204


def test_stats_and_public(client, user):
    a = new_debtor(client, user, "Akmal")
    b = new_debtor(client, user, "Oila")
    add(client, user, a["id"], "debt", 1_000_000)
    add(client, user, b["id"], "debt", 400_000)
    add(client, user, a["id"], "payment", 300_000)
    s = client.get("/api/stats", headers=user).json()
    assert s["outstanding"] == 1_100_000 and s["debtors_with_debt"] == 2
    assert s["month_given"] == 1_400_000 and s["month_paid"] == 300_000 and s["year_given"] == 1_400_000
    assert sum(m["given"] for m in s["monthly"]) == 1_400_000 and len(s["monthly"]) == 12
    assert [t["name"] for t in s["top"]] == ["Akmal", "Oila"] and len(s["recent"]) == 3
    # Mijoz uchun ochiq varaq
    pub = client.get(f"/api/public/{a['share_token']}").json()
    assert pub["balance"] == 700_000 and pub["shop_name"] == "Test do‘kon" and len(pub["entries"]) == 2
    assert client.get("/api/public/notarealtokenxxxxxxxx").status_code == 404
    # havolani yangilasa eskisi ishlamaydi
    new = client.post(f"/api/debtors/{a['id']}/share", headers=user).json()["share_token"]
    assert client.get(f"/api/public/{a['share_token']}").status_code == 404
    assert client.get(f"/api/public/{new}").status_code == 200


def test_demo_and_languages(client):
    r = client.post("/api/auth/login", json={"phone": "+998900000000", "password": "demo123"})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    debtors = client.get("/api/debtors", headers=h).json()
    assert len(debtors) == 9 and {d["number"] for d in debtors} == set(range(1, 10))
    assert sum(d["direction"] == "i_owe" for d in debtors) == 2
    detail = client.get(f"/api/debtors/{debtors[0]['id']}", headers=h).json()
    photo = next((p for e in detail["entries"] for p in e["photos"]), None)
    if photo:
        assert client.get(f"/api/photos/{photo['id']}", headers=h).headers["content-type"].startswith("image/svg")
    ru = client.post("/api/auth/login", json={"phone": "+998900000000", "password": "x"}, headers={"Accept-Language": "ru"})
    assert ru.json()["detail"] == "Неверный телефон или пароль"


# ---------- Men qarzdorman ----------
def test_i_owe_direction(client, user):
    r = client.post("/api/debtors", headers=user, json={"name": "Ulgurji baza", "direction": "i_owe"})
    assert r.status_code == 201 and r.json()["direction"] == "i_owe"
    did = r.json()["id"]
    client.post(f"/api/debtors/{did}/entries", headers=user, json={"kind": "debt", "amount": 1_000_000})
    client.post(f"/api/debtors/{did}/entries", headers=user, json={"kind": "payment", "amount": 400_000})
    other = client.post("/api/debtors", headers=user, json={"name": "Mijoz"}).json()
    client.post(f"/api/debtors/{other['id']}/entries", headers=user, json={"kind": "debt", "amount": 250_000})
    mine = client.get("/api/debtors?direction=i_owe", headers=user).json()
    assert [d["name"] for d in mine] == ["Ulgurji baza"] and mine[0]["balance"] == 600_000
    assert [d["name"] for d in client.get("/api/debtors?direction=owes_me", headers=user).json()] == ["Mijoz"]
    s = client.get("/api/stats", headers=user).json()
    assert s["outstanding"] == 250_000 and s["my_debt"] == 600_000 and s["my_creditors"] == 1
    assert s["month_given"] == 250_000


# ---------- Xavfsizlik ----------
def test_weak_password_and_friendly_messages(client):
    r = client.post("/api/auth/register", json={"name": "Ali", "phone": "+998901234567", "password": "123"})
    assert r.status_code == 422 and "8" in r.json()["detail"]
    r = client.post("/api/auth/register", json={"name": "", "phone": "+998901234567", "password": "secret12"})
    assert r.json()["detail"] == "«Ism» kamida 2 ta belgi bo‘lsin"


def test_rate_limit_and_password_change(client, user):
    for _ in range(5):
        client.post("/api/auth/login", json={"phone": "+998911112233", "password": "xato1234"})
    assert client.post("/api/auth/login", json={"phone": "+998911112233", "password": "secret12"}).status_code == 429
    r = client.post("/api/auth/password", headers=user, json={"current_password": "secret12", "new_password": "Yangi12345"})
    assert r.status_code == 200
    assert client.get("/api/auth/me", headers=user).status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"}).status_code == 200


def test_export_delete_and_headers(client, user):
    client.post("/api/debtors", headers=user, json={"name": "Ali"})
    r = client.get("/api/auth/export", headers=user)
    assert r.status_code == 200 and r.json()["sheets"][0]["name"] == "Ali"
    assert r.headers["x-frame-options"] == "DENY"
    assert client.request("DELETE", "/api/auth/me", headers=user, json={"password": "xato"}).status_code == 400
    assert client.request("DELETE", "/api/auth/me", headers=user, json={"password": "secret12"}).status_code == 204


def test_demo_has_both_directions_and_resets(client):
    tok = client.post("/api/auth/login", json={"phone": "+998900000000", "password": "demo123"}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    assert client.get("/api/debtors?direction=i_owe", headers=h).json()
    assert client.post("/api/auth/password", headers=h, json={"current_password": "demo123", "new_password": "boshqa123"}).status_code == 403
    first = client.get("/api/debtors", headers=h).json()[0]["id"]
    client.delete(f"/api/debtors/{first}", headers=h)
    from datetime import datetime, timedelta, timezone
    from app.database import SessionLocal
    from app.models import User
    with SessionLocal() as db:
        u = db.query(User).filter(User.phone == "+998900000000").one()
        u.demo_reset_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()
    client.post("/api/auth/login", json={"phone": "+998900000000", "password": "demo123"})
    assert len(client.get("/api/debtors", headers=h).json()) == 9
