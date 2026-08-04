import { Fingerprint, LockKeyhole, ShieldCheck, Users } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
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

const NativeLogin = ({ loading, onGoogleLogin }) => (
  <main className="native-login flex min-h-[100dvh] bg-[#0e0e0e] text-white">
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-6">
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white"
          >
            <span className="h-3 w-3 rounded-[4px] bg-[#0e0e0e]" />
          </div>
          <span className="text-sm font-black uppercase tracking-[0.16em]">PayMatrix</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300/80">
          <ShieldCheck size={14} /> Secured by Firebase
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center py-10">
        <div className="mb-9 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
          <Fingerprint size={31} strokeWidth={1.7} className="text-white" />
        </div>

        <h1 className="font-manrope text-[2.65rem] font-black leading-[1.02] tracking-normal">
          Your shared money,
          <span className="mt-1 block text-white/45">clear at a glance.</span>
        </h1>
        <p className="mt-5 max-w-sm text-[15px] leading-7 text-white/50">
          Choose a Google account on this phone to securely open your groups, balances, and activity.
        </p>

        <div className="mt-9 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4">
            <Users size={18} className="text-sky-300" />
            <p className="mt-3 text-xs font-bold text-white/80">One shared view</p>
            <p className="mt-1 text-[11px] leading-4 text-white/35">Live groups and balances.</p>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4">
            <LockKeyhole size={18} className="text-emerald-300" />
            <p className="mt-3 text-xs font-bold text-white/80">Private access</p>
            <p className="mt-1 text-[11px] leading-4 text-white/35">Device-native account sign-in.</p>
          </div>
        </div>
      </section>

      <footer className="pb-3">
        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={loading}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-white px-5 text-[15px] font-extrabold text-[#111] shadow-[0_10px_30px_rgba(255,255,255,0.08)] active:scale-[0.985] disabled:opacity-65"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Opening accounts...' : 'Continue with Google'}
        </button>
        <p className="mx-auto mt-4 max-w-xs text-center text-[10px] leading-4 text-white/30">
          Android will show the Google accounts already available on this device. PayMatrix never sees
          your Google password.
        </p>
      </footer>
    </div>
  </main>
);

export default NativeLogin;
