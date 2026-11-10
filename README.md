# 📒 Qarz daftar — qarzdorlar hisobi

Kimga, qachon, qancha qarz berganingizni yozib boring, **spisok yoki chek rasmini dalil** sifatida qo‘shing.
Har bir qarzdorga **alohida varaq** va avtomatik **raqam** (#1, #2, …) beriladi.

**Demo:** telefon `+998900000000`, parol `demo123` (yoki saytdagi “Demo’ni ko‘rish”).

| Qatlam | Texnologiyalar |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy 2 ORM, PostgreSQL, Pydantic v2, JWT, bcrypt, pytest |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Redux Toolkit, TanStack Query, Motion |
| Deploy | Vercel (frontend + FastAPI serverless) + Neon PostgreSQL |

## Imkoniyatlar
- 🔢 **Har bir qarzdorga varaq** — avtomatik raqam, ism, telefon, izoh
- ➕➖ **Yozuvlar** — “Qarz berdim” / “To‘lov oldim”, summa, sana (avtomatik hozirgi vaqt, o‘zgartirsa bo‘ladi), izoh
- 📷 **Rasm — dalil** — har bir yozuvga 6 tagacha rasm (telefonda avtomatik siqiladi)
- 🔍 **Qidiruv** — ism, telefon yoki `#raqam` bo‘yicha
- 📊 **Hisobot** — bu oy / bu yil berilgan va qaytgan, oyma-oy grafik, eng ko‘p qarzdorlar
- 📅 **Qaytarish muddati** (ixtiyoriy) — muddati o‘tganlar qizil bilan ajralib turadi
- 🔗 **Mijozga havola** — mijoz o‘z varag‘ini (yozuvlar va rasmlar) ko‘radi, o‘zgartira olmaydi
- 💬 **Eslatma** — SMS / WhatsApp / Telegram orqali tayyor matn (o‘zbek yoki rus tilida)
- 🌐 **O‘zbek va rus tili**, telefon uchun qulay dizayn
- 📱 **Telefon ilovasi (PWA)** — saytdan bir bosishda o‘rnatiladi (Android: «O‘rnatish» tugmasi, iPhone: Ulashish → «Bosh ekranga qo‘shish»), to‘liq ekranda ochiladi, internet bo‘lmasa oxirgi ma’lumotlar ko‘rinadi; ikonkani uzoq bossangiz — «Qarz yozish» tezkor havolasi

Qarz qoldig‘i va muddatlar to‘lovlar eng eski qarzdan boshlab yopiladi (FIFO) degan qoida bilan hisoblanadi.
To‘lov qarzdan ko‘p bo‘lishi mumkin emas; bir vaqtdagi yozuvlar `SELECT … FOR UPDATE` bilan himoyalangan.

## Kompyuterda ishga tushirish
```sql
CREATE DATABASE qarz_daftar;
```
```bash
cd backend
py -m venv .venv
source .venv/Scripts/activate          # CMD: .venv\Scripts\activate
python -m pip install -r requirements.txt
cp .env.example .env                    # DATABASE_URL ni o‘zingiznikiga o‘zgartiring (# → %23)
python -m uvicorn app.main:app --reload --port 8001
```
```bash
cd frontend
npm install
npm run dev                             # http://localhost:5174
```
Swagger: http://localhost:8001/api/docs

**Testlar:** `CREATE DATABASE qarz_test;` so‘ng `cd backend && DATABASE_URL=postgresql+psycopg://postgres:PAROL@localhost:5432/qarz_test python -m pytest`

## Ma'lumotlar bazasi
```
qarz_users 1──N qarz_debtors (varaq, #raqam) 1──N qarz_entries (qarz / to‘lov) 1──N qarz_photos
```
Jadvallar `qarz_` prefiksi bilan — boshqa loyihalar bilan bir bazada tura oladi. Rasmlar bazada saqlanadi (alohida xizmat kerak emas).

## API
| Metod | Yo‘l | Vazifa |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Ro‘yxatdan o‘tish / kirish |
| GET / PUT | `/api/auth/me` | Profil (ism, do‘kon nomi) |
| GET / POST | `/api/debtors` | Qarzdorlar (`q`, `filter`, `sort`) / yangi varaq |
| GET / PUT / DELETE | `/api/debtors/{id}` | Varaq (yozuvlar bilan) |
| POST | `/api/debtors/{id}/share` | Mijoz havolasini yangilash |
| POST | `/api/debtors/{id}/entries` | Qarz yoki to‘lov yozish |
| PUT / DELETE | `/api/entries/{id}` | Yozuvni tahrirlash / o‘chirish |
| POST | `/api/entries/{id}/photos` | Rasm yuklash (JPG/PNG/WEBP) |
| GET / DELETE | `/api/photos/{id}` | Rasm |
| GET | `/api/stats?year=` | Hisobot |
| GET | `/api/public/{token}` | Mijoz uchun ochiq varaq |
