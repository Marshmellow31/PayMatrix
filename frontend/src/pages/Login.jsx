import { motion } from 'framer-motion';
import { ArrowRight, Fingerprint, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import toast from 'react-hot-toast';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

const Brand = () => (
  <div className="flex items-center gap-3">
    <img src="/brand-mark.svg" alt="" className="h-9 w-9 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.12)] sm:h-10 sm:w-10" />
    <span className="text-sm font-black uppercase tracking-[0.16em] sm:text-base">PayMatrix</span>
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  const { googleLogin, loading } = useAuth();

  const handleGoogleLogin = async () => {
    const result = await googleLogin();
    if (result.meta?.requestStatus === 'rejected') {
      toast.error(result.payload || 'Google login failed');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0e0e0e] text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-white/[0.05] blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-sky-400/[0.06] blur-[140px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
        <header className="flex items-center justify-between">
          <Brand />
          <button onClick={() => navigate('/?preview=1')} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/55 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-white sm:px-4 sm:text-xs">
            <Sparkles size={14} className="text-emerald-300" /> Preview onboarding
          </button>
        </header>

        <section className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.82fr] lg:gap-20">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/55"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" /> Shared expenses, made clear</div>
              <h1 className="font-manrope text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-7xl">Welcome back.<br /><span className="text-white/35">See what’s fair.</span></h1>
              <p className="mt-6 max-w-lg text-sm leading-7 text-white/50 sm:text-base">Sign in to return to your groups, balances, and shared activity — all in one clear place.</p>

              <div className="mt-8 grid max-w-xl gap-2 sm:grid-cols-3 sm:gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"><Zap size={16} className="text-emerald-300" /><p className="mt-4 text-xs font-bold text-white/70">Live balances</p><p className="mt-1 text-[10px] leading-4 text-white/35">Everyone sees the same answer.</p></div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"><Users size={16} className="text-sky-300" /><p className="mt-4 text-xs font-bold text-white/70">Real groups</p><p className="mt-1 text-[10px] leading-4 text-white/35">Trips, homes, and shared plans.</p></div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"><Fingerprint size={16} className="text-amber-200" /><p className="mt-4 text-xs font-bold text-white/70">Private by default</p><p className="mt-1 text-[10px] leading-4 text-white/35">Your data stays yours.</p></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="w-full max-w-md justify-self-center rounded-[1.75rem] border border-white/10 bg-[#171717]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:p-7">
              <div className="mb-7"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black"><ShieldCheck size={21} /></div><h2 className="font-manrope text-2xl font-black tracking-[-0.04em] sm:text-3xl">Sign in to PayMatrix.</h2><p className="mt-2 text-sm leading-6 text-white/40">Your groups are waiting exactly where you left them.</p></div>
              <button onClick={handleGoogleLogin} disabled={loading} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 text-sm font-black text-black shadow-[0_12px_35px_rgba(255,255,255,0.1)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70">{loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" /> : <GoogleIcon />}{loading ? 'Signing in…' : 'Continue with Google'}</button>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2.5 text-[11px] text-emerald-100/70"><ShieldCheck size={14} className="shrink-0 text-emerald-300" /> Secure sign-in. Your shared data stays private.</div>
              <div className="mt-6 border-t border-white/[0.08] pt-5 text-center"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25">Not ready to sign in yet?</p><button onClick={() => navigate('/?preview=1')} className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/65 transition hover:text-white">Try the interactive preview <ArrowRight size={14} /></button></div>
            </motion.div>
          </div>
        </section>

        <p className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/20 sm:text-[10px]">Private by default · ready when your group is</p>
      </div>
    </main>
  );
};

export default Login;
