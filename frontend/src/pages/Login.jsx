import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth.js';
import toast from 'react-hot-toast';

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FeatureRow = ({ icon, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{
      width: '36px', height: '36px', borderRadius: '10px',
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: 'rgba(255,255,255,0.5)'
    }}>
      {icon}
    </div>
    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{text}</span>
  </div>
);

const Login = () => {
  const { googleLogin, loading } = useAuth();

  const handleGoogleLogin = async () => {
    const result = await googleLogin();
    if (result.meta?.requestStatus === 'rejected') {
      toast.error(result.payload || 'Google login failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#0e0e0e',
      display: 'flex',
      alignItems: 'stretch',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Global ambient glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '50%', height: '60%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '50%', height: '60%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.02) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ─── LEFT PANEL — Branding ─── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{
          flex: '1 1 55%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 'clamp(40px, 6vw, 80px)',
          background: 'linear-gradient(145deg, #191919 0%, #111111 100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
        className="login-left-panel"
      >
        {/* Subtle grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), 
                            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}
        >
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(255,255,255,0.1)',
          }}>
            <div style={{ width: '20px', height: '20px', background: '#0e0e0e', borderRadius: '5px' }} />
          </div>
          <span style={{
            fontSize: '20px', fontWeight: 800, color: '#ffffff',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>PayMatrix</span>
        </motion.div>

        {/* Main Hero Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '100px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '28px',
          }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px rgba(74,222,128,0.6)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Obsidian Edition
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 800, color: '#ffffff',
            lineHeight: 1.05, letterSpacing: '-0.03em',
            marginBottom: '24px',
          }}>
            The New<br />
            <span style={{
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.35) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Standard of Clarity
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(14px, 1.5vw, 17px)',
            color: 'rgba(255,255,255,0.38)',
            lineHeight: 1.7, maxWidth: '400px',
            marginBottom: '48px',
          }}>
            A highly secure, synchronized vault for modern wealth management — built for precision and peace of mind.
          </p>

          {/* Feature List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <FeatureRow
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              text="Real-time expense tracking with instant sync across all devices"
            />
            <FeatureRow
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              text="Split bills effortlessly with smart group expense management"
            />
            <FeatureRow
              icon={<ShieldIcon />}
              text="End-to-end encrypted with AES-256 and secure cloud backup"
            />
          </div>
        </motion.div>

        {/* Bottom Watermark */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>
            PayMatrix © 2026 — Obsidian Standard
          </p>
        </motion.div>
      </motion.div>

      {/* ─── RIGHT PANEL — Authentication ─── */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{
          flex: '0 0 clamp(360px, 40%, 520px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 'clamp(32px, 5vw, 72px) clamp(24px, 4vw, 60px)',
          background: '#131313',
          position: 'relative',
          zIndex: 1,
        }}
        className="login-right-panel"
      >
        {/* Top ambient glow */}
        <div style={{
          position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '200px',
          background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: '360px', position: 'relative', zIndex: 1 }}>
          {/* Mobile-only logo */}
          <div style={{ display: 'none' }} className="mobile-logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', justifyContent: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '16px', height: '16px', background: '#0e0e0e', borderRadius: '4px' }} />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>PayMatrix</span>
            </div>
          </div>

          {/* Welcome text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: '40px' }}
          >
            <h2 style={{
              fontSize: 'clamp(28px, 3.5vw, 38px)',
              fontWeight: 800, color: '#ffffff',
              letterSpacing: '-0.03em', lineHeight: 1.1,
              marginBottom: '14px',
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.65 }}>
              Sign in to access your secure digital vault. Your data is always encrypted and private.
            </p>
          </motion.div>

          {/* Google Sign-In Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '17px 24px',
                background: loading ? 'rgba(255,255,255,0.85)' : '#ffffff',
                border: 'none',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1) inset',
                transform: 'scale(1)',
                marginBottom: '28px',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'scale(1.015)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1) inset'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1) inset'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.015)'; }}
            >
              {loading ? (
                <div style={{
                  width: '22px', height: '22px', border: '2px solid rgba(0,0,0,0.15)',
                  borderTopColor: '#131313', borderRadius: '50%',
                  animation: 'spin 0.75s linear infinite',
                }} />
              ) : (
                <GoogleIcon />
              )}
              <span style={{
                fontSize: '16px', fontWeight: 700, color: '#131313',
                letterSpacing: '-0.01em',
              }}>
                {loading ? 'Signing in…' : 'Continue with Google'}
              </span>
            </button>

            {/* Trust Signals */}
            <div style={{
              padding: '20px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#4ade80',
                  boxShadow: '0 0 12px rgba(74,222,128,0.7)',
                  animation: 'pulse 2s ease-in-out infinite',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Cloud Sync Active
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', lineHeight: 1.65 }}>
                Secure PayMatrix infrastructure. All data is end-to-end encrypted with AES-256 standard protocols.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['AES-256', 'OAuth 2.0', 'Zero-Trust'].map(tag => (
                  <span key={tag} style={{
                    padding: '4px 10px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '10px', color: 'rgba(255,255,255,0.3)',
                    fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{ marginTop: '32px', textAlign: 'center' }}
          >
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
              Obsidian Standard • AES-256 Encryption
            </p>
          </motion.div>
        </div>
      </motion.div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 768px) {
          .login-left-panel {
            display: none !important;
          }
          .login-right-panel {
            flex: 1 1 100% !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 48px 24px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
