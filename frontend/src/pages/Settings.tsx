import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Download, KeyRound, Languages, LogOut, MonitorSmartphone, ShieldCheck, Store, Trash2, WifiOff, type LucideIcon } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { useStats } from '../hooks/queries';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loggedIn, logout, userLoaded } from '../store/authSlice';
import { toast } from '../store/uiSlice';
import { useT } from '../i18n';
import { ErrorBox, Field, LangSwitch } from '../components/ui';
import { InstallSection } from '../components/InstallCard';
import { PasswordInput, passwordScore } from '../components/feedback';

const DEMO_PHONE = '+998900000000';
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

function Section({ icon: Icon, title, children, danger }: { icon: LucideIcon; title: string; children: ReactNode; danger?: boolean }) {
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      <h2 className={`mb-4 flex items-center gap-2.5 font-bold ${danger ? 'text-rose-600' : ''}`}>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${danger ? 'bg-rose-50' : 'bg-brand-50 text-brand-600'}`}><Icon size={17} /></span>{title}
      </h2>
      {children}
    </motion.section>
  );
}

export default function Settings() {
  const t = useT();
  const user = useAppSelector((s) => s.auth.user)!;
  const dispatch = useAppDispatch();
  const stats = useStats().data;
  const demo = user.phone === DEMO_PHONE;

  const [f, setF] = useState({ name: user.name, shop_name: user.shop_name });
  const save = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (u) => { dispatch(userLoaded(u)); dispatch(toast(t('set.saved'))); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(f); };

  const [pw, setPw] = useState({ cur: '', next: '', again: '' });
  const mismatch = pw.again.length > 0 && pw.next !== pw.again;
  const changePw = useMutation({
    mutationFn: () => authApi.changePassword(pw.cur, pw.next),
    onSuccess: (r) => { dispatch(loggedIn(r)); setPw({ cur: '', next: '', again: '' }); dispatch(toast(t('acc.pwChanged'))); },
  });
  const logoutAll = useMutation({
    mutationFn: authApi.logoutAll,
    onSuccess: (r) => { dispatch(loggedIn(r)); dispatch(toast(t('acc.logoutAllDone'))); },
    onError: (e: Error) => dispatch(toast(e.message, 'err')),
  });
  const exportData = useMutation({
    mutationFn: authApi.exportData,
    onSuccess: () => dispatch(toast(t('acc.exported'))),
    onError: (e: Error) => dispatch(toast(e.message, 'err')),
  });
  const [delPw, setDelPw] = useState('');
  const del = useMutation({
    mutationFn: () => authApi.deleteAccount(delPw),
    onSuccess: () => { dispatch(logout()); dispatch(toast(t('acc.deleted'))); },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-700 to-violet-800 p-6 text-white shadow-glow">
        <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 text-2xl font-extrabold ring-1 ring-white/25">{initials(user.name)}</span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{user.name}</h1>
            <div className="text-sm text-white/80">{user.phone}</div>
            {user.shop_name && <div className="mt-0.5 flex items-center gap-1 text-sm text-white/80"><Store size={14} /> {user.shop_name}</div>}
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20">{t('acc.stats', { n: (stats?.debtors_total ?? 0) + (stats?.my_creditors ?? 0) })}</span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-400/25 px-3 py-1 ring-1 ring-emerald-300/30"><ShieldCheck size={13} /> {t('acc.safeTitle')}</span>
        </div>
      </motion.div>

      {demo && <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">{t('acc.demoNote')}</div>}

      <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
        <ul className="space-y-1.5 text-sm text-emerald-900">
          {(['acc.safe1', 'acc.safe2', 'acc.safe3'] as const).map((k) => <li key={k} className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />{t(k)}</li>)}
        </ul>
      </div>

      <Section icon={Store} title={t('set.profile')}>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t('auth.name')}><input required minLength={2} className="input" disabled={demo} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
          <Field label={t('auth.shop')} hint={t('auth.shopHint')}><input className="input" disabled={demo} value={f.shop_name} onChange={(e) => setF({ ...f, shop_name: e.target.value })} /></Field>
          {save.error && <ErrorBox error={save.error} />}
          <button disabled={demo || save.isPending || (f.name === user.name && f.shop_name === user.shop_name)} className="btn-primary w-full">{save.isPending ? t('c.saving') : t('c.save')}</button>
        </form>
      </Section>

      <InstallSection />

      <Section icon={WifiOff} title={t('acc.offlineTitle')}>
        <p className="text-sm leading-relaxed text-slate-600">{t('acc.offlineText')}</p>
      </Section>

      <Section icon={KeyRound} title={t('acc.changePw')}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!mismatch) changePw.mutate(); }}>
          <Field label={t('acc.currentPw')}><PasswordInput value={pw.cur} onChange={(v) => setPw({ ...pw, cur: v })} autoComplete="current-password" className="" /></Field>
          <Field label={t('acc.newPw')}><PasswordInput value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} meter autoComplete="new-password" placeholder={t('pw.rule')} className="" /></Field>
          <Field label={t('acc.newPw2')}>
            <PasswordInput value={pw.again} onChange={(v) => setPw({ ...pw, again: v })} autoComplete="new-password" className="" />
            {mismatch && <span className="mt-1 block text-xs font-medium text-rose-600">{t('acc.pwMismatch')}</span>}
          </Field>
          {changePw.error && <ErrorBox error={changePw.error} />}
          <button className="btn-primary w-full" disabled={demo || changePw.isPending || !pw.cur || passwordScore(pw.next) === 0 || pw.next !== pw.again}>
            {changePw.isPending ? t('c.saving') : t('acc.changePw')}
          </button>
        </form>
      </Section>

      <Section icon={MonitorSmartphone} title={t('acc.logoutAll')}>
        <p className="text-sm text-slate-600">{t('acc.logoutAllText')}</p>
        <button className="btn-ghost mt-3 w-full" disabled={demo || logoutAll.isPending} onClick={() => logoutAll.mutate()}><LogOut size={16} /> {t('acc.logoutAll')}</button>
      </Section>

      <Section icon={Download} title={t('acc.export')}>
        <p className="text-sm text-slate-600">{t('acc.exportText')}</p>
        <button className="btn-ghost mt-3 w-full" disabled={exportData.isPending} onClick={() => exportData.mutate()}><Download size={16} /> {exportData.isPending ? t('c.wait') : t('acc.export')}</button>
      </Section>

      <div className="card flex items-center justify-between p-5">
        <span className="flex items-center gap-2.5 font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Languages size={17} /></span>{t('set.lang')}</span>
        <LangSwitch />
      </div>

      <button className="btn-ghost w-full py-3 text-rose-600" onClick={() => dispatch(logout())}><LogOut size={18} /> {t('nav.logout')}</button>

      {!demo && (
        <Section icon={Trash2} title={t('acc.delete')} danger>
          <p className="text-sm text-slate-600">{t('acc.deleteText')}</p>
          <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); del.mutate(); }}>
            <Field label={t('acc.deleteConfirm')}><PasswordInput value={delPw} onChange={setDelPw} autoComplete="current-password" className="" /></Field>
            {del.error && <ErrorBox error={del.error} />}
            <button className="btn w-full bg-rose-600 text-white hover:bg-rose-700" disabled={!delPw || del.isPending}><Trash2 size={16} /> {t('acc.delete')}</button>
          </form>
        </Section>
      )}
    </div>
  );
}
