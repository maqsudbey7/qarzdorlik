import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BarChart3, Camera, Hash, Link2, PlayCircle, Search } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { useDemoLogin } from '../hooks/useDemoLogin';
import { useT, type TKey } from '../i18n';
import { stagger } from '../lib/motion';
import { LangSwitch, Logo, Toasts } from '../components/ui';
import { InstallButton } from '../components/InstallCard';

const FEATURES: { icon: typeof Hash; k: 'f1' | 'f2' | 'f3' | 'f4'; cls: string }[] = [
  { icon: Hash, k: 'f1', cls: 'from-brand-500 to-violet-600' },
  { icon: Camera, k: 'f2', cls: 'from-rose-500 to-pink-600' },
  { icon: BarChart3, k: 'f3', cls: 'from-emerald-500 to-teal-600' },
  { icon: Link2, k: 'f4', cls: 'from-amber-400 to-orange-500' },
];

const PREVIEW = [
  { n: 4, name: 'Bobur usta', v: '6 300 000', due: true },
  { n: 1, name: 'Akmal aka', v: '4 150 000' },
  { n: 2, name: 'Oila market', v: '4 130 000' },
  { n: 6, name: 'Gulnora kafe', v: '1 340 000' },
];

function PhonePreview() {
  const t = useT();
  return (
    <motion.div initial={{ opacity: 0, y: 40, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: 2 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="relative mx-auto w-[280px] rounded-[2.5rem] bg-ink-950 p-3 shadow-2xl ring-1 ring-white/10 sm:w-[300px]">
      <div className="overflow-hidden rounded-[2rem] bg-slate-50">
        <div className="bg-gradient-to-br from-brand-600 to-violet-700 p-5 text-white">
          <div className="text-xs text-brand-100">{t('land.pv.total')}</div>
          <div className="text-3xl font-extrabold">16.3 <span className="text-base font-semibold">{t('fmt.mln')}</span></div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs text-brand-50"><Search size={14} /> {t('home.searchPh')}</div>
        </div>
        <div className="space-y-2 p-3">
          {PREVIEW.map((d, i) => (
            <motion.div key={d.n} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.12 }}
              className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100">
              <span className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-extrabold text-white ${d.due ? 'bg-rose-500' : 'bg-brand-600'}`}>#{d.n}</span>
              <span className="flex-1 truncate text-xs font-semibold text-slate-800">{d.name}</span>
              <span className={`text-xs font-extrabold ${d.due ? 'text-rose-600' : 'text-slate-900'}`}>{d.v}</span>
            </motion.div>
          ))}
        </div>
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.5, type: 'spring' }}
        className="absolute -left-10 bottom-16 flex animate-float items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-slate-900 shadow-2xl">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-600"><Camera size={16} /></span>
        <span className="text-xs font-bold">{t('land.f2.t')}</span>
      </motion.div>
    </motion.div>
  );
}

export default function Landing() {
  const t = useT();
  const user = useAppSelector((s) => s.auth.user);
  const demo = useDemoLogin();

  return (
    <div className="min-h-dvh bg-white">
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-600/30 blur-3xl" />
        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Logo dark />
          <div className="flex items-center gap-2">
            <LangSwitch dark />
            {user
              ? <Link to="/app" className="btn-primary">{t('land.open')}</Link>
              : <Link to="/kirish" className="btn text-slate-300 hover:bg-white/10 hover:text-white">{t('land.login')}</Link>}
          </div>
        </header>
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-2 lg:pb-28 lg:pt-14">
          <motion.div variants={stagger.container} initial="hidden" animate="show">
            <motion.span variants={stagger.item} className="badge bg-white/10 px-3 py-1 text-brand-200 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t('land.badge')}
            </motion.span>
            <motion.h1 variants={stagger.item} className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {t('land.h1a')}<br /><span className="bg-gradient-to-r from-brand-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">{t('land.h1b')}</span>
            </motion.h1>
            <motion.p variants={stagger.item} className="mt-6 max-w-xl text-lg text-slate-300">{t('land.sub')}</motion.p>
            <motion.div variants={stagger.item} className="mt-9 flex flex-wrap gap-3">
              <Link to={user ? '/app' : '/royxat'} className="btn-primary px-6 py-3.5 text-base">{user ? t('land.open') : t('land.start')} <ArrowRight size={18} /></Link>
              {!user && (
                <button onClick={() => demo.mutate()} disabled={demo.isPending} className="btn px-6 py-3.5 text-base text-white ring-1 ring-white/25 hover:bg-white/10">
                  <PlayCircle size={18} /> {demo.isPending ? t('c.wait') : t('land.demo')}
                </button>
              )}
              <InstallButton className="btn px-6 py-3.5 text-base text-white ring-1 ring-white/25 hover:bg-white/10" />
            </motion.div>
          </motion.div>
          <PhonePreview />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <motion.div key={f.k} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            whileHover={{ y: -6 }} className="card group p-6">
            <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.cls} text-white shadow-lg transition group-hover:rotate-3 group-hover:scale-110`}><f.icon size={22} /></div>
            <h3 className="mt-5 font-bold">{t(`land.${f.k}.t` as TKey)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{t(`land.${f.k}.x` as TKey)}</p>
          </motion.div>
        ))}
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">© {new Date().getFullYear()} {t('app.name')}</footer>
      <Toasts />
    </div>
  );
}
