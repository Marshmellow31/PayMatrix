import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../components/Background';
import { VIDEO_THEME } from '../constants/videoTheme';

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Smooth entrance spring
  const textSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  });

  const translateY = interpolate(textSpring, [0, 1], [40, 0]);
  const blur = interpolate(textSpring, [0, 1], [16, 0]);
  const scale = interpolate(frame, [0, 90], [0.97, 1.03]);

  // Exit transition matching 90 frame duration
  const exitOpacity = interpolate(frame, [72, 90], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: exitOpacity, backgroundColor: VIDEO_THEME.canvas }}>
      <Background glowColor="rgba(255, 255, 255, 0.02)" glowIntensity={0.8} />

      {/* Centered Vertical Typography */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 48px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            transform: `translateY(${translateY}px) scale(${scale})`,
            filter: `blur(${blur}px)`,
            textAlign: 'center',
            maxWidth: '980px',
          }}
        >
          <h1
            style={{
              fontFamily: VIDEO_THEME.fonts.heading,
              fontSize: '84px',
              fontWeight: 900,
              lineHeight: 1.06,
              letterSpacing: '-0.04em',
              textTransform: 'uppercase',
              color: '#ffffff',
              margin: 0,
              background: 'linear-gradient(180deg, #ffffff 45%, rgba(255, 255, 255, 0.6) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Splitting Expenses
            <br />
            Shouldn't Be Complicated.
          </h1>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
