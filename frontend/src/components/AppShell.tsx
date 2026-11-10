import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { motion } from 'motion/react';
import { BarChart3, LogOut, Plus, Settings, Users } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import { useT, type TKey } from '../i18n';
import { LangSwitch, Logo, Toasts } from './ui';
import { PickDebtorModal } from './DebtorForms';

const NAV: { to: string; label: TKey; icon: typeof Users; end?: boolean }[] = [
  { to: '/app', label: 'nav.debtors', icon: Users, end: true },
  { to: '/app/hisobot', label: 'nav.reports', icon: BarChart3 },
  { to: '/app/sozlamalar', label: 'nav.settings', icon: Settings },
];

export default function AppShell() {
  const t = useT();
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const [picking, setPicking] = useState(false);
  const loggingOut = useRef(false);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  if (!user) return <Navigate to={loggingOut.current ? '/' : '/kirish'} replace />;

  // Qarzdor tanlangach — uning varag'i ochiladi va qarz yozish oynasi chiqadi
  const startDebt = () => setPicking(true);
  const onPick = (id: number) => { setPicking(false); nav(`/app/q/${id}`, { state: { add: 'debt' } }); };
  const doLogout = () => { loggingOut.current = true; dispatch(logout()); };

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Kompyuter: yon panel */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ink-950 p-4 text-slate-400 lg:flex">
        <Link to="/app" className="px-2 py-2"><Logo dark /></Link>
        <button onClick={startDebt} className="btn-primary mt-6 w-full py-3"><Plus size={18} /> {t('nav.new')}</button>
        <nav className="mt-6 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'text-white' : 'hover:text-white'}`}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="side-nav" className="absolute inset-0 rounded-xl bg-white/10" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <Icon size={18} className="relative" /><span className="relative">{t(label)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
          <div className="flex justify-center"><LangSwitch dark /></div>
          <div className="flex items-center gap-3 px-1">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-violet-500 text-sm font-bold text-white">{user.name[0]?.toUpperCase()}</span>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{user.name}</div><div className="truncate text-xs">{user.shop_name || user.phone}</div></div>
            <button className="icon-btn text-slate-400 hover:bg-white/10 hover:text-rose-400" title={t('nav.logout')} aria-label={t('nav.logout')} onClick={doLogout}><LogOut size={18} /></button>
          </div>
        </div>
      </aside>

      {/* Telefon: yuqori panel */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl lg:hidden">
        <Link to="/app"><Logo /></Link>
        <div className="flex items-center gap-1">
          <LangSwitch />
          <NavLink to="/app/sozlamalar" aria-label={t('nav.settings')} className={({ isActive }) => `icon-btn ${isActive ? 'bg-brand-50 text-brand-600' : ''}`}><Settings size={20} /></NavLink>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
          {outlet}
        </motion.div>
      </main>

      {/* Telefon: pastki menyu + katta "+" tugma */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur-xl lg:hidden">
        <div className="relative mx-auto grid max-w-md grid-cols-3">
          <NavLink to="/app" end className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brand-600' : 'text-slate-500'}`}>
            <Users size={21} />{t('nav.debtors')}
          </NavLink>
          <div className="relative">
            <motion.button onClick={startDebt} whileTap={{ scale: 0.92 }} aria-label={t('nav.new')}
              className="absolute -top-6 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-glow ring-4 ring-white">
              <Plus size={28} />
            </motion.button>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-brand-600">{t('nav.new')}</span>
          </div>
          <NavLink to="/app/hisobot" className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brand-600' : 'text-slate-500'}`}>
            <BarChart3 size={21} />{t('nav.reports')}
          </NavLink>
        </div>
      </nav>

      <PickDebtorModal open={picking} onClose={() => setPicking(false)} onPick={(d) => onPick(d.id)} />
      <Toasts />
    </div>
  );
}
