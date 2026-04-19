import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

/* Responsive bottom offset: clear the mobile bottom nav (bottom-6 + h-16 = ~6rem)
   but stay close to the edge on large screens */
const MOBILE_BOTTOM_CSS = `
  @media (max-width: 1023px) {
    .install-prompt-card { bottom: 6.25rem !important; }
  }
  @media (min-width: 1024px) {
    .install-prompt-card { bottom: 1.5rem !important; left: auto !important; right: auto !important; margin-left: auto !important; margin-right: auto !important; width: calc(100% - 2rem) !important; }
  }
`;

function PromptStyles() {
  return <style>{MOBILE_BOTTOM_CSS}</style>;
}

/**
 * InstallPrompt
 *
 * Covers all platforms:
 *  • Android / Chrome / Edge / Samsung Internet → native beforeinstallprompt
 *  • iOS Safari                                 → banner → Share → Add to Home Screen guide
 *  • Linux / macOS / Windows + Chrome / Edge    → native beforeinstallprompt
 *                                                  OR address-bar fallback if event doesn't fire
 *  • Linux / macOS / Windows + Firefox          → guide to open in Chrome or Edge
 *
 * Won't show:
 *  • Already running as a standalone PWA (display-mode: standalone)
 *  • User dismissed it this session (sessionStorage flag)
 */

function detectPlatform() {
  const ua = navigator.userAgent;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  const isAndroid = /android/i.test(ua);

  const isLinuxDesktop = /linux/i.test(ua) && !isAndroid;
  const isMacDesktop   = /macintosh|mac os x/i.test(ua) && !isIOS;
  const isWinDesktop   = /windows nt/i.test(ua) && !/windows phone/i.test(ua);
  const isDesktop      = isLinuxDesktop || isMacDesktop || isWinDesktop;

  const isFirefox = /firefox|fxios/i.test(ua);
  // Chrome/Chromium family (includes Edge, Brave, Opera, Samsung Internet)
  const isChromium = /chrome|chromium|crios/i.test(ua) && !/edg\//i.test(ua)
    ? true
    : /edg\//i.test(ua) || /brave/i.test(ua) || /opr\//i.test(ua);

  return { isStandalone, isIOS, isAndroid, isDesktop, isFirefox, isChromium };
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const closeBtn = {
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
  background: 'rgba(255,255,255,0.07)',
  border: 'none',
  borderRadius: '50%',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#a0a0a0',
  transition: 'background 0.2s',
};

const primaryBtn = {
  flexShrink: 0,
  background: 'linear-gradient(135deg, #ffffff, #d4d4d4)',
  color: '#1a1c1c',
  border: 'none',
  borderRadius: '9999px',
  padding: '8px 14px',
  fontWeight: 600,
  fontSize: '0.8rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  transition: 'transform 0.15s',
  textDecoration: 'none',
};

const ghostBtn = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '9999px',
  color: '#c6c6c6',
  fontSize: '0.8rem',
  padding: '7px 18px',
  cursor: 'pointer',
  fontWeight: 500,
};

// ─── Sub-views ────────────────────────────────────────────────────────────────

/** Compact one-liner row with an action button + inline dismiss X */
function BannerRow({ icon, title, subtitle, actionLabel, onAction, onDismiss }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      {/* App icon */}
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: 'linear-gradient(135deg, #ffffff18, #ffffff08)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <p style={{
          color: '#f0f0f0', fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3, marginBottom: '1px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {title}
        </p>
        <p style={{
          color: '#919191', fontSize: '0.73rem', lineHeight: 1.4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {subtitle}
        </p>
      </div>

      {/* Action button */}
      <button
        onClick={onAction}
        style={{ ...primaryBtn, flexShrink: 0, whiteSpace: 'nowrap' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {actionLabel}
      </button>

      {/* Dismiss X — inline, no overlap */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          background: 'rgba(255,255,255,0.07)',
          border: 'none',
          borderRadius: '50%',
          width: '26px',
          height: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#808080',
          padding: 0,
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

/** iOS share-sheet step guide */
function IOSGuide({ onDismiss }) {
  return (
    <div>
      <p style={{ color: '#f0f0f0', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.6rem' }}>
        Add to Home Screen
      </p>
      <ol style={{ color: '#b0b0b0', fontSize: '0.8rem', lineHeight: 1.7, paddingLeft: '1.1rem', marginBottom: '0.75rem' }}>
        <li>Tap the <strong style={{ color: '#e5e2e1' }}>Share</strong> button <span>⎋</span> in Safari's toolbar</li>
        <li>Scroll down and tap <strong style={{ color: '#e5e2e1' }}>"Add to Home Screen"</strong></li>
        <li>Tap <strong style={{ color: '#e5e2e1' }}>"Add"</strong> in the top-right corner</li>
      </ol>
      <button onClick={onDismiss} style={ghostBtn}>Got it</button>
    </div>
  );
}

/**
 * Chrome desktop fallback — shown when Chrome is detected on desktop
 * but beforeinstallprompt hasn't fired (e.g. dev mode, or Chrome skipped it).
 * Guides the user to use the address bar install icon.
 */
function ChromeDesktopGuide({ onDismiss }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.55rem' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #ffffff18, #ffffff08)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Monitor size={18} color="#e5e2e1" />
        </div>
        <p style={{ color: '#f0f0f0', fontWeight: 600, fontSize: '0.9rem' }}>
          Install PayMatrix
        </p>
      </div>

      <p style={{ color: '#919191', fontSize: '0.78rem', lineHeight: 1.55, marginBottom: '0.65rem' }}>
        Look for the{' '}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          background: 'rgba(255,255,255,0.1)', borderRadius: '5px',
          padding: '1px 6px', color: '#e5e2e1', fontWeight: 600, fontSize: '0.8rem',
        }}>
          ⊕
        </span>
        {' '}install icon at the right end of Chrome's address bar, then click{' '}
        <strong style={{ color: '#e5e2e1' }}>Install</strong>.
      </p>

      {/* Visual hint strip */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px',
        padding: '0.5rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        fontSize: '0.75rem',
        color: '#7a7a7a',
      }}>
        <span style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '6px',
          padding: '2px 8px',
          color: '#555',
          fontFamily: 'monospace',
          fontSize: '0.72rem',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {window.location.hostname}
        </span>
        <span style={{
          background: 'rgba(255,255,255,0.12)',
          borderRadius: '6px',
          padding: '3px 9px',
          color: '#e5e2e1',
          fontWeight: 700,
          fontSize: '0.85rem',
          letterSpacing: '-0.01em',
        }}>
          ⊕
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={onDismiss} style={ghostBtn}>Got it</button>
      </div>
    </div>
  );
}

/** Firefox / unsupported desktop browser guide */
function FirefoxGuide({ onDismiss }) {
  return (
    <div>
      <p style={{ color: '#f0f0f0', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
        Install PayMatrix
      </p>
      <p style={{ color: '#919191', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.65rem' }}>
        Firefox doesn't support app installation yet. Open PayMatrix in{' '}
        <strong style={{ color: '#e5e2e1' }}>Chrome</strong> or{' '}
        <strong style={{ color: '#e5e2e1' }}>Edge</strong> to install it as a desktop app.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a
          href="https://www.google.com/chrome/"
          target="_blank"
          rel="noopener noreferrer"
          style={primaryBtn}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          Get Chrome
        </a>
        <button onClick={onDismiss} style={ghostBtn}>Dismiss</button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible]   = useState(false);
  // view: 'banner' | 'banner-ios' | 'ios-guide' | 'chrome-desktop' | 'firefox-guide'
  const [view, setView]         = useState('banner');

  useEffect(() => {
    const { isStandalone, isIOS, isDesktop, isFirefox, isChromium } = detectPlatform();

    if (isStandalone) return;

    // Dismissed flag stored in localStorage with a 30-day expiry
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed-at');
    if (dismissedAt) {
      const ageMs = Date.now() - Number(dismissedAt);
      if (ageMs < 30 * 24 * 60 * 60 * 1000) {
        console.log('[InstallPrompt] suppressed — dismissed', Math.floor(ageMs / 86400000), 'days ago');
        return;
      }
    }

    console.log('[InstallPrompt] platform:', { isIOS, isDesktop, isFirefox, isChromium });

    // ── iOS Safari ──────────────────────────────────────────────────────────
    if (isIOS) {
      console.log('[InstallPrompt] iOS detected → showing share-sheet guide in 2.5s');
      const t = setTimeout(() => { setView('banner-ios'); setVisible(true); }, 2500);
      return () => clearTimeout(t);
    }

    // ── Desktop Firefox ─────────────────────────────────────────────────────
    if (isDesktop && isFirefox) {
      console.log('[InstallPrompt] Firefox desktop → showing Chrome/Edge guide in 2.5s');
      const t = setTimeout(() => { setView('firefox-guide'); setVisible(true); }, 2500);
      return () => clearTimeout(t);
    }

    // ── Chrome / Edge / Brave (all platforms) ────────────────────────────────
    // Listen for the native prompt first.
    // If it doesn't fire within 4 s and we're on a Chromium desktop browser,
    // fall back to the address-bar install guide (covers dev mode + prod edge cases).
    let nativePromptReceived = false;
    let fallbackTimer = null;

    const handler = (e) => {
      nativePromptReceived = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      e.preventDefault();
      setDeferredPrompt(e);
      setView('banner');
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (isDesktop && isChromium) {
      console.log('[InstallPrompt] Chromium desktop — waiting for beforeinstallprompt (fallback in 2s)');
      fallbackTimer = setTimeout(() => {
        if (!nativePromptReceived) {
          console.log('[InstallPrompt] beforeinstallprompt did not fire → showing address-bar guide');
          setView('chrome-desktop');
          setVisible(true);
        }
      }, 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    dismiss();
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('pwa-prompt-dismissed-at', String(Date.now()));
  };

  return (
    <>
      <PromptStyles />
      <AnimatePresence>
      {visible && (
        <motion.div
          key="install-prompt"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="install-prompt-card"
          style={{
            position: 'fixed',
            bottom: '6.25rem', // overridden per breakpoint by .install-prompt-card CSS
            left: '0.75rem',
            right: '0.75rem',
            margin: '0 auto',
            maxWidth: '440px',
            zIndex: 9999,
            background: 'rgba(22, 22, 22, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '1.25rem',
            padding: '0.85rem 1rem',
            boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
          }}
        >
          {/* Absolute close button only for expanded guide views */}
          {(view === 'ios-guide' || view === 'chrome-desktop' || view === 'firefox-guide') && (
            <button
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              style={closeBtn}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            >
              <X size={14} />
            </button>
          )}

          {/* ── Chrome/Edge native install banner ── */}
          {view === 'banner' && (
            <BannerRow
              icon={<Smartphone size={22} color="#e5e2e1" />}
              title="Install PayMatrix"
              subtitle="Add to your home screen for the best experience"
              actionLabel={<><Download size={13} /> Install</>}
              onAction={handleInstall}
              onDismiss={dismiss}
            />
          )}

          {/* ── iOS: compact banner first, then expands to guide ── */}
          {view === 'banner-ios' && (
            <BannerRow
              icon={<Smartphone size={24} color="#e5e2e1" />}
              title="Install PayMatrix"
              subtitle="Add to your home screen for the best experience"
              actionLabel="How?"
              onAction={() => setView('ios-guide')}
              onDismiss={dismiss}
            />
          )}

          {/* ── iOS full share-sheet guide ── */}
          {view === 'ios-guide' && <IOSGuide onDismiss={dismiss} />}

          {/* ── Chrome desktop address-bar fallback ── */}
          {view === 'chrome-desktop' && <ChromeDesktopGuide onDismiss={dismiss} />}

          {/* ── Firefox: redirect to Chrome/Edge ── */}
          {view === 'firefox-guide' && <FirefoxGuide onDismiss={dismiss} />}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
