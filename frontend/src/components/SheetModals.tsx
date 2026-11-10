import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Link2, MessageCircle, MessageSquare, RefreshCw, Send } from 'lucide-react';
import { useResetShare } from '../hooks/queries';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toast } from '../store/uiSlice';
import { LANGS, translate, useT, type Lang } from '../i18n';
import { fmtDay, num } from '../lib/format';
import type { DebtorDetail } from '../types/api';
import { Modal } from './ui';
import { shareUrl } from '../lib/share';


async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function buildMessage(lang: Lang, d: DebtorDetail, shop: string, withLink: boolean) {
  const due = d.next_due ? translate(lang, 'rem.due', { d: fmtDay(d.next_due) }) : '';
  const msg = translate(lang, 'rem.msg', { name: d.name, shop, rest: num(d.balance), due });
  return withLink ? `${msg}\n${translate(lang, 'rem.link', { url: shareUrl(d.share_token) })}` : msg;
}

/** Mijozga eslatma: SMS / WhatsApp / Telegram orqali tayyor matn. */
export function RemindModal({ debtor, open, onClose }: { debtor: DebtorDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t('rem.title')}>
      {open && <RemindBody debtor={debtor} />}
    </Modal>
  );
}

function RemindBody({ debtor }: { debtor: DebtorDetail }) {
  const t = useT();
  const dispatch = useAppDispatch();
  const uiLang = useAppSelector((s) => s.ui.lang);
  const user = useAppSelector((s) => s.auth.user);
  const shop = user?.shop_name || user?.name || '';
  const [lang, setLang] = useState<Lang>(uiLang);
  const [withLink, setWithLink] = useState(true);
  const [text, setText] = useState(() => buildMessage(uiLang, debtor, shop, true));
  useEffect(() => { setText(buildMessage(lang, debtor, shop, withLink)); }, [lang, withLink, debtor, shop]);

  const phone = debtor.phone.replace(/[^\d+]/g, '');
  const enc = encodeURIComponent(text);
  const links = phone ? [
    { label: 'SMS', icon: MessageSquare, href: `sms:${phone}?body=${enc}`, cls: 'bg-slate-900 hover:bg-slate-800' },
    { label: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/${phone.replace('+', '')}?text=${enc}`, cls: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Telegram', icon: Send, href: `https://t.me/share/url?url=${encodeURIComponent(withLink ? shareUrl(debtor.share_token) : ' ')}&text=${enc}`, cls: 'bg-sky-500 hover:bg-sky-600' },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{t('rem.lang')}</span>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
          {LANGS.map((l) => (
            <button key={l.code} type="button" onClick={() => setLang(l.code)}
              className={`rounded-md px-3 py-1.5 transition ${lang === l.code ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{l.label}</button>
          ))}
        </div>
      </div>
      <textarea rows={5} className="input leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={withLink} onChange={(e) => setWithLink(e.target.checked)} /> {t('rem.withLink')}
      </label>
      {!phone && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('rem.noPhone')}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={`btn py-3 text-white ${l.cls}`}><l.icon size={18} /> {l.label}</a>
        ))}
        <button type="button" className={`btn-ghost py-3 ${phone ? '' : 'col-span-2 sm:col-span-4'}`}
          onClick={async () => { if (await copyText(text)) dispatch(toast(t('c.copied'))); }}><Copy size={18} /> {t('c.copy')}</button>
      </div>
    </div>
  );
}

/** Mijoz uchun ochiq havola (faqat ko'rish). */
export function ShareModal({ debtor, open, onClose }: { debtor: DebtorDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const dispatch = useAppDispatch();
  const reset = useResetShare();
  const url = shareUrl(debtor.share_token);
  return (
    <Modal open={open} onClose={onClose} title={t('share.title')}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{t('share.text')}</p>
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200">
          <Link2 size={18} className="ml-2 shrink-0 text-brand-600" />
          <input readOnly value={url} className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none" onFocus={(e) => e.target.select()} />
          <button type="button" className="btn-primary px-3 py-2" onClick={async () => { if (await copyText(url)) dispatch(toast(t('c.copied'))); }}><Copy size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a href={url} target="_blank" rel="noreferrer" className="btn-ghost"><ExternalLink size={16} /> {t('share.open')}</a>
          <button type="button" className="btn-ghost" disabled={reset.isPending}
            onClick={() => { if (confirm(t('share.resetHint'))) reset.mutate(debtor.id, { onSuccess: () => dispatch(toast(t('share.resetDone'))) }); }}>
            <RefreshCw size={16} className={reset.isPending ? 'animate-spin' : ''} /> {t('share.reset')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
