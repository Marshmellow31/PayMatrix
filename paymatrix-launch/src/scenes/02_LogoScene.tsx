import React from 'react';
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../components/Background';
import { VIDEO_THEME } from '../constants/videoTheme';

export const LogoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo mark entrance
  const logoSpring = spring({
    frame: frame - 4,
    fps,
    config: { damping: 18, stiffness: 130, mass: 0.8 },
  });

  const logoScale = interpolate(logoSpring, [0, 1], [0.85, 1]);
  const logoBlur = interpolate(logoSpring, [0, 1], [14, 0]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  // Tagline reveal
  const tagSpring = spring({
    frame: frame - 18,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const tagTranslateY = interpolate(tagSpring, [0, 1], [20, 0]);
  const tagOpacity = interpolate(tagSpring, [0, 1], [0, 1]);

  // Silver light sweep over logo
  const sweepPos = interpolate(frame, [12, 50], [-150, 250], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Smooth exit transition into Scene 03 (75f duration)
  const exitOpacity = interpolate(frame, [60, 75], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitScale = interpolate(frame, [60, 75], [1, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: exitOpacity, backgroundColor: VIDEO_THEME.canvas }}>
      <Background glowColor="rgba(255, 255, 255, 0.03)" glowIntensity={1} />

      {/* Brand Group */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${exitScale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 20,
        }}
      >
        {/* Diamond Emblem */}
        <div
          style={{
            position: 'relative',
            width: '140px',
            height: '140px',
            borderRadius: '40px',
            border: `1px solid ${VIDEO_THEME.borderHigh}`,
            boxShadow: '0 24px 60px rgba(0,0,0,0.9)',
            transform: `scale(${logoScale})`,
            filter: `blur(${logoBlur}px)`,
            opacity: logoOpacity,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: '#000000',
          }}
        >
          <img
            src={staticFile('logo.png')}
            alt="PayMatrix"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.32)' }}
          />

          {/* Silver Sheen Sweep */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${sweepPos}%`,
              width: '60%',
              height: '100%',
              background:
                'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              transform: 'skewX(-25deg)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Brand Wordmark */}
        <h1
          style={{
            fontFamily: VIDEO_THEME.fonts.heading,
            fontSize: '88px',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            margin: '28px 0 0 0',
            color: '#ffffff',
            transform: `scale(${logoScale})`,
            filter: `blur(${logoBlur}px)`,
            opacity: logoOpacity,
            background: 'linear-gradient(180deg, #ffffff 40%, rgba(255, 255, 255, 0.6) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          paymatrix
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontFamily: VIDEO_THEME.fonts.body,
            fontSize: '28px',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: VIDEO_THEME.textDim,
            margin: '12px 0 0 0',
            transform: `translateY(${tagTranslateY}px)`,
            opacity: tagOpacity,
          }}
        >
          Shared expenses. Simplified.
        </p>
      </div>
    </AbsoluteFill>
  );
};
