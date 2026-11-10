import { useEffect } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { authApi } from './api/endpoints';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { userLoaded } from './store/authSlice';
import { useT } from './i18n';
import AppShell from './components/AppShell';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Debtor from './pages/Debtor';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PublicSheet from './pages/PublicSheet';

function NotFound() {
  const t = useT();
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <div className="bg-gradient-to-br from-brand-400 to-violet-500 bg-clip-text text-8xl font-black text-transparent">404</div>
        <p className="mt-2 text-slate-500">{t('c.notFound')}</p>
        <Link to="/" className="btn-primary mt-6">{t('c.home')}</Link>
      </div>
    </div>
  );
}

export default function App() {
  const token = useAppSelector((s) => s.auth.token);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (token) authApi.me().then((u) => dispatch(userLoaded(u))).catch(() => {});
  }, [token, dispatch]);

  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="kirish" element={<Auth key="login" mode="login" />} />
      <Route path="royxat" element={<Auth key="register" mode="register" />} />
      <Route path="v/:token" element={<PublicSheet />} />
      <Route path="app" element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="q/:id" element={<Debtor />} />
        <Route path="hisobot" element={<Reports />} />
        <Route path="sozlamalar" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
