import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth.js';
import AppLogo from '../components/common/AppLogo.jsx';
import authService from '../services/authService.js';

const GoogleIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
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
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

const friendlyAuthError = (message = '') => {
  if (message.includes('auth/operation-not-allowed')) return 'Email sign-in is not enabled yet.';
  if (message.includes('auth/email-already-in-use'))
    return 'This email already has an account. Sign in or continue with Google.';
  if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password'))
    return 'Email or password is incorrect.';
  if (message.includes('auth/weak-password'))
    return 'Use a stronger password with at least 8 characters.';
  if (message.includes('auth/too-many-requests'))
    return 'Too many attempts. Wait a moment and try again.';
  if (message.includes('auth/network-request-failed'))
    return 'Check your connection and try again.';
  return message || 'Authentication could not be completed.';
};

const Field = ({ label, type = 'text', autoComplete, placeholder, value, onChange, trailing }) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
      {label}
    </span>
    <span className="relative block">
      <input
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.045] px-4 pr-11 text-sm font-semibold text-white outline-none transition placeholder:text-white/20 focus:border-white/25 focus:bg-white/[0.065]"
      />
      {trailing}
    </span>
  </label>
);

const Login = ({ initialMode = 'sign-in' }) => {
  const location = useLocation();
  const requestedMode = new URLSearchParams(location.search).get('mode');
  const [mode, setMode] = useState(requestedMode === 'create' ? 'create' : initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const {
    googleLogin,
    registerWithEmail,
    emailLogin,
    confirmEmailVerification,
    resendEmailVerification,
    requestPasswordReset,
    pendingVerificationEmail,
    loading,
  } = useAuth();

  useEffect(() => {
    if (pendingVerificationEmail) setEmail(pendingVerificationEmail);
  }, [pendingVerificationEmail]);

  const showError = (result, fallback) => {
    if (result.meta?.requestStatus === 'rejected') {
      toast.error(friendlyAuthError(result.payload || fallback));
      return true;
    }
    return false;
  };

  const handleGoogle = async () => showError(await googleLogin(), 'Google sign-in failed.');

  const submit = async (event) => {
    event.preventDefault();
    if (mode === 'create' && password.length < 8) {
      toast.error('Use at least 8 characters for your password.');
      return;
    }
    const result =
      mode === 'create'
        ? await registerWithEmail({ name, email, password })
        : await emailLogin({ email, password });
    if (!showError(result, 'Email authentication failed.') && mode === 'create') {
      toast.success('Verification email sent.');
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      toast.error('Enter your email address first.');
      return;
    }
    const result = await requestPasswordReset(email);
    if (!showError(result, 'Password reset failed.')) {
      toast.success('If that address has an account, a reset email is on its way.');
    }
  };

  const checkVerification = async () => {
    const result = await confirmEmailVerification();
    if (showError(result, 'Could not check verification.')) return;
    if (!result.payload?.user) toast.error('Not verified yet. Open the link in your email first.');
  };

  const resendVerification = async () => {
    const result = await resendEmailVerification();
    if (!showError(result, 'Could not resend verification.'))
      toast.success('Verification email resent.');
  };

  const useAnotherAccount = async () => {
    await authService.signOut();
    window.location.replace('/login');
  };

  if (pendingVerificationEmail) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#0e0e0e] px-5 py-8 text-white">
        <section className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#171717] p-6 shadow-[0_30px_100px_rgba(0,0,0,.5)] sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300/[0.1] text-emerald-300">
            <Mail size={26} />
          </div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/70">
            One last step
          </p>
          <h1 className="mt-2 font-manrope text-3xl font-black tracking-[-0.04em]">
            Check your email.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/45">
            We sent a verification link to{' '}
            <span className="font-bold text-white/80">{pendingVerificationEmail}</span>. Open it to
            activate your account, then return to paymatrix.
          </p>
          <div className="mt-6 space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            {['Open the email from paymatrix', 'Tap Verify email', 'Return and continue'].map(
              (item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-xs font-semibold text-white/60"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.07] text-[9px] text-white/70">
                    {index + 1}
                  </span>
                  {item}
                </div>
              )
            )}
          </div>
          <button
            onClick={checkVerification}
            disabled={loading}
            className="mt-6 h-12 w-full rounded-xl bg-white text-sm font-black text-black transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Checking…' : 'I’ve verified my email'}
          </button>
          <button
            onClick={resendVerification}
            disabled={loading}
            className="mt-3 h-11 w-full text-xs font-bold text-white/45 transition hover:text-white disabled:opacity-50"
          >
            Resend verification email
          </button>
          <button
            onClick={useAnotherAccount}
            className="mt-2 flex w-full items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/25 hover:text-white/60"
          >
            <ArrowLeft size={13} /> Use another account
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#0e0e0e] text-white">
      <div className="pointer-events-none absolute -left-48 -top-48 h-[34rem] w-[34rem] rounded-full bg-white/[0.055] blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-40 h-[34rem] w-[34rem] rounded-full bg-emerald-300/[0.045] blur-[140px]" />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppLogo size="sm" decorative />
            <span className="text-sm font-black lowercase tracking-[0.04em] sm:text-base">
              paymatrix
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300/75">
            <ShieldCheck size={14} /> Secured by Firebase
          </span>
        </header>

        <section className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1fr_.78fr] lg:gap-20">
          <div className="hidden max-w-xl lg:block">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045]">
              <LockKeyhole size={21} className="text-emerald-300" />
            </div>
            <h1 className="font-manrope text-7xl font-black leading-[.94] tracking-[-.055em]">
              Your money.
              <br />
              <span className="text-white/35">Your way in.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/45">
              Use Google for speed or your email for universal access. Your groups, balances, and
              shared activity stay in one secure account.
            </p>
            <div className="mt-8 flex gap-7 text-xs font-bold text-white/40">
              {['Email verified', 'Firebase secured', 'Same data'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check size={15} className="text-emerald-300" /> {item}
                </span>
              ))}
            </div>
          </div>

          <section className="mx-auto w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#171717]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,.48)] sm:rounded-[1.75rem] sm:p-7">
            <div className="mb-5 lg:hidden">
              <h1 className="font-manrope text-[2rem] font-black leading-none tracking-[-.045em]">
                Welcome to paymatrix.
              </h1>
              <p className="mt-2 text-xs leading-5 text-white/40">
                Sign in securely and return to your shared expenses.
              </p>
            </div>

            <div className="grid grid-cols-2 rounded-xl bg-white/[0.045] p-1">
              {['sign-in', 'create'].map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={`h-10 rounded-lg text-xs font-black transition active:scale-[0.98] ${mode === item ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                >
                  {item === 'sign-in' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <button
              onClick={handleGoogle}
              disabled={loading}
              className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] text-sm font-black transition hover:bg-white/[0.07] active:scale-[0.98] disabled:opacity-60"
            >
              <GoogleIcon /> {loading ? 'Please wait…' : 'Continue with Google'}
            </button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/[0.07]" />
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/25">
                or use email
              </span>
              <span className="h-px flex-1 bg-white/[0.07]" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'create' && (
                <Field
                  label="Your name"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              )}
              <Field
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Field
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                placeholder={mode === 'create' ? 'At least 8 characters' : 'Your password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-white/30 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              {mode === 'sign-in' && (
                <button
                  type="button"
                  onClick={resetPassword}
                  className="-mt-1 block w-full text-right text-[11px] font-bold text-white/45 hover:text-white"
                >
                  Forgot password?
                </button>
              )}
              <button
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-sm font-black text-black transition active:scale-[0.98] disabled:opacity-60"
              >
                {loading
                  ? 'Please wait…'
                  : mode === 'create'
                    ? 'Create account'
                    : 'Sign in with email'}
              </button>
            </form>

            {mode === 'create' && (
              <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-white/35">
                <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-300" /> We’ll send a
                verification link before your account can access shared data.
              </p>
            )}
            <p className="mt-5 border-t border-white/[0.06] pt-4 text-center text-[9.5px] leading-4 text-white/25">
              By continuing, you agree to the{' '}
              <Link className="text-white/55 underline" to="/terms">
                Terms
              </Link>{' '}
              and acknowledge the{' '}
              <Link className="text-white/55 underline" to="/privacy">
                Privacy Policy
              </Link>
              .
              <br />
              Non-custodial calculation ledger · We do not hold or move money
            </p>
          </section>
        </section>
      </div>
    </main>
  );
};

export default Login;
