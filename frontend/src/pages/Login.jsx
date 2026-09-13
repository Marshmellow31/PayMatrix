import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Mail } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth.js';
import PublicHeader from '../components/public/PublicHeader.jsx';
import PublicFooter from '../components/public/PublicFooter.jsx';
import authService from '../services/authService.js';
import './LandingPage.css';
import './Login.css';

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
    <span className="mb-2 block text-xs font-bold text-white/70">{label}</span>
    <span className="relative block">
      <input
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className="auth-input h-12 w-full rounded-lg border border-white/20 bg-white/[0.04] px-4 pr-11 text-sm font-semibold text-white outline-none transition placeholder:text-white/45 focus:border-white/60 focus:bg-white/[0.07]"
      />
      {trailing}
    </span>
  </label>
);

const Login = ({ initialMode = 'sign-in' }) => {
  const location = useLocation();
  const requestedMode = new URLSearchParams(location.search).get('mode');
  const mode = requestedMode === 'create' || initialMode === 'create' ? 'create' : 'sign-in';
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

  return (
    <div className="landing auth-page">
      <a className="landing-skip" href="#auth-content">
        Skip to content
      </a>
      <PublicHeader />
      {pendingVerificationEmail ? (
        <main id="auth-content" className="auth-main auth-verify-main">
          <section className="auth-verify-card" aria-labelledby="verify-title">
            <div className="auth-verify-icon">
              <Mail size={26} aria-hidden="true" />
            </div>
            <h1 id="verify-title">Check your email.</h1>
            <p>
              We sent a verification link to <strong>{pendingVerificationEmail}</strong>. Open the
              link, then come back to continue.
            </p>
            <ol className="auth-verify-steps">
              <li>Open the email from paymatrix</li>
              <li>Verify your email address</li>
              <li>Return and continue</li>
            </ol>
            <button
              className="auth-submit"
              type="button"
              onClick={checkVerification}
              disabled={loading}
            >
              {loading ? 'Checking…' : 'I’ve verified my email'}
            </button>
            <button
              className="auth-subtle-action"
              type="button"
              onClick={resendVerification}
              disabled={loading}
            >
              Resend verification email
            </button>
            <button className="auth-subtle-action" type="button" onClick={useAnotherAccount}>
              <ArrowLeft size={15} aria-hidden="true" /> Use another account
            </button>
          </section>
        </main>
      ) : (
        <main id="auth-content" className="auth-main">
          <div className="landing-container auth-layout">
            <aside className="auth-story" aria-label="Why use paymatrix">
              <div
                className="auth-story-photo"
                role="img"
                aria-label="Friends sharing a meal at a cafe"
              />
              <div className="auth-story-shade" />
              <div className="auth-story-copy">
                <span>For every plan you share</span>
                <p>
                  Good memories.
                  <br />
                  Clear balances.
                </p>
                <small>Keep the spending story as clear as the plans.</small>
              </div>
            </aside>
            <section className="auth-form-panel" aria-labelledby="auth-title">
              <div className="auth-form-heading">
                <p>{mode === 'create' ? 'Create a group with clarity' : 'Welcome back'}</p>
                <h1 id="auth-title">
                  {mode === 'create' ? 'Create your account.' : 'Sign in to paymatrix.'}
                </h1>
                <span>
                  {mode === 'create'
                    ? 'Start tracking shared expenses with the people in your group.'
                    : 'Pick up where your group left off.'}
                </span>
              </div>

              <button
                className="auth-google"
                type="button"
                onClick={handleGoogle}
                disabled={loading}
              >
                <GoogleIcon /> {loading ? 'Please wait…' : 'Continue with Google'}
              </button>
              <div className="auth-divider">
                <span>or use email</span>
              </div>

              <form onSubmit={submit} className="auth-form">
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
                      className="auth-show-password"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  }
                />
                {mode === 'sign-in' && (
                  <button type="button" onClick={resetPassword} className="auth-forgot">
                    Forgot password?
                  </button>
                )}
                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading
                    ? 'Please wait…'
                    : mode === 'create'
                      ? 'Create account'
                      : 'Sign in with email'}
                </button>
              </form>

              {mode === 'create' && (
                <p className="auth-verification-note">
                  We’ll send a verification link before your account can access shared data.
                </p>
              )}
              <p className="auth-switch">
                {mode === 'create' ? 'Already have an account?' : 'New to paymatrix?'}{' '}
                <Link to={mode === 'create' ? '/login' : '/register'}>
                  {mode === 'create' ? 'Sign in' : 'Create an account'}
                </Link>
              </p>
              <p className="auth-legal">
                By continuing, you agree to the <Link to="/terms">Terms</Link> and acknowledge the{' '}
                <Link to="/privacy">Privacy Policy</Link>.
              </p>
            </section>
          </div>
        </main>
      )}
      <PublicFooter />
    </div>
  );
};

export default Login;
