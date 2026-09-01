import { useLayoutEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';

const PRIMARY_TABS = new Set(['/dashboard', '/friends', '/groups', '/logs', '/profile']);
const tabSpring = { type: 'spring', stiffness: 380, damping: 38, mass: 0.8 };

/**
 * Keeps visited primary tabs mounted so their local state, resolved data, and
 * Firestore listeners survive navigation. Only visited tabs are retained.
 */
const CachedTabOutlet = ({ context }) => {
  const location = useLocation();
  const outlet = useOutlet(context);
  const reduceMotion = useReducedMotion();
  const cachedTabs = useRef(new Map());
  const scrollPositions = useRef(new Map());
  const previousPath = useRef(location.pathname);
  const isPrimaryTab = PRIMARY_TABS.has(location.pathname);

  if (isPrimaryTab) {
    cachedTabs.current.set(location.pathname, outlet);
  }

  useLayoutEffect(() => {
    const lastPath = previousPath.current;
    if (PRIMARY_TABS.has(lastPath)) {
      scrollPositions.current.set(lastPath, window.scrollY);
    }

    previousPath.current = location.pathname;
    if (!PRIMARY_TABS.has(location.pathname)) return undefined;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollPositions.current.get(location.pathname) || 0, left: 0 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  return (
    <>
      {[...cachedTabs.current.entries()].map(([path, element]) => {
        const isActive = path === location.pathname;
        return (
          <motion.div
            key={path}
            aria-hidden={!isActive}
            className={isActive ? 'block' : 'hidden'}
            initial={false}
            animate={
              isActive
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: reduceMotion ? 1 : 0.96, y: 0, scale: 0.998 }
            }
            transition={reduceMotion ? { duration: 0.14 } : tabSpring}
          >
            {element}
          </motion.div>
        );
      })}

      {!isPrimaryTab && outlet}
    </>
  );
};

export default CachedTabOutlet;
