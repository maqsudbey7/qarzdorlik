import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Copy, Download, EllipsisVertical, HelpCircle, PlusSquare, Share, X } from 'lucide-react';
import { isIOSNotSafari, promptInstall, useInstall } from '../lib/pwa';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';
import { useT, type TKey } from '../i18n';
import { Modal } from './ui';

const DISMISS_KEY = 'qarz-install-dismissed';
const dismissedRecently = () => {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 7 * 864e5; } catch { return false; }
};


/** Qayerni bosish kerakligini ko'rsatuvchi kichik "ekran" rasmi (haqiqiy tugma emas). */
function Pulse({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center rounded-lg bg-brand-600 px-2 py-1 font-semibold text-white ${className}`}>
      <span className="absolute -inset-1 animate-ping rounded-xl bg-brand-500/40" />
      <span className="relative inline-flex items-center gap-1">{children}</span>
    </span>
  );
}

function MockFrame({ children }: { children: ReactNode }) {
  return <div aria-hidden className="mt-2 select-none overflow-hidden rounded-2xl bg-slate-100 p-2.5 text-[11px] text-slate-500 ring-1 ring-slate-200">{children}</div>;
}

const IosBar = () => (
  <MockFrame>
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
      <span>‹</span><span>›</span><span className="truncate px-2 text-slate-400">qarzingniber…</span>
      <Pulse><Share size={13} /> / ⋯</Pulse>
    </div>
  </MockFrame>
);
const IosSheet = ({ label }: { label: string }) => (
  <MockFrame>
    <div className="space-y-1 rounded-xl bg-white p-2 shadow-sm">
      <div className="flex justify-between rounded-lg px-2 py-1"><span>Copy</span><Copy size={12} /></div>
      <div className="flex justify-between rounded-lg px-2 py-1"><span>Add Bookmark</span><span>☆</span></div>
      <div className="flex"><Pulse className="w-full justify-between"><span>{label}</span><PlusSquare size={13} /></Pulse></div>
    </div>
  </MockFrame>
);
const IosAdd = ({ label }: { label: string }) => (
  <MockFrame>
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
      <span className="text-brand-600">Cancel</span><span className="font-semibold text-slate-700">Qarzingniber</span><Pulse>{label}</Pulse>
    </div>
  </MockFrame>
);
const AndroidBar = () => (
  <MockFrame>
    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
      <span className="flex-1 truncate rounded-full bg-slate-100 px-2 py-0.5 text-slate-400">qarzingniber…</span>
      <Pulse><EllipsisVertical size={13} /></Pulse>
    </div>
  </MockFrame>
);
const AndroidMenu = ({ label }: { label: string }) => (
  <MockFrame>
    <div className="ml-auto w-4/5 space-y-1 rounded-xl bg-white p-2 shadow-sm">
      <div className="px-2 py-1">New tab</div><div className="px-2 py-1">History</div>
      <div className="flex"><Pulse className="w-full justify-start"><Download size={12} /> {label}</Pulse></div>
    </div>
  </MockFrame>
);
const AndroidConfirm = ({ label }: { label: string }) => (
  <MockFrame>
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2"><img src="/icons/icon-192.png" alt="" className="h-6 w-6 rounded" /><b className="text-slate-700">Qarzingniber</b></div>
      <div className="mt-2 flex justify-end gap-2"><span className="px-2 py-1">Cancel</span><Pulse>{label}</Pulse></div>
    </div>
  </MockFrame>
);

/** Qadam: raqam + matn (+ ichida kichik belgi). Bular tugma EMAS — shuning uchun oddiy matn ko'rinishida. */
function Step({ n, children, mock }: { n: number; children: ReactNode; mock?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{n}</span>
      <span className="min-w-0 flex-1 pt-0.5 text-[15px] leading-snug text-slate-700">{children}{mock}</span>
    </li>
  );
}

const Glyph = ({ children }: { children: ReactNode }) => (
  <span className="mx-0.5 inline-flex translate-y-[3px] items-center text-brand-600">{children}</span>
);

function CopyLinkButton() {
  const t = useT();
  const dispatch = useAppDispatch();
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.origin); dispatch(toast(t('c.copied'))); }
    catch { window.prompt(t('pwa.copyLink'), window.location.origin); }
  };
  return <button type="button" onClick={copy} className="btn-ghost w-full py-3"><Copy size={18} /> {t('pwa.copyLink')}</button>;
}

/** Qurilma va brauzerga mos yo'riqnoma. */
function Guide({ onInstalled }: { onInstalled: () => void }) {
  const t = useT();
  const s = useInstall();
  const dispatch = useAppDispatch();
  const install = async () => {
    const r = await promptInstall();
    if (r === 'accepted') { dispatch(toast(t('pwa.done'))); onInstalled(); }
  };
  const step = (k: TKey) => t(k);

  if (s.standalone || s.installed) return <p className="flex items-center gap-2 font-medium text-emerald-700"><CheckCircle2 size={20} /> {t('pwa.installed')}</p>;

  if (s.inApp) return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <div className="font-bold text-amber-900">{t('pwa.inApp.title')}</div>
        <p className="mt-1 text-sm text-amber-900">{t('pwa.inApp.text')}</p>
      </div>
      <ol className="space-y-3">
        <Step n={1}>{s.ios ? t('pwa.inApp.ios') : t('pwa.inApp.android')}</Step>
        <Step n={2}>{t('pwa.inApp.then')}</Step>
      </ol>
      <CopyLinkButton />
    </div>
  );

  if (s.ios) return (
    <div className="space-y-4">
      {isIOSNotSafari() && <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">{t('pwa.ios.notSafari')}</div>}
      <ol className="space-y-3.5">
        <Step n={1} mock={<IosBar />}>{step('pwa.ios.1')} <Glyph><Share size={17} /></Glyph></Step>
        <Step n={2} mock={<IosSheet label={t('pwa.ios.addLabel')} />}>{step('pwa.ios.2')} <Glyph><PlusSquare size={17} /></Glyph></Step>
        <Step n={3} mock={<IosAdd label={t('pwa.ios.addBtn')} />}>{step('pwa.ios.3')}</Step>
        <Step n={4}>{t('pwa.after')}</Step>
      </ol>
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{t('pwa.ios.note')}</p>
      {isIOSNotSafari() && <CopyLinkButton />}
    </div>
  );

  if (s.mobile) return (
    <div className="space-y-4">
      {s.canPrompt && <button type="button" onClick={install} className="btn-primary w-full py-3.5 text-base"><Download size={19} /> {t('pwa.install')}</button>}
      <ol className="space-y-3.5">
        <Step n={1} mock={<AndroidBar />}>{step('pwa.android.1')} <Glyph><EllipsisVertical size={17} /></Glyph></Step>
        <Step n={2} mock={<AndroidMenu label={t('pwa.android.menuLabel')} />}>{step('pwa.android.2')}</Step>
        <Step n={3} mock={<AndroidConfirm label={t('pwa.install')} />}>{step('pwa.android.3')}</Step>
        <Step n={4}>{t('pwa.after')}</Step>
      </ol>
    </div>
  );

  return (
    <div className="space-y-4">
      {s.canPrompt && <button type="button" onClick={install} className="btn-primary w-full py-3.5 text-base"><Download size={19} /> {t('pwa.install')}</button>}
      <p className="text-sm text-slate-600">{t('pwa.desktop')}</p>
    </div>
  );
}

export function InstallGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={<span className="flex items-center gap-2.5"><img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" /> {t('pwa.guideTitle')}</span>}>
      {open && <Guide onInstalled={onClose} />}
    </Modal>
  );
}

/** Asosiy tugma: brauzer o'rnatish oynasini ko'rsata olsa — o'rnatadi, bo'lmasa yo'riqnomani ochadi. */
function useInstallAction() {
  const t = useT();
  const s = useInstall();
  const dispatch = useAppDispatch();
  const [guide, setGuide] = useState(false);
  const run = async () => {
    if (s.canPrompt && !s.inApp) {
      const r = await promptInstall();
      if (r === 'accepted') { dispatch(toast(t('pwa.done'))); return; }
      if (r === 'dismissed') return;
    }
    setGuide(true);
  };
  const label = s.canPrompt && !s.inApp ? t('pwa.install') : t('pwa.how');
  const Icon = s.canPrompt && !s.inApp ? Download : HelpCircle;
  return { s, run, label, Icon, modal: <InstallGuideModal open={guide} onClose={() => setGuide(false)} /> };
}

/** Bosh sahifadagi taklif (telefonda; yopsa — 1 hafta ko'rinmaydi). */
export function InstallBanner() {
  const t = useT();
  const { s, run, label, Icon, modal } = useInstallAction();
  const [hidden, setHidden] = useState(dismissedRecently);
  const show = !hidden && s.mobile && !s.standalone && !s.installed;
  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* yo'q */ } setHidden(true); };

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="relative flex items-center gap-4 rounded-3xl bg-gradient-to-br from-brand-50 to-violet-50 p-4 ring-1 ring-brand-100">
              <img src="/icons/icon-192.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl shadow-lg shadow-brand-600/30" />
              <div className="min-w-0 flex-1 pr-7">
                <div className="font-bold text-slate-900">{t('pwa.title')}</div>
                <p className="mt-0.5 text-sm text-slate-600">{t('pwa.text')}</p>
                <button type="button" onClick={run} className="btn-primary mt-3 py-2.5"><Icon size={17} /> {label}</button>
              </div>
              <button type="button" onClick={dismiss} aria-label={t('pwa.later')} title={t('pwa.later')}
                className="absolute right-1.5 top-1.5 grid h-10 w-10 place-items-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-700"><X size={18} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {modal}
    </>
  );
}

/** Sozlamalardagi bo'lim — har doim ko'rinadi. */
export function InstallSection() {
  const t = useT();
  const { s, run, label, Icon, modal } = useInstallAction();
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl shadow-md" />
        <div className="font-bold">{t('pwa.section')}</div>
      </div>
      <div className="mt-4">
        {s.standalone || s.installed
          ? <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 size={18} /> {t('pwa.installed')}</p>
          : (<>
              <p className="text-sm text-slate-600">{t('pwa.text')}</p>
              <button type="button" onClick={run} className="btn-primary mt-3 w-full py-3"><Icon size={18} /> {label}</button>
            </>)}
      </div>
      {modal}
    </div>
  );
}

/** Landing: telefonda — har doim "O'rnatish / Qanday o'rnatiladi?" tugmasi. */
export function InstallButton({ className = '' }: { className?: string }) {
  const { s, run, label, Icon, modal } = useInstallAction();
  if (s.standalone || s.installed || !(s.mobile || s.canPrompt)) return null;
  return <><button type="button" onClick={run} className={className}><Icon size={18} /> {label}</button>{modal}</>;
}
