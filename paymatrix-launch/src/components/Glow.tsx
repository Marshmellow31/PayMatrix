import React from 'react';

interface GlowProps {
  color?: string;
  size?: number;
  opacity?: number;
  style?: React.CSSProperties;
}

export const Glow: React.FC<GlowProps> = ({
  color = 'rgba(255, 255, 255, 0.05)',
  size = 400,
  opacity = 0.2,
  style = {},
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, rgba(0, 0, 0, 0) 70%)`,
        filter: 'blur(80px)',
        opacity,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};
