import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Search, UserPlus } from 'lucide-react';
import { useDebtors, useSaveDebtor } from '../hooks/queries';
import { useT } from '../i18n';
import { money } from '../lib/format';
import type { DebtorDetail, DebtorSummary, Direction } from '../types/api';
import { ErrorBox, Field, Modal, NumberBadge } from './ui';

/** Qarzdor ma'lumotlari (yangi yoki tahrirlash). */
export function DebtorFormModal({ open, onClose, debtor, onSaved }: { open: boolean; onClose: () => void; debtor?: DebtorSummary; onSaved?: (d: DebtorDetail) => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={debtor ? t('new.editTitle') : t('new.debtorTitle')}>
      {open && <DebtorForm debtor={debtor} onSaved={(d) => { onSaved?.(d); onClose(); }} />}
    </Modal>
  );
}

function DebtorForm({ debtor, initialName = '', direction = 'owes_me', onSaved }: { debtor?: DebtorSummary; initialName?: string; direction?: Direction; onSaved: (d: DebtorDetail) => void }) {
  const t = useT();
  const save = useSaveDebtor();
  const [f, setF] = useState({ name: debtor?.name ?? initialName, phone: debtor?.phone || '+998 ', note: debtor?.note ?? '', direction: debtor?.direction ?? direction });
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate({ id: debtor?.id, data: f }, { onSuccess: onSaved }); };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('new.name')}><input autoFocus required className="input py-3" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t('new.namePh')} /></Field>
      <Field label={t('new.phone')}><input type="tel" className="input py-3" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+998 90 123 45 67" /></Field>
      <Field label={t('c.note')}><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      {debtor && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
          {(['owes_me', 'i_owe'] as const).map((d) => (
            <button key={d} type="button" onClick={() => setF({ ...f, direction: d })}
              className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition ${f.direction === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {t(d === 'owes_me' ? 'sheet.badgeTheirs' : 'sheet.badgeMine')}
            </button>
          ))}
        </div>
      )}
      {save.error && <ErrorBox error={save.error} />}
      <button disabled={save.isPending} className="btn-primary w-full py-3.5 text-base">{save.isPending ? t('c.saving') : debtor ? t('c.save') : t('new.next')}</button>
    </form>
  );
}

/** 1-qadam: nima bo'ldi (qarz berdimmi yoki oldimmi), so'ng kim bilan — mavjudini tanlash yoki yangisini qo'shish. */
export function PickDebtorModal({ open, onClose, onPick, direction }: { open: boolean; onClose: () => void; onPick: (d: DebtorSummary) => void; direction?: Direction }) {
  const t = useT();
  const [dir, setDir] = useState<Direction | null>(direction ?? null);
  useEffect(() => { if (open) setDir(direction ?? null); }, [open, direction]);
  const title = !dir ? t('dir.pickTitle') : dir === 'i_owe' ? t('new.titleMine') : t('new.title');
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {open && (dir ? <PickDebtor direction={dir} onPick={onPick} onBack={direction ? undefined : () => setDir(null)} /> : <PickDirection onPick={setDir} />)}
    </Modal>
  );
}

function PickDirection({ onPick }: { onPick: (d: Direction) => void }) {
  const t = useT();
  const items = [
    { d: 'owes_me' as const, icon: ArrowUpRight, title: t('dir.gave'), sub: t('dir.gaveSub'), cls: 'bg-rose-50 text-rose-600 ring-rose-200', ic: 'bg-rose-600' },
    { d: 'i_owe' as const, icon: ArrowDownLeft, title: t('dir.took'), sub: t('dir.tookSub'), cls: 'bg-amber-50 text-amber-700 ring-amber-200', ic: 'bg-amber-500' },
  ];
  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <motion.button key={it.d} type="button" onClick={() => onPick(it.d)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
          className={`flex items-center gap-4 rounded-2xl p-4 text-left ring-1 transition active:scale-[.98] ${it.cls}`}>
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white ${it.ic}`}><it.icon size={24} /></span>
          <span className="min-w-0 flex-1"><span className="block text-lg font-bold text-slate-900">{it.title}</span><span className="text-sm text-slate-600">{it.sub}</span></span>
          <ChevronRight size={20} className="shrink-0 text-slate-400" />
        </motion.button>
      ))}
    </div>
  );
}

function PickDebtor({ onPick, direction, onBack }: { onPick: (d: DebtorSummary) => void; direction: Direction; onBack?: () => void }) {
  const t = useT();
  const mine = direction === 'i_owe';
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const { data = [] } = useDebtors({ sort: 'recent', direction });
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data.slice(0, 30);
    const n = s.replace(/^#/, '');
    return data.filter((d) => d.name.toLowerCase().includes(s) || (s.replace(/\D/g, '').length >= 3 && d.phone.includes(s.replace(/\D/g, ''))) || String(d.number) === n).slice(0, 30);
  }, [data, q]);

  if (creating) return <DebtorForm direction={direction} initialName={/^#?\d+$/.test(q.trim()) ? '' : q.trim()} onSaved={onPick} />;

  return (
    <div className="space-y-3">
      {onBack && (
        <button type="button" onClick={onBack} className="-mt-1 flex items-center gap-1 text-sm font-semibold text-brand-600"><ChevronLeft size={16} /> {t(mine ? 'dir.took' : 'dir.gave')}</button>
      )}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input py-3 pl-11" placeholder={t('new.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <button type="button" onClick={() => setCreating(true)}
        className="flex w-full items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3.5 text-left font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-100 active:scale-[.98]">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><UserPlus size={19} /></span>
        <span className="flex-1">{q.trim() && !/^#?\d+$/.test(q.trim()) ? t(mine ? 'new.createMine' : 'new.create', { name: q.trim() }) : t(mine ? 'new.createEmptyMine' : 'new.createEmpty')}</span>
        <ChevronRight size={18} />
      </button>
      <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
        {list.map((d, i) => (
          <motion.button key={d.id} type="button" onClick={() => onPick(d)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.02 }}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-slate-50">
            <NumberBadge n={d.number} size="sm" tone={d.balance > 0 ? 'brand' : 'slate'} />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{d.name}</span><span className="text-xs text-slate-400">{d.phone || '—'}</span></span>
            {d.balance > 0 && <span className="text-sm font-bold tabular-nums text-rose-600">{money(d.balance)}</span>}
          </motion.button>
        ))}
        {!list.length && q && <p className="py-6 text-center text-sm text-slate-400">{t('c.nothing')}</p>}
      </div>
    </div>
  );
}
