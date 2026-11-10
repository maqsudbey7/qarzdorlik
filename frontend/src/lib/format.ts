import { store } from '../store';
import { translate, type TKey } from '../i18n';
import { longDate, monthLabel } from '../i18n/dates';

const lang = () => store.getState().ui.lang;
const tt = (key: TKey, vars?: Record<string, string | number>) => translate(lang(), key, vars);

const nf = new Intl.NumberFormat('ru-RU');
export const num = (n: number) => nf.format(Math.round(n || 0)).replace(/\s/g, ' ');
export const money = (n: number) => `${num(n)} ${tt('c.currency')}`;

/** 12.6 mln, 1.2 mlrd */
export function moneyShort(n: number): string {
  const a = Math.abs(n);
  const d = (x: number) => x.toFixed(1).replace('.0', '').replace('.', lang() === 'ru' ? ',' : '.');
  if (a >= 1e9) return `${d(n / 1e9)} ${tt('fmt.bln')}`;
  if (a >= 1e6) return `${d(n / 1e6)} ${tt('fmt.mln')}`;
  if (a >= 1e4) return `${Math.round(n / 1e3)} ${tt('fmt.k')}`;
  return num(n);
}

/** Pul kiritish maydoni: "1250000" → "1 250 000" */
export const groupDigits = (s: string) => s.replace(/\D/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const parseDigits = (s: string) => Number(s.replace(/\D/g, '')) || 0;

export const fmtDay = (d: string) => d.split('-').reverse().join('.');
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
export const fmtLongDate = (iso: string) => longDate(lang(), iso);
export const monthName = (m: number, short = true) => monthLabel(lang(), m, short);

/** "Bugun", "Kecha" yoki "10 noyabr 2026" */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return tt('c.today');
  if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return tt('c.yesterday');
  return fmtLongDate(iso);
}

/** <input type="datetime-local"> uchun mahalliy vaqt: 2026-11-10T14:30 */
export function toLocalInput(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function isoDay(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 864e5);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Muddatgacha qolgan kun (manfiy — o'tib ketgan). */
export const daysUntil = (day: string) => Math.round((new Date(`${day}T00:00:00`).getTime() - new Date(`${isoDay()}T00:00:00`).getTime()) / 864e5);
