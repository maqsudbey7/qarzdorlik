import { Component, useEffect, useState, useSyncExternalStore, type ErrorInfo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react';
import { store } from '../store';
import { translate, useT } from '../i18n';

// ---------- Tasdiqlash oynasi (brauzerning xunuk confirm() o'rniga) ----------
interface Ask { title?: string; text: string; yes?: string; resolve: (ok: boolean) => void }
let current: Ask | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** `if (await confirmAsk({ text })) …` — chiroyli tasdiqlash oynasi. */
export function confirmAsk(opts: Omit<Ask, 'resolve'>): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => { current = { ...opts, resolve }; emit(); });
}

function answer(ok: boolean) {
  current?.resolve(ok);
  current = null;
  emit();
}

export function ConfirmHost() {
  const ask = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => current);
  const t = useT();
  useEffect(() => {
    if (!ask) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') answer(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [ask]);
  return createPortal(
    <AnimatePresence>
      {ask && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => answer(false)} />
          <motion.div role="alertdialog" aria-modal="true" initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }} className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 size={24} /></div>
            <h2 className="mt-4 text-lg font-bold">{ask.title ?? t('confirm.title')}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{ask.text}</p>
            <p className="mt-1 text-xs text-slate-400">{t('confirm.irreversible')}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="btn-soft py-3" onClick={() => answer(false)} autoFocus>{t('c.cancel')}</button>
              <button className="btn bg-rose-600 py-3 text-white hover:bg-rose-700" onClick={() => answer(true)}>{ask.yes ?? t('confirm.yes')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ---------- Kutilmagan xato: oq ekran o'rniga tushunarli oyna ----------
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    const lang = store.getState().ui.lang;
    // Yangi versiya chiqqanda eski fayl topilmasa — bir marta avtomatik yangilaymiz
    const chunk = /dynamically imported module|Failed to fetch|Loading chunk/i.test(this.state.error.message);
    if (chunk && !sessionStorage.getItem('reloaded')) { sessionStorage.setItem('reloaded', '1'); location.reload(); return null; }
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-600"><AlertTriangle size={30} /></div>
          <h1 className="mt-5 text-2xl font-extrabold">{translate(lang, 'err.crashTitle')}</h1>
          <p className="mt-2 text-slate-600">{translate(lang, 'err.crashText')}</p>
          <button className="btn-primary mt-6 px-6 py-3" onClick={() => { location.href = '/app'; }}><RefreshCw size={18} /> {translate(lang, 'err.reload')}</button>
        </div>
      </div>
    );
  }
}

// ---------- Parol maydoni: ko'rsatish/yashirish + kuchlilik ----------
export function passwordScore(p: string): 0 | 1 | 2 | 3 {
  if (p.length < 8 || !/[a-zA-Zа-яА-Я]/.test(p) || !/\d/.test(p)) return 0;
  let s = 1;
  if (p.length >= 10) s++;
  if (/[A-ZА-Я]/.test(p) && /[a-zа-я]/.test(p) || /[^a-zA-Z0-9а-яА-Я]/.test(p)) s++;
  return Math.min(s, 3) as 1 | 2 | 3;
}

interface PwProps { id?: string; value: string; onChange: (v: string) => void; placeholder?: string; meter?: boolean; autoComplete?: string; className?: string }
export function PasswordInput({ id, value, onChange, placeholder, meter, autoComplete, className = 'py-3' }: PwProps) {
  const [show, setShow] = useState(false);
  const t = useT();
  const score = passwordScore(value);
  const bar = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'][score];
  return (
    <div>
      <div className="relative">
        <input id={id} required type={show ? 'text' : 'password'} className={`input pr-11 ${className}`} value={value} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        <button type="button" className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:text-slate-700"
          onClick={() => setShow(!show)} aria-label={t(show ? 'pw.hide' : 'pw.show')} title={t(show ? 'pw.hide' : 'pw.show')}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {meter && value && (
        <div className="mt-2">
          <div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score - 1 || (score === 0 && i === 0) ? bar : 'bg-slate-200'}`} />)}</div>
          <div className={`mt-1 text-xs font-medium ${score === 0 ? 'text-rose-600' : score === 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {t(`pw.s${score}`)}{score === 0 && ` — ${t('pw.rule')}`}
          </div>
        </div>
      )}
    </div>
  );
}
