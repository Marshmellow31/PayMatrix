import { motion } from 'framer-motion';
import { ArrowRight, Fingerprint, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import toast from 'react-hot-toast';
import NativeLogin from './NativeLogin.jsx';
import { isNativeRuntime } from '#paymatrix-runtime';
import AppLogo from '../components/common/AppLogo.jsx';

const GoogleIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

const Brand = () => (
  <div className="flex items-center gap-2.5">
    <AppLogo size="sm" decorative />
    <span className="text-sm font-black uppercase tracking-[0.16em] sm:text-base">PayMatrix</span>
  </div>
);

const FeatureCards = ({ className }) => (
  <div className={`grid gap-2 sm:grid-cols-3 sm:gap-3 ${className}`}>
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <Zap size={16} className="text-emerald-300" />
      <p className="mt-4 text-xs font-bold text-white/70">Live balances</p>
      <p className="mt-1 text-[10px] leading-4 text-white/35">Everyone sees the same answer.</p>
    </div>
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <Users size={16} className="text-sky-300" />
      <p className="mt-4 text-xs font-bold text-white/70">Real groups</p>
      <p className="mt-1 text-[10px] leading-4 text-white/35">Trips, homes, and shared plans.</p>
    </div>
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <Fingerprint size={16} className="text-amber-200" />
      <p className="mt-4 text-xs font-bold text-white/70">Private by default</p>
      <p className="mt-1 text-[10px] leading-4 text-white/35">Your data stays yours.</p>
    </div>
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

  if (isNativeRuntime()) {
    return <NativeLogin loading={loading} onGoogleLogin={handleGoogleLogin} />;
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#0e0e0e] text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-white/[0.05] blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-sky-400/[0.06] blur-[140px]" />

      <div className="relative mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8 sm:py-7 lg:px-12">
        <header className="flex items-center justify-between">
          <Brand />
          <button
            onClick={() => navigate('/?preview=1')}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-white/55 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-white min-[390px]:px-3 sm:px-4 sm:text-xs"
          >
            <Sparkles size={14} className="text-emerald-300" />
            <span>
              <span className="hidden min-[390px]:inline">Preview </span>onboarding
            </span>
          </button>
        </header>

        <section className="flex min-h-0 flex-1 items-center justify-center py-3 sm:py-8 lg:py-10">
          <div className="grid w-full max-w-6xl items-center gap-4 sm:gap-7 lg:grid-cols-[1fr_0.82fr] lg:gap-20">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl"
            >
              <h1 className="font-manrope text-[2rem] font-black leading-[0.96] tracking-[-0.045em] min-[390px]:text-4xl sm:text-6xl lg:text-7xl">
                Welcome back.
                <br />
                <span className="text-white/35">See what’s fair.</span>
              </h1>
              <p className="mt-3 max-w-lg text-xs leading-5 text-white/50 min-[390px]:text-sm sm:mt-5 sm:text-base sm:leading-7 [@media(max-height:600px)]:hidden">
                Sign in to return to your groups, balances, and shared activity — all in one clear
                place.
              </p>

              <FeatureCards className="hidden lg:grid mt-8 max-w-xl" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-md justify-self-center rounded-[1.35rem] border border-white/10 bg-[#171717]/95 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.45)] min-[390px]:p-5 sm:rounded-[1.75rem] sm:p-7"
            >
              <div className="mb-4 sm:mb-7">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black sm:mb-4 sm:h-11 sm:w-11 sm:rounded-2xl">
                  <ShieldCheck size={21} />
                </div>
                <h2 className="font-manrope text-xl font-black tracking-[-0.04em] sm:text-3xl">
                  Sign in to PayMatrix.
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-white/40 sm:mt-2 sm:text-sm sm:leading-6">
                  Your groups are waiting exactly where you left them.
                </p>
              </div>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-5 text-sm font-black text-black shadow-[0_12px_35px_rgba(255,255,255,0.1)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:rounded-2xl"
              >
                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                ) : (
                  <GoogleIcon />
                )}
                {loading ? 'Signing in…' : 'Continue with Google'}
              </button>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-[10px] text-emerald-100/70 sm:mt-4 sm:py-2.5 sm:text-[11px]">
                <ShieldCheck size={14} className="shrink-0 text-emerald-300" /> Secure sign-in. Your
                shared data stays private.
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
                <p className="text-[10.5px] text-white/40 font-inter leading-relaxed max-w-sm mx-auto">
                  By continuing with Google, you agree to our{' '}
                  <Link
                    to="/terms"
                    className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-primary hover:decoration-primary transition-all font-semibold"
                  >
                    Terms of Service
                  </Link>{' '}
                  and acknowledge our{' '}
                  <Link
                    to="/privacy"
                    className="text-white/80 underline decoration-white/30 underline-offset-4 hover:text-primary hover:decoration-primary transition-all font-semibold"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
                <p className="mt-1.5 text-[9.5px] text-white/25 font-inter">
                  Non-custodial calculation ledger · We do not hold or move money
                </p>
              </div>

              <div className="mt-3 border-t border-white/[0.08] pt-3 text-center min-[390px]:mt-4 min-[390px]:pt-4 sm:mt-5 sm:pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25">
                  Not ready to sign in yet?
                </p>
                <button
                  onClick={() => navigate('/?preview=1')}
                  className="mt-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/65 transition hover:text-white sm:mt-3 sm:text-xs"
                >
                  Try the interactive preview <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        <p className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/20 sm:text-[10px]">
          Private by default · ready when your group is
        </p>
      </div>
    </main>
  );
};

export default Login;
