import { useMemo } from 'react';
import { motion } from 'motion/react';
import { CalendarClock, Minus, Plus } from 'lucide-react';
import { mk, useT } from '../i18n';
import { dayLabel, fmtDay, fmtTime, money } from '../lib/format';
import type { Entry } from '../types/api';
import { PhotoStrip, type PhotoSource } from './Photos';

/** Varaqdagi yozuvlar: kunlar bo'yicha guruhlangan, har biridan keyingi qoldiq bilan. */
export default function Timeline({ entries, src, onEdit, mine = false }: { entries: Entry[]; src: PhotoSource; onEdit?: (e: Entry) => void; mine?: boolean }) {
  const t = useT();
  const { groups, after } = useMemo(() => {
    const asc = [...entries].sort((a, b) => a.happened_at.localeCompare(b.happened_at) || a.id - b.id);
    const after = new Map<number, number>();
    let bal = 0;
    for (const e of asc) { bal += e.kind === 'debt' ? e.amount : -e.amount; after.set(e.id, bal); }
    const groups: { label: string; items: Entry[] }[] = [];
    for (const e of entries) {
      const label = dayLabel(e.happened_at);
      if (groups.at(-1)?.label === label) groups.at(-1)!.items.push(e); else groups.push({ label, items: [e] });
    }
    return { groups, after };
  }, [entries]);

  return (
    <div className="space-y-5">
      {groups.map((g, gi) => (
        <div key={`${g.label}-${gi}`}>
          <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{g.label}</div>
          <div className="space-y-2.5">
            {g.items.map((e, i) => {
              const debt = e.kind === 'debt';
              const Comp = onEdit ? motion.button : motion.div;
              return (
                <Comp key={e.id} type={onEdit ? 'button' : undefined} onClick={onEdit ? () => onEdit(e) : undefined}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(gi * 2 + i, 12) * 0.03 }}
                  className={`card block w-full p-4 text-left ${onEdit ? 'transition hover:shadow-lg' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${debt ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {debt ? <Plus size={20} /> : <Minus size={20} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                        <div>
                          <div className={`whitespace-nowrap text-lg font-extrabold tabular-nums ${debt ? 'text-rose-600' : 'text-emerald-600'}`}>{debt ? '+' : '−'}{money(e.amount)}</div>
                          <div className="text-xs text-slate-400">{t(mk(debt ? 'kind.debt' : 'kind.payment', mine))} · {fmtTime(e.happened_at)}</div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium tabular-nums text-slate-500">{t('sheet.after', { v: money(after.get(e.id) ?? 0) })}</span>
                      </div>
                      {e.note && <p className="mt-2 text-sm text-slate-700">{e.note}</p>}
                      {e.due_date && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                          <CalendarClock size={13} /> {t('sheet.due', { d: fmtDay(e.due_date) })}
                        </div>
                      )}
                      {e.photos.length > 0 && <div className="mt-3"><PhotoStrip src={src} photos={e.photos} /></div>}
                    </div>
                  </div>
                </Comp>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
