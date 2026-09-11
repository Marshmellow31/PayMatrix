import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { THEME } from '../constants/theme';

interface KineticTextProps {
  text: string;
  delay?: number;
  fontSize?: number | string;
  fontWeight?: number | string;
  color?: string;
  gradient?: string;
  letterSpacing?: string;
  style?: React.CSSProperties;
  align?: 'left' | 'center' | 'right';
  staggerWords?: boolean;
}

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  delay = 0,
  fontSize = '48px',
  fontWeight = 800,
  color = THEME.colors.textPrimary,
  gradient,
  letterSpacing = '-0.03em',
  style = {},
  align = 'center',
  staggerWords = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.split(' ');

  if (!staggerWords) {
    const sp = spring({
      frame: frame - delay,
      fps,
      config: { damping: 18, stiffness: 120, mass: 0.8 },
    });

    const translateY = interpolate(sp, [0, 1], [30, 0]);
    const blur = interpolate(sp, [0, 1], [10, 0]);
    const opacity = interpolate(sp, [0, 1], [0, 1]);

    return (
      <div
        style={{
          fontSize,
          fontWeight,
          fontFamily: THEME.fonts.heading,
          color,
          letterSpacing,
          textAlign: align,
          transform: `translateY(${translateY}px)`,
          filter: `blur(${blur}px)`,
          opacity,
          background: gradient,
          WebkitBackgroundClip: gradient ? 'text' : undefined,
          WebkitTextFillColor: gradient ? 'transparent' : undefined,
          ...style,
        }}
      >
        {text}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
        gap: '0.28em',
        fontFamily: THEME.fonts.heading,
        fontSize,
        fontWeight,
        color,
        letterSpacing,
        ...style,
      }}
    >
      {words.map((word, i) => {
        const wordDelay = delay + i * 4;
        const sp = spring({
          frame: frame - wordDelay,
          fps,
          config: { damping: 18, stiffness: 140, mass: 0.7 },
        });

        const translateY = interpolate(sp, [0, 1], [24, 0]);
        const blur = interpolate(sp, [0, 1], [8, 0]);
        const opacity = interpolate(sp, [0, 1], [0, 1]);

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${translateY}px)`,
              filter: `blur(${blur}px)`,
              opacity,
              background: gradient,
              WebkitBackgroundClip: gradient ? 'text' : undefined,
              WebkitTextFillColor: gradient ? 'transparent' : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
