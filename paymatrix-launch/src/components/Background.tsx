import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { VIDEO_THEME } from '../constants/videoTheme';

interface BackgroundProps {
  glowColor?: string;
  glowIntensity?: number;
  pulseSpeed?: number;
}

export const Background: React.FC<BackgroundProps> = ({
  glowColor = 'rgba(255, 255, 255, 0.03)',
  glowIntensity = 1,
  pulseSpeed = 0.02,
}) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * pulseSpeed) * 0.1 + 0.9;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: VIDEO_THEME.canvas,
        overflow: 'hidden',
      }}
    >
      {/* Global Production Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&family=Manrope:wght@600;700;800;900&display=swap');
      `}</style>

      {/* Studio Obsidian Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 45%, #0d0d0d 0%, #000000 75%)',
        }}
      />

      {/* Subtle Studio Key Light (Zero Green, Pure Neutral Falloff) */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          width: '900px',
          height: '1400px',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, rgba(0, 0, 0, 0) 70%)`,
          filter: 'blur(120px)',
          opacity: glowIntensity * pulse,
          pointerEvents: 'none',
        }}
      />

      {/* Studio Edge Falloff */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.85) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
