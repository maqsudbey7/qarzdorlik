import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, BellRing, Link2, Minus, Pencil, Phone, Plus, ScrollText, Trash2 } from 'lucide-react';
import { useDebtor, useDeleteDebtor } from '../hooks/queries';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';
import { useT } from '../i18n';
import { fmtLongDate, money } from '../lib/format';
import type { Entry, EntryKind } from '../types/api';
import { CountUp, Empty, ErrorBox, NumberBadge, Skeleton } from '../components/ui';
import EntryModal from '../components/EntryForm';
import { DebtorFormModal } from '../components/DebtorForms';
import { RemindModal, ShareModal } from '../components/SheetModals';
import Timeline from '../components/Timeline';
import { DueChip } from './Home';

export default function Debtor() {
  const t = useT();
  const id = Number(useParams().id);
  const { state } = useLocation() as { state: { add?: EntryKind } | null };
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const { data: d, isPending, error } = useDebtor(id);
  const del = useDeleteDebtor();
  const [adding, setAdding] = useState<EntryKind | null>(state?.add ?? null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [editDebtor, setEditDebtor] = useState(false);
  const [remind, setRemind] = useState(false);
  const [share, setShare] = useState(false);

  // "Qarz yozish" dan kelganda — oyna bir marta ochiladi (orqaga qaytganda qayta ochilmasin)
  useEffect(() => { if (state?.add) nav('.', { replace: true, state: null }); }, [state, nav]);

  if (isPending) return <div className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-56" /><Skeleton className="h-24" /></div>;
  if (error || !d) return <ErrorBox error={error ?? new Error(t('c.notFound'))} />;

  const remove = () => {
    if (confirm(t('sheet.confirmDelete', { n: d.number, name: d.name })))
      del.mutate(d.id, { onSuccess: () => { dispatch(toast(t('sheet.deleted'))); nav('/app', { replace: true }); } });
  };
  const owes = d.balance > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/app" className="icon-btn -ml-2" aria-label={t('c.back')}><ArrowLeft size={20} /></Link>
        <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
          <NumberBadge n={d.number} size="lg" tone={d.overdue ? 'rose' : owes ? 'brand' : 'emerald'} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{d.name}</h1>
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
            {d.phone ? <a href={`tel:${d.phone}`} className="font-medium text-brand-600">{d.phone}</a> : <span>—</span>}
            <span className="text-xs">· {t('sheet.since', { d: fmtLongDate(d.created_at) })}</span>
          </div>
        </div>
        <button className="icon-btn" aria-label={t('sheet.editDebtor')} title={t('sheet.editDebtor')} onClick={() => setEditDebtor(true)}><Pencil size={18} /></button>
        <button className="icon-btn hover:bg-rose-50 hover:text-rose-600" aria-label={t('sheet.deleteDebtor')} title={t('sheet.deleteDebtor')} onClick={remove}><Trash2 size={18} /></button>
      </div>
      {d.note && <p className="-mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{d.note}</p>}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className={`p-5 sm:p-6 ${owes ? 'bg-gradient-to-br from-rose-50 to-white' : 'bg-gradient-to-br from-emerald-50 to-white'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm font-medium text-slate-500">{owes ? t('sheet.balance') : t('sheet.cleared')}</div>
            <DueChip d={d} />
          </div>
          <div className={`mt-1 text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl ${owes ? 'text-rose-600' : 'text-emerald-600'}`}>
            <CountUp value={d.balance} format={money} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-100"><div className="text-xs text-slate-500">{t('sheet.given')}</div><div className="font-bold tabular-nums">{money(d.total_debt)}</div></div>
            <div className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-100"><div className="text-xs text-slate-500">{t('sheet.paid')}</div><div className="font-bold tabular-nums text-emerald-700">{money(d.total_paid)}</div></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
          <button className="btn-debt py-3.5 text-base" onClick={() => setAdding('debt')}><Plus size={20} /> {t('sheet.addDebt')}</button>
          <button className="btn-pay py-3.5 text-base" disabled={!owes} onClick={() => setAdding('payment')}><Minus size={20} /> {t('sheet.addPayment')}</button>
        </div>
        <div className="grid grid-cols-3 border-t border-slate-100 text-sm font-semibold text-slate-600">
          <a href={d.phone ? `tel:${d.phone}` : undefined} aria-disabled={!d.phone}
            className={`flex flex-col items-center gap-1 py-3 transition hover:bg-slate-50 ${d.phone ? '' : 'pointer-events-none opacity-40'}`}><Phone size={18} /> {t('sheet.call')}</a>
          <button onClick={() => setRemind(true)} disabled={!owes} className="flex flex-col items-center gap-1 border-x border-slate-100 py-3 transition hover:bg-slate-50 disabled:opacity-40"><BellRing size={18} /> {t('sheet.remind')}</button>
          <button onClick={() => setShare(true)} className="flex flex-col items-center gap-1 py-3 transition hover:bg-slate-50"><Link2 size={18} /> {t('sheet.share')}</button>
        </div>
      </motion.div>

      <div>
        <h2 className="mb-3 px-1 font-bold">{t('sheet.history')}</h2>
        {d.entries.length
          ? <Timeline entries={d.entries} src={{ kind: 'private' }} onEdit={setEditing} />
          : <Empty icon={ScrollText} title={t('sheet.empty')} />}
      </div>

      <EntryModal open={adding !== null} onClose={() => setAdding(null)} debtor={d} kind={adding ?? 'debt'} />
      <EntryModal open={editing !== null} onClose={() => setEditing(null)} debtor={d} entry={editing ?? undefined} />
      <DebtorFormModal open={editDebtor} onClose={() => setEditDebtor(false)} debtor={d} onSaved={() => dispatch(toast(t('sheet.saved')))} />
      <RemindModal debtor={d} open={remind} onClose={() => setRemind(false)} />
      <ShareModal debtor={d} open={share} onClose={() => setShare(false)} />
    </div>
  );
}
