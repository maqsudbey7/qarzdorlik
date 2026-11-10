import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Eye } from 'lucide-react';
import { usePublic } from '../hooks/queries';
import { useT } from '../i18n';
import { CountUp, ErrorBox, LangSwitch, NumberBadge, Spinner } from '../components/ui';
import Timeline from '../components/Timeline';
import { money } from '../lib/format';

/** Mijoz o'z varag'ini havola orqali ko'radi (faqat o'qish). */
export default function PublicSheet() {
  const t = useT();
  const token = useParams().token ?? '';
  const { data: s, isPending, error } = usePublic(token);

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2 font-bold text-slate-700"><BookOpen size={18} className="text-brand-600" /> {t('pub.title')}</span>
        <LangSwitch />
      </header>
      <main className="mx-auto max-w-2xl space-y-5 px-4 pb-16">
        {isPending && <Spinner />}
        {error && <ErrorBox error={error} />}
        {s && (
          <>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-violet-800 p-6 text-white shadow-glow">
              <div className="bg-dots absolute inset-0 opacity-60" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <NumberBadge n={s.number} size="lg" tone="slate" />
                  <div className="min-w-0">
                    <div className="truncate text-xl font-extrabold">{s.name}</div>
                    <div className="text-sm text-brand-100">{t('pub.by', { shop: s.shop_name || s.owner_name })}</div>
                  </div>
                </div>
                <div className="mt-5 text-sm text-brand-100">{s.balance > 0 ? t('sheet.balance') : t('sheet.cleared')}</div>
                <div className="text-4xl font-extrabold tracking-tight"><CountUp value={s.balance} format={money} /></div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15"><div className="text-xs text-brand-100">{t('sheet.given')}</div><div className="font-bold">{money(s.total_debt)}</div></div>
                  <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15"><div className="text-xs text-brand-100">{t('sheet.paid')}</div><div className="font-bold">{money(s.total_paid)}</div></div>
                </div>
              </div>
            </motion.div>
            <p className="flex items-center gap-2 px-1 text-xs text-slate-500"><Eye size={14} /> {t('pub.readonly')}</p>
            <Timeline entries={s.entries} src={{ kind: 'public', token }} />
            <p className="pt-4 text-center text-xs text-slate-400">{t('pub.made')}</p>
          </>
        )}
      </main>
    </div>
  );
}
