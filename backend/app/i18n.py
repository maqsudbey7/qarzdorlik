"""Ikki tilli (o'zbek / rus) server xabarlari. Til `Accept-Language` sarlavhasidan olinadi."""
from contextvars import ContextVar

from fastapi import HTTPException

lang_var: ContextVar[str] = ContextVar("lang", default="uz")

MESSAGES: dict[str, dict[str, str]] = {
    "login_required": {"uz": "Tizimga kiring", "ru": "Войдите в систему"},
    "session_expired": {"uz": "Sessiya tugagan, qayta kiring", "ru": "Сессия истекла, войдите снова"},
    "phone_taken": {"uz": "Bu telefon raqam ro‘yxatdan o‘tgan", "ru": "Этот номер уже зарегистрирован"},
    "bad_credentials": {"uz": "Telefon yoki parol noto‘g‘ri", "ru": "Неверный телефон или пароль"},
    "bad_phone": {"uz": "Telefon raqam noto‘g‘ri", "ru": "Неверный номер телефона"},
    "debtor_not_found": {"uz": "Qarzdor topilmadi", "ru": "Должник не найден"},
    "entry_not_found": {"uz": "Yozuv topilmadi", "ru": "Запись не найдена"},
    "photo_not_found": {"uz": "Rasm topilmadi", "ru": "Фото не найдено"},
    "page_not_found": {"uz": "Varaq topilmadi yoki havola eskirgan", "ru": "Страница не найдена или ссылка устарела"},
    "payment_too_much": {"uz": "To‘lov qarzdan ko‘p: qarz {rest} so‘m", "ru": "Оплата больше долга: долг {rest} сум"},
    "balance_negative": {"uz": "Bu o‘zgarishdan keyin to‘lovlar qarzdan ko‘p bo‘lib qoladi", "ru": "После изменения оплаты превысят долг"},
    "due_only_debt": {"uz": "Qaytarish muddati faqat qarz uchun", "ru": "Срок возврата — только для долга"},
    "future_date": {"uz": "Sana kelajakda bo‘lishi mumkin emas", "ru": "Дата не может быть в будущем"},
    "bad_image": {"uz": "Faqat JPG, PNG yoki WEBP rasm yuklash mumkin", "ru": "Можно загрузить только JPG, PNG или WEBP"},
    "image_too_big": {"uz": "Rasm juda katta (maks. {mb} MB)", "ru": "Слишком большое фото (макс. {mb} МБ)"},
    "too_many_photos": {"uz": "Bitta yozuvga ko‘pi bilan {n} ta rasm", "ru": "Не больше {n} фото на запись"},
    "db_unavailable": {
        "uz": "Ma’lumotlar bazasiga ulanib bo‘lmadi. Vercel’da Storage → Neon bazasini loyihaga ulang (DATABASE_URL), so‘ng Redeploy qiling.",
        "ru": "Не удалось подключиться к базе данных. В Vercel подключите Storage → Neon (DATABASE_URL) и сделайте Redeploy.",
    },
    "db_error": {"uz": "Bazada xatolik yuz berdi", "ru": "Ошибка базы данных"},
    "not_found": {"uz": "Topilmadi", "ru": "Не найдено"},
    "invalid_data": {"uz": "Ma’lumot noto‘g‘ri", "ru": "Неверные данные"},
}


def tr(key: str, **kw) -> str:
    msg = MESSAGES[key].get(lang_var.get()) or MESSAGES[key]["uz"]
    return msg.format(**kw) if kw else msg


def http_error(status: int, key: str, **kw) -> HTTPException:
    return HTTPException(status, tr(key, **kw))


def pick_lang(header: str | None) -> str:
    return "ru" if (header or "").lower().startswith("ru") else "uz"
