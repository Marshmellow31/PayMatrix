import { useState, useEffect, memo, useRef } from 'react';

const Avatar = memo(({ name = '', src = '', size = 'md', className = '' }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(!!src); // Start in loading state only if we have a src
  const [hasError, setHasError] = useState(false);
  const [retried, setRetried] = useState(false);
  const timeoutRef = useRef(null);
  const imgRef = useRef(null);

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  // Reset everything when src prop changes
  useEffect(() => {
    setHasError(false);
    setRetried(false);
    if (src) {
      setImgSrc(src);
      setIsLoading(true);
    } else {
      setImgSrc('');
      setIsLoading(false);
    }
  }, [src]);

  // Bulletproof safety watchdog — declared timeoutRef, starts fresh on mount
  // Clears on cleanup so re-renders don't reset it
  useEffect(() => {
    if (!isLoading) return; // Nothing to watch

    // Only start a new timer if one isn't already running
    if (timeoutRef.current) return;

    timeoutRef.current = setTimeout(() => {
      // If still loading after 5s, bail out and show initials
      setIsLoading(false);
      setHasError(true);
      timeoutRef.current = null;
    }, 5000);

    return () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [isLoading]);

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
    // Try once with a cache-busted URL for Google photos
    if (!retried && src?.includes('googleusercontent.com')) {
      setRetried(true);
      setImgSrc(`${src}${src.includes('?') ? '&' : '?'}cb=${Date.now()}`);
      return; // Don't set error yet — let the retry attempt
    }
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setIsLoading(false);
    setHasError(true);
  };

  // CASE 1: No src at all — show initials or pulsing placeholder
  if (!imgSrc || hasError) {
    if (!name) {
      // No name either — just a pulsing circle placeholder
      return (
        <div className={`${sizes[size]} rounded-full bg-white/5 animate-pulse shrink-0 border border-white/5 ${className}`} />
      );
    }
    // Show initials
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

  // CASE 2: Has src — try to load the image
  return (
    <div
      className={`${sizes[size]} rounded-full shrink-0 relative ${className} transition-all duration-300 overflow-hidden shadow-lg border border-white/5 bg-white/5`}
    >
      {/* Shimmer shown while loading */}
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
