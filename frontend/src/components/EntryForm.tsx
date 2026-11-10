import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, HandCoins, Minus, Plus, Trash2, X } from 'lucide-react';
import { entriesApi } from '../api/endpoints';
import { useDeleteEntry, useDeletePhoto, useRefresh } from '../hooks/queries';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';
import { mk, useT, type TKey } from '../i18n';
import { confirmAsk } from './feedback';
import { compressImage } from '../lib/image';
import { groupDigits, isoDay, money, parseDigits, toLocalInput } from '../lib/format';
import type { DebtorSummary, Entry, EntryKind } from '../types/api';
import { ErrorBox, Field, Modal } from './ui';
import { AuthImage } from './Photos';

const MAX_PHOTOS = 6;
const DUE_PRESETS: { key: TKey; days: number | null }[] = [
  { key: 'entry.due.none', days: null }, { key: 'entry.due.week', days: 7 }, { key: 'entry.due.2weeks', days: 14 }, { key: 'entry.due.month', days: 30 },
];

interface Props { open: boolean; onClose: () => void; debtor: DebtorSummary | null; entry?: Entry; kind?: EntryKind }

export default function EntryModal({ open, onClose, debtor, entry, kind = 'debt' }: Props) {
  const t = useT();
  return (
    <Modal open={open && !!debtor} onClose={onClose} title={entry ? t('entry.edit') : debtor ? <span>#{debtor.number} · {debtor.name}</span> : ''}>
      {open && debtor && <EntryForm debtor={debtor} entry={entry} initialKind={entry?.kind ?? kind} onDone={onClose} />}
    </Modal>
  );
}

interface NewPhoto { key: string; file: File; preview: string }

function EntryForm({ debtor, entry, initialKind, onDone }: { debtor: DebtorSummary; entry?: Entry; initialKind: EntryKind; onDone: () => void }) {
  const t = useT();
  const dispatch = useAppDispatch();
  const refresh = useRefresh();
  const delEntry = useDeleteEntry();
  const delPhoto = useDeletePhoto();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const mine = debtor.direction === 'i_owe';
  const [amount, setAmount] = useState(entry ? groupDigits(String(entry.amount)) : '');
  const [when, setWhen] = useState(toLocalInput(entry ? new Date(entry.happened_at) : new Date()));
  const [note, setNote] = useState(entry?.note ?? '');
  const [due, setDue] = useState<string>(entry?.due_date ?? '');
  const [photos, setPhotos] = useState<NewPhoto[]>([]);
  const [existing, setExisting] = useState(entry?.photos ?? []);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Prevyu URL'larini faqat oyna yopilganda tozalaymiz
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  // To'lov uchun: hozirgi qarz (tahrirlanayotgan to'lov summasini qaytarib qo'shamiz)
  const rest = debtor.balance + (entry?.kind === 'payment' ? entry.amount : 0) - (entry?.kind === 'debt' ? entry.amount : 0);
  const value = parseDigits(amount);
  const tooMuch = kind === 'payment' && value > rest;
  const total = existing.length + photos.length;

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - total;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);
    if (files.length > room) dispatch(toast(t('entry.maxPhotos', { n: MAX_PHOTOS }), 'err'));
    const added = list.map((file) => ({ key: `${file.name}-${file.size}-${Math.random()}`, file, preview: URL.createObjectURL(file) }));
    previews.current.push(...added.map((x) => x.preview));
    setPhotos((p) => [...p, ...added]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value || tooMuch) return;
    setBusy(true);
    setError(null);
    try {
      const payload = { kind, amount: value, happened_at: new Date(when).toISOString(), due_date: kind === 'debt' && due ? due : null, note: note.trim() };
      const saved = entry ? await entriesApi.update(entry.id, payload) : await entriesApi.create(debtor.id, payload);
      for (let i = 0; i < photos.length; i++) {
        setProgress([i + 1, photos.length]);
        await entriesApi.uploadPhoto(saved.id, await compressImage(photos[i].file));
      }
      refresh();
      dispatch(toast(t(entry ? 'entry.updated' : mk(kind === 'debt' ? 'entry.savedDebt' : 'entry.savedPay', mine))));
      onDone();
    } catch (err) {
      setError(err as Error);
      refresh();
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
        {(['debt', 'payment'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            className={`relative flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${kind === k ? 'text-white' : 'text-slate-600'}`}>
            {kind === k && <motion.span layoutId="kind" className={`absolute inset-0 rounded-xl shadow-lg ${k === 'debt' ? 'bg-rose-600 shadow-rose-600/30' : 'bg-emerald-600 shadow-emerald-600/30'}`} transition={{ type: 'spring', stiffness: 450, damping: 34 }} />}
            <span className="relative">{k === 'debt' ? <Plus size={18} /> : <Minus size={18} />}</span>
            <span className="relative">{t(mk(k === 'debt' ? 'entry.newDebt' : 'entry.newPayment', mine))}</span>
          </button>
        ))}
      </div>

      <div>
        <span className="label">{t('entry.amount')}</span>
        <div className="relative">
          <input autoFocus required inputMode="numeric" autoComplete="off" placeholder="0" value={amount} onChange={(e) => setAmount(groupDigits(e.target.value))}
            className={`input py-4 pr-16 text-3xl font-extrabold tracking-tight ${tooMuch ? 'ring-2 ring-rose-400' : ''} ${kind === 'debt' ? 'text-rose-600' : 'text-emerald-600'}`} />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">{t('c.currency')}</span>
        </div>
        {kind === 'payment' && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className={tooMuch ? 'font-semibold text-rose-600' : 'text-slate-500'}>{t('entry.rest', { v: money(rest) })}</span>
            {rest > 0 && <button type="button" className="font-semibold text-emerald-700" onClick={() => setAmount(groupDigits(String(rest)))}>{t('entry.full')}</button>}
          </div>
        )}
      </div>

      <Field label={t('c.note')}>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t(mk(kind === 'debt' ? 'entry.notePhDebt' : 'entry.notePhPay', mine))} />
      </Field>

      <div>
        <span className="label">{t('entry.photos')}</span>
        <div className="flex flex-wrap gap-2.5">
          {existing.map((p) => (
            <div key={p.id} className="group relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-slate-200">
              <AuthImage src={{ kind: 'private' }} photo={p} className="h-full w-full" />
              <button type="button" aria-label={t('c.delete')} onClick={() => delPhoto.mutate(p.id, { onSuccess: () => setExisting((x) => x.filter((y) => y.id !== p.id)) })}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><X size={14} /></button>
            </div>
          ))}
          <AnimatePresence>
            {photos.map((p) => (
              <motion.div key={p.key} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
                className="relative h-20 w-20 overflow-hidden rounded-xl ring-2 ring-brand-300">
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label={t('c.delete')} onClick={() => setPhotos((x) => x.filter((y) => y.key !== p.key))}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><X size={14} /></button>
              </motion.div>
            ))}
          </AnimatePresence>
          {total < MAX_PHOTOS && (
            <button type="button" onClick={() => fileInput.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600">
              <Camera size={22} /><span className="text-[11px] font-semibold">{t('entry.addPhoto')}</span>
            </button>
          )}
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <p className="mt-1.5 text-xs text-slate-400">{t('entry.photoHint')}</p>
      </div>

      <Field label={t('entry.date')} hint={t('entry.dateHint')}>
        <input type="datetime-local" required className="input" value={when} max={toLocalInput()} onChange={(e) => setWhen(e.target.value)} />
      </Field>

      {kind === 'debt' && (
        <div>
          <span className="label">{t('entry.due')}</span>
          <div className="flex flex-wrap gap-1.5">
            {DUE_PRESETS.map((p) => {
              const v = p.days === null ? '' : isoDay(p.days);
              const active = p.days === null ? !due : due === v;
              return (
                <button key={p.key} type="button" onClick={() => setDue(v)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t(p.key)}</button>
              );
            })}
            <input type="date" className="input w-auto py-1.5 text-xs" value={due} min={isoDay()} onChange={(e) => setDue(e.target.value)} aria-label={t('entry.due')} />
          </div>
        </div>
      )}

      {error && <ErrorBox error={error} />}
      <div className="flex gap-2">
        {entry && (
          <button type="button" className="btn-soft px-4 text-rose-600" aria-label={t('c.delete')} disabled={busy}
            onClick={async () => { if (await confirmAsk({ text: t('entry.confirmDelete') })) delEntry.mutate(entry.id, { onSuccess: () => { dispatch(toast(t('entry.deleted'))); onDone(); } }); }}>
            <Trash2 size={18} />
          </button>
        )}
        <button disabled={busy || !value || tooMuch} className={`flex-1 py-3.5 text-base ${kind === 'debt' ? 'btn-debt' : 'btn-pay'}`}>
          <HandCoins size={19} />
          {progress ? t('entry.uploading', { i: progress[0], n: progress[1] }) : busy ? t('c.saving') : `${t('entry.save')}${value ? ` · ${money(value)}` : ''}`}
        </button>
      </div>
    </form>
  );
}
