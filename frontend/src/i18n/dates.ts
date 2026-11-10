import type { Lang } from '.';

// Oy nomlari qo'lda: ba'zi brauzerlarda o'zbekcha lokal yo'q ("2026 M11 10" chiqib qoladi)
const MONTHS: Record<Lang, { full: string[]; gen: string[]; short: string[] }> = {
  uz: {
    full: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
    gen: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
    short: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
  },
  ru: {
    full: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
    gen: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    short: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  },
};

const toDate = (d: string | Date) => (d instanceof Date ? d : new Date(d.length === 10 ? `${d}T12:00:00` : d));

/** 10-noyabr 2026 / 10 ноября 2026 */
export function longDate(lang: Lang, d: string | Date, withYear = true): string {
  const x = toDate(d);
  const m = MONTHS[lang].gen[x.getMonth()];
  const day = lang === 'uz' ? `${x.getDate()}-${m}` : `${x.getDate()} ${m}`;
  return withYear ? `${day} ${x.getFullYear()}` : day;
}

/** Oy nomi: 11 → "noyabr" / "ноябрь" (short: "noy" / "ноя") */
export const monthLabel = (lang: Lang, month: number, short = false) => MONTHS[lang][short ? 'short' : 'full'][month - 1];
