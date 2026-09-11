import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../components/Background';
import {
  MontageCardMinFlow,
  MontageCardAnalytics,
  MontageCardOffline,
} from '../components/screens/MontageCards';
import { VIDEO_THEME } from '../constants/videoTheme';

export const MontageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Beat 1: Simple. / Analytics (frames 0 to 85)
  const p1Spring = spring({ frame, fps, config: { damping: 14, stiffness: 150 } });
  const p1Opacity = interpolate(frame, [0, 12, 72, 85], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const p1Scale = interpolate(p1Spring, [0, 1], [0.9, 1]);

  // Beat 2: Built for groups. Offline-first! (frames 80 to 165)
  const p2Spring = spring({ frame: frame - 80, fps, config: { damping: 14, stiffness: 150 } });
  const p2Opacity = interpolate(frame, [80, 92, 152, 165], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const p2Scale = interpolate(p2Spring, [0, 1], [0.9, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: VIDEO_THEME.canvas }}>
      <Background glowColor="rgba(255, 255, 255, 0.02)" glowIntensity={0.8} />

      {/* Beat 1: Simple! + Spending Analytics */}
      {frame < 88 && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '40px',
            opacity: p1Opacity,
            transform: `scale(${p1Scale})`,
            padding: '0 40px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontFamily: VIDEO_THEME.fonts.heading,
              fontSize: '104px',
              fontWeight: 900,
              letterSpacing: '-0.05em',
              color: '#ffffff',
            }}
          >
            Simple!
          </div>
          <MontageCardAnalytics />
        </AbsoluteFill>
      )}

      {/* Beat 2: Built for groups! Debt simplified! */}
      {frame >= 78 && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '40px',
            opacity: p2Opacity,
            transform: `scale(${p2Scale})`,
            padding: '0 40px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '84px',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: '#ffffff',
              }}
            >
              Built for groups!
            </div>
            <div
              style={{
                fontFamily: VIDEO_THEME.fonts.heading,
                fontSize: '44px',
                fontWeight: 800,
                color: '#34d399',
                marginTop: '10px',
              }}
            >
              Debt simplified!
            </div>
          </div>
          <MontageCardMinFlow />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
