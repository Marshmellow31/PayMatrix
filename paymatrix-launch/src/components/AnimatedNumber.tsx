import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface AnimatedNumberProps {
  value: number;
  startValue?: number;
  startFrame?: number;
  durationInFrames?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: React.CSSProperties;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  startValue = 0,
  startFrame = 0,
  durationInFrames = 45,
  prefix = '',
  suffix = '',
  decimals = 2,
  style = {},
}) => {
  const frame = useCurrentFrame();

  const currentVal = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [startValue, value],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const formatted = currentVal.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
