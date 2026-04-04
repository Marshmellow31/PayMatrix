import { useState, useEffect, memo, useRef } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';

const Avatar = memo(({ name = '', src = '', size = 'md', className = '' }) => {
  const isOnline = useOnlineStatus();
  const [imgSrc, setImgSrc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const timeoutRef = useRef(null);
  const imgRef = useRef(null);

  const MAX_RETRIES = 2; // Try original + 2 cache-busted retries (online only)
  // Online: wait up to 15s. Offline: wait 4s (SW responds from cache instantly if available, otherwise quick fail)
  const TIMEOUT_MS = isOnline ? 15000 : 4000;

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  // Reset and start fresh when src changes
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setHasError(false);
    setRetryCount(0);

    if (!src) {
      setImgSrc('');
      setIsLoading(false);
      return;
    }

    // Always attempt to load — when offline the SW will serve from its cache
    // if the image was previously fetched. Only skip if there's no src at all.
    setImgSrc(src);
    setIsLoading(true);
  }, [src]);

  // Safety watchdog — fires after TIMEOUT_MS if image hasn't loaded or errored
  useEffect(() => {
    if (!isLoading) return;
    if (timeoutRef.current) return; // don't start a second timer

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setIsLoading(false);
      setHasError(true);
    }, TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, TIMEOUT_MS]);

  const getInitials = (n) => {
    if (!n) return '?';
    return n
      .split(' ')
      .filter((x) => x.length > 0)
      .map((x) => x[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBackgroundColor = (n) => {
    if (!n) return '#1a1a1a';
    const presets = [
      'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
      'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    return presets[Math.abs(hash) % presets.length];
  };

  const handleLoad = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    // Only retry with cache-busting when online (pointless offline — SW handles it)
    if (retryCount < MAX_RETRIES && src && isOnline) {
      const newRetry = retryCount + 1;
      setRetryCount(newRetry);
      // Reset the watchdog timer for the retry attempt
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setImgSrc(`${src}${src.includes('?') ? '&' : '?'}cb=${Date.now()}`);
      return;
    }
    // All retries exhausted or offline with no cache — show initials
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setIsLoading(false);
    setHasError(true);
  };

  // CASE 1: No src or all retries failed — show initials or empty placeholder
  if (!imgSrc || hasError) {
    if (!name) {
      return (
        <div
          className={`${sizes[size]} rounded-full bg-white/5 animate-pulse shrink-0 border border-white/5 ${className}`}
        />
      );
    }
    return (
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-manrope font-black text-white shrink-0 border border-white/10 shadow-lg ${className}`}
        style={{
          background: getBackgroundColor(name),
          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      >
        <span className="tracking-tighter opacity-90">{getInitials(name)}</span>
      </div>
    );
  }

  // CASE 2: Has src — always attempt image load (SW serves cache when offline)
  return (
    <div
      className={`${sizes[size]} rounded-full shrink-0 relative ${className} transition-all duration-300 overflow-hidden shadow-lg border border-white/5 bg-white/5`}
    >
      {isLoading && (
        <div className="absolute inset-0 rounded-full animate-pulse overflow-hidden bg-white/[0.02]">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-shimmer" />
        </div>
      )}
      <img
        ref={imgRef}
        src={imgSrc}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`w-full h-full rounded-full object-cover transition-all duration-700 ${
          isLoading ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100 blur-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
