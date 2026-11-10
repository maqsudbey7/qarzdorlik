import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Info, LogOut } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, userLoaded } from '../store/authSlice';
import { toast } from '../store/uiSlice';
import { useT } from '../i18n';
import { ErrorBox, Field, LangSwitch } from '../components/ui';
import { InstallSection } from '../components/InstallCard';

export default function Settings() {
  const t = useT();
  const user = useAppSelector((s) => s.auth.user)!;
  const dispatch = useAppDispatch();
  const [f, setF] = useState({ name: user.name, shop_name: user.shop_name });
  const save = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (u) => { dispatch(userLoaded(u)); dispatch(toast(t('set.saved'))); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(f); };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('set.title')}</h1>
      {user.phone === '+998900000000' && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200"><Info size={18} className="mt-0.5 shrink-0" /> {t('set.demo')}</div>
      )}
      <form onSubmit={submit} className="card space-y-4 p-5">
        <h2 className="font-bold">{t('set.profile')}</h2>
        <Field label={t('auth.name')}><input required minLength={2} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label={t('auth.shop')} hint={t('auth.shopHint')}><input className="input" value={f.shop_name} onChange={(e) => setF({ ...f, shop_name: e.target.value })} /></Field>
        <Field label={t('c.phone')}><input disabled className="input bg-slate-50 text-slate-500" value={user.phone} /></Field>
        {save.error && <ErrorBox error={save.error} />}
        <button disabled={save.isPending} className="btn-primary w-full">{save.isPending ? t('c.saving') : t('c.save')}</button>
      </form>
      <InstallSection />
      <div className="card flex items-center justify-between p-5">
        <span className="font-bold">{t('set.lang')}</span>
        <LangSwitch />
      </div>
      <button className="btn-ghost w-full py-3 text-rose-600" onClick={() => dispatch(logout())}><LogOut size={18} /> {t('nav.logout')}</button>
    </div>
  );
}
