import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { PlayCircle, ShieldCheck } from 'lucide-react';
import { PasswordInput, passwordScore } from '../components/feedback';
import { authApi } from '../api/endpoints';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loggedIn } from '../store/authSlice';
import { useDemoLogin } from '../hooks/useDemoLogin';
import { useT } from '../i18n';
import { ErrorBox, LangSwitch, Logo, Toasts } from '../components/ui';

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const t = useT();
  const isReg = mode === 'register';
  const [f, setF] = useState({ name: '', shop_name: '', phone: '+998 ', password: '' });
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const demo = useDemoLogin();
  const m = useMutation({
    mutationFn: () => (isReg ? authApi.register(f) : authApi.login({ phone: f.phone, password: f.password })),
    onSuccess: (r) => { dispatch(loggedIn(r)); nav('/app', { replace: true }); },
  });
  if (user && !m.isSuccess) return <Navigate to="/app" replace />;
  const ch = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = (e: FormEvent) => { e.preventDefault(); m.mutate(); };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 via-white to-white">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-5">
        <Link to="/"><Logo /></Link>
        <LangSwitch />
      </header>
      <div className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md space-y-4 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{isReg ? t('auth.regTitle') : t('auth.loginTitle')}</h1>
            <p className="mt-1 text-slate-500">{isReg ? t('auth.regSub') : t('auth.loginSub')}</p>
          </div>
          {isReg && <label className="block"><span className="label">{t('auth.name')}</span><input id="name" required minLength={2} className="input py-3" value={f.name} onChange={ch('name')} /></label>}
          {isReg && <label className="block"><span className="label">{t('auth.shop')}</span><input id="shop" className="input py-3" value={f.shop_name} onChange={ch('shop_name')} /><span className="mt-1 block text-xs text-slate-400">{t('auth.shopHint')}</span></label>}
          <label className="block"><span className="label">{t('auth.phone')}</span><input id="phone" required type="tel" autoComplete="tel" className="input py-3" value={f.phone} onChange={ch('phone')} /></label>
          <label className="block"><span className="label">{t('auth.password')}</span>
            <PasswordInput id="password" value={f.password} onChange={(v) => setF({ ...f, password: v })} meter={isReg}
              autoComplete={isReg ? 'new-password' : 'current-password'} placeholder={isReg ? t('auth.passwordPhNew') : t('auth.passwordPh')} />
          </label>
          {m.error && <ErrorBox error={m.error} />}
          {isReg && <p className="flex items-start gap-2 text-xs text-slate-500"><ShieldCheck size={15} className="mt-px shrink-0 text-emerald-600" /> {t('auth.secure')}</p>}
          <button disabled={m.isPending || (isReg && passwordScore(f.password) === 0)} className="btn-primary w-full py-3.5 text-base">{m.isPending ? t('c.wait') : isReg ? t('auth.register') : t('auth.login')}</button>
          <div className="relative py-1 text-center text-xs text-slate-400 before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-slate-200"><span className="relative bg-white px-3">{t('c.or')}</span></div>
          <button type="button" onClick={() => demo.mutate()} disabled={demo.isPending} className="btn-ghost w-full py-3"><PlayCircle size={18} /> {demo.isPending ? t('c.wait') : t('auth.demo')}</button>
          <p className="text-center text-sm text-slate-500">
            {isReg ? <>{t('auth.haveAcc')} <Link to="/kirish" className="font-semibold text-brand-600">{t('auth.login')}</Link></>
              : <>{t('auth.noAcc')} <Link to="/royxat" className="font-semibold text-brand-600">{t('auth.toRegister')}</Link></>}
          </p>
        </motion.form>
      </div>
      <Toasts />
    </div>
  );
}
