import React, { useEffect, useState, useRef } from 'react';

/**
 * RollingNumber Component
 * Smoothly interpolates numeric changes with spring damping physics
 */
export const RollingNumber = ({ value = 0, formatFn = (n) => n.toFixed(2), duration = 400 }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const startValRef = useRef(value);
  const targetValRef = useRef(value);
  const startTimeRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    startValRef.current = displayValue;
    targetValRef.current = value;
    startTimeRef.current = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      // Spring ease-out formula: 1 - Math.pow(1 - progress, 3)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValRef.current + (targetValRef.current - startValRef.current) * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValRef.current);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className="tabular-nums font-extrabold">{formatFn(displayValue)}</span>;
};

export default RollingNumber;
