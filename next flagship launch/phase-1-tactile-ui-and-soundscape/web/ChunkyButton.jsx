import React from 'react';
import { soundEngine } from './SoundEngine';

/**
 * ChunkyButton Component
 * Renders a mechanical 3D beveled button with tactile compression and audio trigger
 */
export const ChunkyButton = ({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'secondary' | 'danger'
  sound = 'pop',
  className = '',
  disabled = false,
  ...props
}) => {
  const handleClick = (e) => {
    if (disabled) return;
    soundEngine.play(sound);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    onClick?.(e);
  };

  const variantClass = {
    primary: 'btn-chunky-primary',
    secondary: 'btn-chunky-secondary',
    danger: 'btn-chunky-danger',
  }[variant] || 'btn-chunky-primary';

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${variantClass} ${disabled ? 'opacity-50 cursor-not-allowed shadow-none' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default ChunkyButton;
