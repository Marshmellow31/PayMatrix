import { useEffect, useRef } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';

/**
 * Gives already-visible data a small acknowledgement when its value changes.
 * The child stays mounted, so controls, focus, and local state are preserved.
 */
const LiveUpdate = ({ value, children, className = '' }) => {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const previousValue = useRef(value);

  useEffect(() => {
    if (Object.is(previousValue.current, value)) return;
    previousValue.current = value;

    controls.stop();
    controls.start(
      reduceMotion
        ? { opacity: [0.78, 1] }
        : {
            opacity: [0.78, 1],
            y: [3, 0],
            scale: [0.995, 1],
          },
      reduceMotion
        ? { duration: 0.16, ease: 'easeOut' }
        : { type: 'spring', stiffness: 360, damping: 34, mass: 0.75 }
    );
  }, [controls, reduceMotion, value]);

  return (
    <motion.div animate={controls} className={className} style={{ transformOrigin: 'center' }}>
      {children}
    </motion.div>
  );
};

export default LiveUpdate;
