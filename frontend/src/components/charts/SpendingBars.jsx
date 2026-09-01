import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const formatPaise = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format((paise || 0) / 100);

const SpendingBars = ({ data = [] }) => {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(null);
  const maximum = Math.max(...data.map((point) => point.amountPaise), 1);
  const labelIndexes = useMemo(
    () => new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]),
    [data.length]
  );
  const activePoint = activeIndex == null ? null : data[activeIndex];

  return (
    <div className="relative">
      <div className="mb-5 flex min-h-11 items-end justify-between gap-4">
        <div>
          <p className="text-xs text-white/35">{activePoint ? activePoint.label : 'Tap a bar'}</p>
          <p className="mt-1 font-manrope text-lg font-semibold tabular-nums text-white/90">
            {activePoint ? formatPaise(activePoint.amountPaise) : 'Daily and weekly totals'}
          </p>
        </div>
        <p className="text-right text-[10px] leading-relaxed text-white/25">
          Your share
          <br />
          of group expenses
        </p>
      </div>

      <div className="flex h-48 items-end gap-1.5 border-b border-white/[0.08] sm:h-56 sm:gap-2">
        {data.map((point, index) => {
          const height =
            point.amountPaise > 0 ? Math.max((point.amountPaise / maximum) * 100, 3) : 1;
          const isActive = activeIndex === index;
          return (
            <button
              key={point.key}
              type="button"
              aria-label={`${point.label}: ${formatPaise(point.amountPaise)}`}
              onPointerEnter={() => setActiveIndex(index)}
              onPointerLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={() => setActiveIndex((current) => (current === index ? null : index))}
              className="group relative flex h-full min-w-0 flex-1 items-end rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <motion.span
                initial={false}
                animate={{
                  height: `${height}%`,
                  opacity: isActive ? 1 : point.amountPaise > 0 ? 0.72 : 0.16,
                }}
                transition={
                  reduceMotion
                    ? { duration: 0.12 }
                    : { type: 'spring', stiffness: 330, damping: 34, mass: 0.8 }
                }
                className="block w-full rounded-t-[0.3rem] bg-white group-hover:opacity-100"
              />
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 text-[10px] text-white/25">
        {data.map((point, index) =>
          labelIndexes.has(index) ? (
            <span
              key={point.key}
              className={
                index === 0 ? 'text-left' : index === data.length - 1 ? 'text-right' : 'text-center'
              }
              style={{ gridColumn: index === 0 ? 1 : index === data.length - 1 ? 3 : 2 }}
            >
              {point.label}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
};

export default SpendingBars;
