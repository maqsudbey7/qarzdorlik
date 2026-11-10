import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, BookOpen, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { useDebtors, useStats } from '../hooks/queries';
import { useAppSelector } from '../store/hooks';
import { useT, type TKey } from '../i18n';
import { dayLabel, daysUntil, money, moneyShort } from '../lib/format';
import type { DebtorFilter, DebtorSort, DebtorSummary } from '../types/api';
import { CountUp, Empty, ErrorBox, NumberBadge, Skeleton } from '../components/ui';
import { InstallBanner } from '../components/InstallCard';

const FILTERS: [DebtorFilter, TKey][] = [['all', 'home.f.all'], ['debt', 'home.f.debt'], ['overdue', 'home.f.overdue'], ['clear', 'home.f.clear']];
const SORTS: DebtorSort[] = ['recent', 'balance', 'name', 'number'];

export function DueChip({ d }: { d: Pick<DebtorSummary, 'next_due' | 'balance'> }) {
  const t = useT();
  if (!d.next_due || d.balance <= 0) return null;
  const n = daysUntil(d.next_due);
  if (n < 0) return <span className="badge bg-rose-50 text-rose-700 ring-1 ring-rose-200"><span className="relative flex h-1.5 w-1.5"><span className="absolute h-full w-full animate-pulsering rounded-full bg-rose-500" /><span className="relative h-1.5 w-1.5 rounded-full bg-rose-500" /></span>{t('st.overdueDays', { n: -n })}</span>;
  if (n === 0) return <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200">{t('st.dueToday')}</span>;
  if (n <= 7) return <span className="badge bg-sky-50 text-sky-700 ring-1 ring-sky-200">{t('st.dueIn', { n })}</span>;
  return null;
}

export function DebtorRow({ d, i = 0 }: { d: DebtorSummary; i?: number }) {
  const t = useT();
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
      <Link to={`/app/q/${d.id}`} className="card group flex items-center gap-3.5 p-3.5 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4">
        <NumberBadge n={d.number} tone={d.overdue ? 'rose' : d.balance > 0 ? 'brand' : 'slate'} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{d.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{d.last_entry_at ? dayLabel(d.last_entry_at) : t('home.noEntries')}</span>
            {d.phone && <span className="hidden sm:inline">· {d.phone}</span>}
            <DueChip d={d} />
          </div>
        </div>
        <div className="text-right">
          {d.balance > 0
            ? <div className={`font-extrabold tabular-nums ${d.overdue ? 'text-rose-600' : 'text-slate-900'}`}>{money(d.balance)}</div>
            : <span className="badge bg-emerald-50 text-emerald-700"><CheckCircle2 size={12} /> {t('home.cleared')}</span>}
        </div>
        <ChevronRight size={18} className="hidden shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 sm:block" />
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const t = useT();
  const user = useAppSelector((s) => s.auth.user);
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const filter = (sp.get('f') as DebtorFilter) || 'all';
  const sort = (sp.get('s') as DebtorSort) || 'recent';
  const set = (patch: Record<string, string>) => {
    const n = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k); }
    setSp(n, { replace: true });
  };

  const stats = useStats().data;
  const debtors = useDebtors({ q: q || undefined, filter, sort });
  const emptyBook = stats && stats.debtors_total === 0;

  return (
    <div className="space-y-5">
      <p className="text-sm font-medium text-slate-500">{t('home.hello', { name: user?.name.split(' ')[0] ?? '' })}</p>
      <InstallBanner />

      {/* Jami qarz kartochkasi */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-violet-800 p-5 text-white shadow-glow sm:p-7">
        <div className="bg-dots absolute inset-0 opacity-60" />
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="text-sm text-brand-100">{t('home.total')}</div>
          <div className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {stats ? <CountUp value={stats.outstanding} format={(n) => moneyShort(n)} /> : '…'} <span className="text-lg font-semibold text-brand-200">{t('c.currency')}</span>
          </div>
          <div className="mt-1 text-sm text-brand-100">{t('home.totalSub', { n: stats?.debtors_with_debt ?? 0 })}</div>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
              <div className="flex items-center gap-1 text-[11px] text-brand-100"><ArrowUpRight size={13} /> {t('home.monthGiven')}</div>
              <div className="mt-0.5 font-bold">{stats ? moneyShort(stats.month_given) : '…'}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
              <div className="flex items-center gap-1 text-[11px] text-brand-100"><ArrowDownLeft size={13} /> {t('home.monthPaid')}</div>
              <div className="mt-0.5 font-bold">{stats ? moneyShort(stats.month_paid) : '…'}</div>
            </div>
            {!!stats?.overdue_count && (
              <button onClick={() => set({ f: 'overdue' })} className="col-span-2 flex items-center justify-between rounded-2xl bg-rose-500/90 p-3 text-left ring-1 ring-white/20 sm:col-span-1 sm:block">
                <div className="flex items-center gap-1 text-[11px] text-rose-50"><AlertTriangle size={13} /> {t('home.overdue')}</div>
                <div className="font-bold">{moneyShort(stats.overdue_amount)} · {stats.overdue_count}</div>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {emptyBook ? (
        <Empty icon={BookOpen} title={t('home.emptyTitle')} text={t('home.emptyText')}>
          <ol className="space-y-2 text-left text-sm text-slate-600">
            {(['home.how1', 'home.how2', 'home.how3'] as TKey[]).map((k, i) => (
              <li key={k} className="flex items-center gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>{t(k)}</li>
            ))}
          </ol>
        </Empty>
      ) : (
        <>
          {/* Qidiruv va filtrlar */}
          <div className="top-header sticky z-20 -mx-4 space-y-3 bg-slate-50/90 px-4 py-2 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="relative">
              <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" className="input rounded-2xl py-3.5 pl-12 text-base shadow-soft" placeholder={t('home.searchPh')} value={q} onChange={(e) => set({ q: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <div className="no-scrollbar -mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1">
                {FILTERS.map(([k, l]) => (
                  <button key={k} onClick={() => set({ f: k === 'all' ? '' : k })}
                    className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${filter === k ? 'text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
                    {filter === k && <motion.span layoutId="home-filter" className={`absolute inset-0 rounded-full ${k === 'overdue' ? 'bg-rose-600' : k === 'clear' ? 'bg-emerald-600' : 'bg-ink-900'}`} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <span className="relative">{t(l)}</span>
                  </button>
                ))}
              </div>
              <select className="input w-auto shrink-0 py-1.5 text-xs" value={sort} onChange={(e) => set({ s: e.target.value === 'recent' ? '' : e.target.value })} aria-label="Sort">
                {SORTS.map((s) => <option key={s} value={s}>{t(`home.sort.${s}`)}</option>)}
              </select>
            </div>
          </div>

          {debtors.error && <ErrorBox error={debtors.error} />}
          {debtors.isPending ? (
            <div className="space-y-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px]" />)}</div>
          ) : !debtors.data?.length ? (
            <Empty icon={Search} title={q ? t('c.nothing') : t('home.emptyFiltered')} />
          ) : (
            <div className="space-y-2.5">{debtors.data.map((d, i) => <DebtorRow key={d.id} d={d} i={i} />)}</div>
          )}
        </>
      )}
    </div>
  );
}
