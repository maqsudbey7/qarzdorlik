import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Download, PlusSquare, Share, X } from 'lucide-react';
import { promptInstall, useInstall } from '../lib/pwa';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';
import { useT } from '../i18n';

const DISMISS_KEY = 'qarz-install-dismissed';
const dismissedRecently = () => {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 14 * 864e5; } catch { return false; }
};

function IosSteps() {
  const t = useT();
  return (
    <ol className="space-y-2 text-sm">
      <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/80 text-brand-600 ring-1 ring-brand-100"><Share size={16} /></span>{t('pwa.ios1')}</li>
      <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/80 text-brand-600 ring-1 ring-brand-100"><PlusSquare size={16} /></span>{t('pwa.ios2')}</li>
    </ol>
  );
}

/** Bosh sahifadagi taklif: "Ilovani o'rnating" (yopsa — 2 hafta ko'rinmaydi). */
export function InstallBanner() {
  const t = useT();
  const s = useInstall();
  const dispatch = useAppDispatch();
  const [hidden, setHidden] = useState(dismissedRecently);
  const show = !hidden && !s.standalone && !s.installed && (s.canPrompt || s.ios);
  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* yo'q */ } setHidden(true); };
  const install = async () => { if (await promptInstall()) dispatch(toast(t('pwa.done'))); };

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="relative flex gap-4 rounded-3xl bg-gradient-to-br from-brand-50 to-violet-50 p-4 ring-1 ring-brand-100">
            <img src="/icons/icon-192.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl shadow-lg shadow-brand-600/30" />
            <div className="min-w-0 flex-1 pr-6">
              <div className="font-bold text-slate-900">{s.ios ? t('pwa.iosTitle') : t('pwa.title')}</div>
              {s.ios ? <div className="mt-2"><IosSteps /></div> : (
                <>
                  <p className="mt-0.5 text-sm text-slate-600">{t('pwa.text')}</p>
                  <button onClick={install} className="btn-primary mt-3 py-2"><Download size={16} /> {t('pwa.install')}</button>
                </>
              )}
            </div>
            <button onClick={dismiss} aria-label={t('pwa.later')} title={t('pwa.later')} className="icon-btn absolute right-2 top-2 h-8 w-8"><X size={16} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Sozlamalardagi bo'lim — har doim ko'rinadi. */
export function InstallSection() {
  const t = useT();
  const s = useInstall();
  const dispatch = useAppDispatch();
  const install = async () => { if (await promptInstall()) dispatch(toast(t('pwa.done'))); };
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl shadow-md" />
        <div className="font-bold">{t('pwa.section')}</div>
      </div>
      <div className="mt-4">
        {s.standalone || s.installed ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 size={18} /> {t('pwa.installed')}</p>
        ) : s.canPrompt ? (
          <>
            <p className="text-sm text-slate-600">{t('pwa.text')}</p>
            <button onClick={install} className="btn-primary mt-3 w-full py-3"><Download size={18} /> {t('pwa.install')}</button>
          </>
        ) : s.ios ? <IosSteps /> : <p className="text-sm text-slate-600">{t('pwa.other')}</p>}
      </div>
    </div>
  );
}

/** Landing uchun: o'rnatish mumkin bo'lsa — tugma. */
export function InstallButton({ className = '' }: { className?: string }) {
  const t = useT();
  const s = useInstall();
  if (!s.canPrompt || s.standalone) return null;
  return <button onClick={() => promptInstall()} className={className}><Download size={18} /> {t('land.install')}</button>;
}
