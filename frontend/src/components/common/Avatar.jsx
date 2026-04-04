import { useState, useEffect, memo, useRef } from 'react';

const Avatar = memo(({ name = '', src = '', size = 'md', className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef(null);

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  useEffect(() => {
    // Reset states when src changes
    setHasError(false);
    setRetryCount(0);
    
    if (src) {
      // Check if image is already cached
      if (imgRef.current && imgRef.current.complete) {
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    } else {
      setIsLoading(false);
    }
  }, [src]);

  const getInitials = (n) => {
    if (!n) return '?';
    return n
      .split(' ')
      .filter(x => x.length > 0)
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

  const handleError = () => {
    if (retryCount === 0 && src?.includes('googleusercontent.com')) {
      setRetryCount(1);
      return;
    }
    setHasError(true);
    setIsLoading(false);
  };

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        if (isLoading) {
          console.warn(`[AVATAR_TIMEOUT] Image load timed out for: ${name}`);
          setIsLoading(false);
          setHasError(true);
        }
      }, 6000); // 6s safety timeout
    }
    return () => clearTimeout(timer);
  }, [isLoading, name]);

  const displaySrc = retryCount > 0 && src 
    ? `${src}${src.includes('?') ? '&' : '?'}retry=${Date.now()}` 
    : src;

  // 1. Success Case: Render Image
  if (src && !hasError) {
    return (
      <div className={`${sizes[size]} rounded-full shrink-0 relative ${className} transition-all duration-300 overflow-hidden shadow-lg border border-white/5 bg-white/5`}>
        {isLoading && (
          <div className="absolute inset-0 rounded-full animate-pulse overflow-hidden bg-white/[0.02]">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-shimmer" />
          </div>
        )}
        <img
          ref={imgRef}
          src={displaySrc}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className={`w-full h-full rounded-full object-cover transition-all duration-700 ${isLoading ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100 blur-0'}`}
          onLoad={() => setIsLoading(false)}
          onError={handleError}
        />
      </div>
    );
  }

  // 2. Fallback if loading user info or if image failed
  if (!name) {
    return (
      <div className={`${sizes[size]} rounded-full bg-white/5 animate-pulse shrink-0 border border-white/5 ${className}`} />
    );
  }

  // 3. Final fallback: Initials
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-manrope font-black text-white shrink-0 border border-white/10 shadow-lg ${className}`}
      style={{ 
        background: getBackgroundColor(name),
        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }}
    >
      <span className="tracking-tighter opacity-90">{getInitials(name)}</span>
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
