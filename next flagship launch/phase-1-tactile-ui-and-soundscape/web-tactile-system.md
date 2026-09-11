# Phase 1: Web Tactile & Sound System Implementation

> **Platform:** React 19 + Vite + Tailwind CSS + Framer Motion  
> **Key Technologies:** Web Audio API (Synthesizer & AudioBuffer), CSS 3D Transforms, Web Haptics API

---

## 1. 3D Chunky Push-Down Button Component

Buttons in PayMatrix v3 utilize a physical mechanical depth model. When clicked or touched, the button physically descends into the canvas while compressing its bottom border shadow.

### 1.1 Tailwind CSS 3D Utility Classes

```css
/* Add to frontend/src/index.css or a dedicated tactile.css */
@layer components {
  /* Primary Chunky Emerald Button */
  .btn-chunky-primary {
    @apply relative inline-flex items-center justify-center font-bold px-6 py-3.5 rounded-2xl
           bg-emerald-500 text-white shadow-[0_5px_0_0_#047857]
           border-t border-emerald-400
           active:translate-y-1.25 active:shadow-[0_0px_0_0_#047857]
           transition-all duration-75 select-none cursor-pointer;
  }

  /* Secondary Chunky Slate Button */
  .btn-chunky-secondary {
    @apply relative inline-flex items-center justify-center font-bold px-6 py-3.5 rounded-2xl
           bg-slate-800 text-white shadow-[0_5px_0_0_#0f172a]
           border border-slate-700
           active:translate-y-1.25 active:shadow-[0_0px_0_0_#0f172a]
           transition-all duration-75 select-none cursor-pointer;
  }

  /* Danger Chunky Coral Button */
  .btn-chunky-danger {
    @apply relative inline-flex items-center justify-center font-bold px-6 py-3.5 rounded-2xl
           bg-rose-500 text-white shadow-[0_5px_0_0_#be123c]
           border-t border-rose-400
           active:translate-y-1.25 active:shadow-[0_0px_0_0_#be123c]
           transition-all duration-75 select-none cursor-pointer;
  }
}
```

### 1.2 Reusable React 19 ChunkyButton Component

```jsx
// frontend/src/components/common/ChunkyButton.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../services/soundEngine';

export const ChunkyButton = ({
  children,
  onClick,
  variant = 'primary',
  sound = 'pop',
  className = '',
  disabled = false,
  ...props
}) => {
  const handleClick = (e) => {
    if (disabled) return;
    soundEngine.play(sound);
    if (navigator.vibrate) navigator.vibrate(15);
    onClick?.(e);
  };

  const variantClass = {
    primary: 'btn-chunky-primary',
    secondary: 'btn-chunky-secondary',
    danger: 'btn-chunky-danger',
  }[variant] || 'btn-chunky-primary';

  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      onClick={handleClick}
      disabled={disabled}
      className={`${variantClass} ${disabled ? 'opacity-50 cursor-not-allowed shadow-none' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};
```

---

## 2. Zero-Latency Web Audio Engine (`soundEngine.js`)

Using standard `<audio>` tags causes a noticeable ~100–300ms playback delay. The **Web Audio API** plays samples directly from memory buffers or synthesizes audio frequencies instantly using audio oscillators.

```javascript
// frontend/src/services/soundEngine.js
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('paymatrix_sfx_muted') === 'true';
    this.buffers = new Map();
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    localStorage.setItem('paymatrix_sfx_muted', String(muted));
  }

  play(soundType) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    switch (soundType) {
      case 'pop':
        this.synthesizePop();
        break;
      case 'coin':
        this.synthesizeCoin();
        break;
      case 'fanfare':
        this.synthesizeFanfare();
        break;
      default:
        this.synthesizePop();
    }
  }

  // Synthesized Pop (Wood/Bubble)
  synthesizePop() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Synthesized Metallic Coin Drop
  synthesizeCoin() {
    const now = this.ctx.currentTime;
    [1480, 2960].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    });
  }

  // Synthesized Victory Chime (C5 - E5 - G5 - C6)
  synthesizeFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.35);
    });
  }
}

export const soundEngine = new SoundEngine();
```

---

## 3. Rolling Odometer Counter (Number Ticker)

When balances update, they shouldn't suddenly snap. They should animate with a smooth counting motion.

```jsx
// frontend/src/components/common/RollingNumber.jsx
import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export const RollingNumber = ({ value, formatFn = (n) => n.toFixed(2) }) => {
  const spring = useSpring(value, { mass: 0.6, stiffness: 400, damping: 30 });
  const [display, setDisplay] = useState(formatFn(value));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      setDisplay(formatFn(latest));
    });
  }, [spring, formatFn]);

  return <span className="tabular-nums font-extrabold">{display}</span>;
};
```
