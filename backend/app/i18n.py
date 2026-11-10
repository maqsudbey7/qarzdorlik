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
        "uz": "Server vaqtincha javob bermayapti. Ma’lumotlaringiz xavfsiz — bir daqiqadan so‘ng qayta urinib ko‘ring.",
        "ru": "Сервер временно не отвечает. Ваши данные в безопасности — попробуйте через минуту.",
    },
    "db_error": {"uz": "Saqlashda xatolik. Qayta urinib ko‘ring", "ru": "Ошибка при сохранении. Попробуйте ещё раз"},
    "not_found": {"uz": "Topilmadi", "ru": "Не найдено"},
    "invalid_data": {"uz": "Ma’lumot noto‘g‘ri", "ru": "Неверные данные"},
    "weak_password": {"uz": "Parol kamida 8 ta belgidan iborat bo‘lib, harf va raqam qatnashishi kerak",
                      "ru": "Пароль должен быть не короче 8 символов и содержать буквы и цифры"},
    "wrong_password": {"uz": "Parol noto‘g‘ri", "ru": "Неверный пароль"},
    "same_password": {"uz": "Yangi parol eskisidan farq qilishi kerak", "ru": "Новый пароль должен отличаться от старого"},
    "too_many_attempts": {"uz": "Juda ko‘p noto‘g‘ri urinish. {m} daqiqadan so‘ng qayta urinib ko‘ring",
                          "ru": "Слишком много неудачных попыток. Попробуйте через {m} мин."},
    "demo_forbidden": {"uz": "Demo hisobda bu amal o‘chirilgan", "ru": "В демо-аккаунте это действие отключено"},
    "server_error": {"uz": "Kutilmagan xatolik. Birozdan so‘ng qayta urinib ko‘ring", "ru": "Непредвиденная ошибка. Попробуйте чуть позже"},
    "v_missing": {"uz": "«{f}» to‘ldirilishi shart", "ru": "Заполните поле «{f}»"},
    "v_short": {"uz": "«{f}» kamida {n} ta belgi bo‘lsin", "ru": "«{f}»: минимум {n} символов"},
    "v_long": {"uz": "«{f}» juda uzun (ko‘pi bilan {n} ta belgi)", "ru": "«{f}» слишком длинное (максимум {n} символов)"},
    "v_number": {"uz": "«{f}» raqam bo‘lishi kerak", "ru": "«{f}» должно быть числом"},
    "v_min": {"uz": "«{f}» {n} dan kichik bo‘lmasin", "ru": "«{f}» не может быть меньше {n}"},
    "v_gt": {"uz": "«{f}» {n} dan katta bo‘lishi kerak", "ru": "«{f}» должно быть больше {n}"},
    "v_date": {"uz": "«{f}» sanasi noto‘g‘ri", "ru": "Неверная дата в поле «{f}»"},
    "v_choice": {"uz": "«{f}» uchun noto‘g‘ri qiymat", "ru": "Неверное значение поля «{f}»"},
    "v_bad": {"uz": "«{f}» noto‘g‘ri kiritilgan", "ru": "Поле «{f}» заполнено неверно"},
}

FIELDS: dict[str, tuple[str, str]] = {
    "name": ("Ism", "Имя"), "phone": ("Telefon", "Телефон"), "password": ("Parol", "Пароль"),
    "current_password": ("Joriy parol", "Текущий пароль"), "new_password": ("Yangi parol", "Новый пароль"),
    "shop_name": ("Do‘kon nomi", "Название магазина"), "note": ("Izoh", "Примечание"), "amount": ("Summa", "Сумма"),
    "happened_at": ("Sana", "Дата"), "due_date": ("Qaytarish muddati", "Срок возврата"), "kind": ("Turi", "Тип"),
    "direction": ("Yo‘nalish", "Направление"),
}


def field_label(key: str) -> str:
    pair = FIELDS.get(key)
    if not pair:
        return key
    return pair[1] if lang_var.get() == "ru" else pair[0]


def tr(key: str, **kw) -> str:
    msg = MESSAGES[key].get(lang_var.get()) or MESSAGES[key]["uz"]
    return msg.format(**kw) if kw else msg


def http_error(status: int, key: str, **kw) -> HTTPException:
    return HTTPException(status, tr(key, **kw))


def pick_lang(header: str | None) -> str:
    return "ru" if (header or "").lower().startswith("ru") else "uz"
