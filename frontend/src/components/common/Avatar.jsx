import { useState, useEffect, memo, useRef } from 'react';

const Avatar = memo(({ name = '', src = '', size = 'md', className = '' }) => {
  const [isLoading, setIsLoading] = useState(!!src);
  const [hasError, setHasError] = useState(false);
  const timeoutRef = useRef(null);

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  // Reset when src changes
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setHasError(false);

    if (src) {
      setIsLoading(true);

      // Safety timeout — if the image hasn't loaded after 8s, show initials
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setHasError(true);
      }, 8000);
    } else {
      setIsLoading(false);
    }

    return () => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [src]);

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
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setIsLoading(false);
    setHasError(true);
  };

  // Show initials if no src or if loading failed
  if (!src || hasError) {
    if (!name) {
      return (
        <div className={`${sizes[size]} rounded-full bg-white/5 shrink-0 border border-white/5 ${className}`} />
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

  // Attempt to load the image
  return (
    <div className={`${sizes[size]} rounded-full shrink-0 relative ${className} overflow-hidden shadow-lg border border-white/5 bg-white/5`}>
      {isLoading && (
        <div className="absolute inset-0 rounded-full animate-pulse overflow-hidden bg-white/[0.02]">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-shimmer" />
        </div>
      )}
      <img
        src={src}
        alt={name || ''}
        referrerPolicy="no-referrer"
        className={`w-full h-full rounded-full object-cover transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
