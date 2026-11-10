import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Image, Wallet } from 'lucide-react';
import { useStats } from '../hooks/queries';
import { useT } from '../i18n';
import { dayLabel, money, moneyShort, monthName } from '../lib/format';
import { stagger } from '../lib/motion';
import { CountUp, ErrorBox, NumberBadge, Skeleton } from '../components/ui';

export default function Reports() {
  const t = useT();
  const nowYear = new Date().getFullYear();
  const [year, setYear] = useState(nowYear);
  const { data: s, isPending, error } = useStats(year === nowYear ? undefined : year);
  const [hover, setHover] = useState<number | null>(null);

  if (error) return <ErrorBox error={error} />;
  if (isPending || !s) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-72" /></div>;
  const max = Math.max(1, ...s.monthly.flatMap((m) => [m.given, m.paid]));
  const curMonth = new Date().getMonth() + 1;

  const cards = [
    { icon: Wallet, label: t('rep.outstanding'), value: s.outstanding, sub: '', cls: 'from-brand-500 to-violet-600' },
    { icon: AlertTriangle, label: t('rep.overdue'), value: s.overdue_amount, sub: t('rep.overdueSub', { n: s.overdue_count }), cls: 'from-rose-500 to-pink-600' },
    { icon: ArrowUpRight, label: t('rep.monthGiven'), value: s.month_given, sub: '', cls: 'from-amber-400 to-orange-500' },
    { icon: ArrowDownLeft, label: t('rep.monthPaid'), value: s.month_paid, sub: '', cls: 'from-emerald-500 to-teal-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('rep.title')}</h1>

      <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <motion.div key={c.label} variants={stagger.item} className="card flex flex-col p-4">
            <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${c.cls} text-white shadow-lg`}><c.icon size={19} /></div>
            <div className="mt-3 text-xs text-slate-500 sm:text-sm">{c.label}</div>
            <div className="text-lg font-extrabold tracking-tight sm:text-2xl"><CountUp value={c.value} format={(n) => `${moneyShort(n)} ${t('c.currency')}`} /></div>
            {c.sub && <div className="text-[11px] text-slate-400">{c.sub}</div>}
          </motion.div>
        ))}
      </motion.div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">{t('rep.chart')}</h2>
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button className="icon-btn h-8 w-8" onClick={() => setYear(year - 1)} aria-label="←"><ChevronLeft size={18} /></button>
            <span className="w-14 text-center font-bold tabular-nums">{year}</span>
            <button className="icon-btn h-8 w-8" disabled={year >= nowYear} onClick={() => setYear(year + 1)} aria-label="→"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-rose-50 p-3"><div className="flex items-center gap-1.5 text-rose-700"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> {t('rep.yearGiven', { y: year })}</div><div className="mt-0.5 text-lg font-extrabold text-rose-700">{money(s.year_given)}</div></div>
          <div className="rounded-2xl bg-emerald-50 p-3"><div className="flex items-center gap-1.5 text-emerald-700"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {t('rep.yearPaid', { y: year })}</div><div className="mt-0.5 text-lg font-extrabold text-emerald-700">{money(s.year_paid)}</div></div>
        </div>
        <div className="relative mt-6 flex h-52 items-end gap-1 sm:gap-2" onMouseLeave={() => setHover(null)}>
          {[0.25, 0.5, 0.75, 1].map((g) => <div key={g} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-100" style={{ bottom: `${g * 100}%` }} />)}
          {s.monthly.map((m, i) => (
            <div key={m.month} className="relative flex h-full flex-1 cursor-pointer items-end justify-center gap-[2px]" onMouseEnter={() => setHover(i)} onClick={() => setHover(hover === i ? null : i)}>
              <motion.div className="w-1/2 max-w-3 rounded-t-md bg-rose-400" initial={{ height: 0 }} animate={{ height: `${Math.max(1.5, (m.given / max) * 100)}%` }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 140, damping: 18 }} style={{ opacity: hover === null || hover === i ? 1 : 0.35 }} />
              <motion.div className="w-1/2 max-w-3 rounded-t-md bg-emerald-500" initial={{ height: 0 }} animate={{ height: `${Math.max(1.5, (m.paid / max) * 100)}%` }}
                transition={{ delay: i * 0.03 + 0.05, type: 'spring', stiffness: 140, damping: 18 }} style={{ opacity: hover === null || hover === i ? 1 : 0.35 }} />
              {hover === i && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className={`pointer-events-none absolute bottom-full z-10 mb-2 w-40 rounded-xl bg-ink-900 p-3 text-xs text-white shadow-xl ${i > 5 ? 'right-0' : 'left-0'}`}>
                  <div className="mb-1 font-semibold capitalize">{monthName(m.month, false)} {year}</div>
                  <div className="flex justify-between"><span className="text-rose-300">{t('rep.given')}</span><span>{moneyShort(m.given)}</span></div>
                  <div className="flex justify-between"><span className="text-emerald-300">{t('rep.paid')}</span><span>{moneyShort(m.paid)}</span></div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1 sm:gap-2">
          {s.monthly.map((m) => <div key={m.month} className={`flex-1 text-center text-[10px] capitalize ${year === nowYear && m.month === curMonth ? 'font-bold text-brand-600' : 'text-slate-400'}`}>{monthName(m.month)}</div>)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">{t('rep.top')}</h2>
          <div className="mt-3 space-y-3">
            {!s.top.length && <p className="py-6 text-center text-sm text-slate-400">{t('rep.noData')}</p>}
            {s.top.map((d, i) => (
              <Link key={d.id} to={`/app/q/${d.id}`} className="block rounded-xl p-1 transition hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <NumberBadge n={d.number} size="sm" tone={d.overdue ? 'rose' : 'brand'} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{d.name}</span>
                  <span className="text-sm font-bold tabular-nums text-rose-600">{money(d.balance)}</span>
                </div>
                <div className="ml-12 mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }}
                    animate={{ width: `${(d.balance / Math.max(1, s.top[0].balance)) * 100}%` }} transition={{ delay: 0.2 + i * 0.06, duration: 0.6 }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-bold">{t('rep.recent')}</h2>
          <div className="mt-2 divide-y divide-slate-100">
            {!s.recent.length && <p className="py-6 text-center text-sm text-slate-400">{t('rep.noData')}</p>}
            {s.recent.map((e) => (
              <Link key={e.id} to={`/app/q/${e.debtor_id}`} className="flex items-center gap-3 py-2.5 transition hover:opacity-80">
                <span className="w-9 shrink-0 text-xs font-bold text-slate-400">#{e.debtor_number}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{e.debtor_name}</span><span className="text-xs text-slate-400">{dayLabel(e.happened_at)}</span></span>
                {e.photos > 0 && <Image size={14} className="text-slate-400" />}
                <span className={`text-sm font-bold tabular-nums ${e.kind === 'debt' ? 'text-rose-600' : 'text-emerald-600'}`}>{e.kind === 'debt' ? '+' : '−'}{moneyShort(e.amount)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
