import { useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { uz } from './uz';
import { ru } from './ru';

export type Lang = 'uz' | 'ru';
export type TKey = keyof typeof uz;
export type TVars = Record<string, string | number>;
export type TFn = (key: TKey, vars?: TVars) => string;

const DICTS: Record<Lang, Record<TKey, string>> = { uz, ru };
export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'uz', label: 'O‘zbekcha', short: 'UZ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
];

/** Berilgan tilda tarjima ({n} kabi o'rinlarni to'ldiradi). */
export function translate(lang: Lang, key: TKey, vars?: TVars): string {
  let s: string = DICTS[lang][key] ?? uz[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Komponentlar uchun: joriy tildagi `t()` funksiyasi. */
export function useT(): TFn {
  const lang = useAppSelector((s) => s.ui.lang);
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}

export const useLang = () => useAppSelector((s) => s.ui.lang);

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('qarz-lang');
    if (saved === 'uz' || saved === 'ru') return saved;
  } catch { /* storage yo'q */ }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'uz';
}

