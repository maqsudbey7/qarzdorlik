import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useInView } from 'motion/react';
import { AlertCircle, CheckCircle2, X, type LucideProps } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setLang } from '../store/uiSlice';
import { LANGS, useT } from '../i18n';
import { num } from '../lib/format';

// ---------- Logo ----------
/** Qarzingniber belgisi: "Q" harfi, dumi — qaytib keladigan pul strelkasi. */
export function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M14.5 14.5 19.5 19.5" />
      <path d="M19.5 14.5v5h-5" />
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  const t = useT();
  return (
    <span className="flex items-center gap-2.5 font-extrabold tracking-tight">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-600 to-violet-700 text-white shadow-glow">
        <LogoMark size={19} />
      </span>
      <span className={`text-lg ${dark ? 'text-white' : 'text-slate-900'}`}>{t('app.name')}</span>
    </span>
  );
}

/** Varaq raqami: #12 */
export function NumberBadge({ n, size = 'md', tone = 'brand' }: { n: number; size?: 'sm' | 'md' | 'lg'; tone?: 'brand' | 'rose' | 'emerald' | 'slate' }) {
  const s = { sm: 'h-9 min-w-9 text-xs', md: 'h-11 min-w-11 text-sm', lg: 'h-14 min-w-14 text-lg' }[size];
  const c = {
    brand: 'bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-md shadow-brand-600/25',
    rose: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-600/25',
    emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    slate: 'bg-slate-100 text-slate-500',
  }[tone];
  return <span className={`grid shrink-0 place-items-center rounded-2xl px-2 font-extrabold tabular-nums ${s} ${c}`}>#{n}</span>;
}

// ---------- Yuklanish / bo'sh / xato ----------
export const Spinner = ({ className = 'py-24' }: { className?: string }) => (
  <div className={`grid place-items-center ${className}`}>
    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
  </div>
);

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`relative overflow-hidden rounded-2xl bg-slate-200/70 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

export function Empty({ icon: Icon, title, text, children }: { icon: ComponentType<LucideProps>; title: string; text?: string; children?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col items-center px-6 py-14 text-center">
      <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600">
        <Icon size={28} />
      </motion.div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {children && <div className="mt-6">{children}</div>}
    </motion.div>
  );
}

export const ErrorBox = ({ error, className = '' }: { error: Error; className?: string }) => (
  <div className={`flex items-start gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100 ${className}`}>
    <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error.message}</span>
  </div>
);

// ---------- Toast ----------
export function Toasts() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
      <AnimatePresence>
        {toasts.map((x) => (
          <motion.div key={x.id} layout initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-ink-900/95 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur">
            {x.type === 'err' ? <AlertCircle size={18} className="text-rose-400" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
            {x.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------- Modal (telefonda pastdan chiqadi) ----------
/** Telefonda klaviatura ochilganda ko'rinadigan maydon (iPhone'da klaviatura sahifani "yopib qo'yadi"). */
function useVisualViewport(active: boolean) {
  const [vv, setVv] = useState<{ h: number; top: number } | null>(null);
  useEffect(() => {
    const v = window.visualViewport;
    if (!active || !v) return;
    const upd = () => setVv({ h: v.height, top: v.offsetTop });
    upd();
    v.addEventListener('resize', upd);
    v.addEventListener('scroll', upd);
    return () => { v.removeEventListener('resize', upd); v.removeEventListener('scroll', upd); setVv(null); };
  }, [active]);
  return vv;
}

/** Yozish maydoni bosilganda — uni klaviatura ustida, ko'rinadigan joyga suramiz. */
function revealFocused(e: React.FocusEvent<HTMLElement>) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
  if (['checkbox', 'radio', 'file'].includes((el as HTMLInputElement).type)) return;
  setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  const t = useT();
  const vv = useVisualViewport(open);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-x-0 top-0 z-50 flex h-dvh items-end justify-center sm:items-center sm:p-4"
          style={vv ? { top: vv.top, height: vv.h } : undefined} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={`relative flex max-h-[96%] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 sm:px-6">
              <h2 className="min-w-0 text-lg font-bold">{title}</h2>
              <button type="button" className="icon-btn shrink-0" onClick={onClose} aria-label={t('c.close')}><X size={20} /></button>
            </div>
            <div className="pb-safe flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6" onFocus={revealFocused}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ---------- Animatsiyali son ----------
export function CountUp({ value, format = num, className = '' }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(from.current, value, { duration: 1, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setShown(v) });
    from.current = value;
    return () => c.stop();
  }, [value, inView]);
  return <span ref={ref} className={`tabular-nums ${className}`}>{format(shown)}</span>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

// ---------- Til almashtirgich ----------
export function LangSwitch({ dark = false }: { dark?: boolean }) {
  const lang = useAppSelector((s) => s.ui.lang);
  const dispatch = useAppDispatch();
  return (
    <div className={`inline-flex rounded-lg p-0.5 text-xs font-bold ${dark ? 'bg-white/10' : 'bg-slate-100'}`} role="group" aria-label="Til / Язык">
      {LANGS.map((l) => (
        <button key={l.code} type="button" title={l.label} onClick={() => dispatch(setLang(l.code))}
          className={`relative rounded-md px-2.5 py-1 transition ${lang === l.code ? 'text-slate-900' : dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
          {lang === l.code && <motion.span layoutId={`lang-${dark ? 'd' : 'l'}`} className="absolute inset-0 rounded-md bg-white shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
          <span className="relative">{l.short}</span>
        </button>
      ))}
    </div>
  );
}
