# Phase 2: Mascot Design System & Vector Graphics ("Milo the Mint")

> **Character Identity:** Milo the Mint (A cheerful, coin-shaped financial sidekick)  
> **Aesthetic:** Clean vector geometry, bold outlines, expressive anime-style eyes, Duolingo-inspired playfulness  
> **Rendering Technology:** Inline SVGs with CSS & Framer Motion keyframe animations on Web, Compose Vector Graphics on Android

---

## 1. Character Anatomy & Color Palette

Milo is designed with geometric simplicity so he can be rendered cleanly as lightweight SVG or Compose Canvas paths with zero heavy image assets:
- **Body:** Circular coin disk with a subtle 3D edge (`#10B981` Mint Emerald / `#059669` Shadow).
- **Core Crest:** The paymatrix diamond glyph (`💎`) embossed in the center (`#34D399` Light Mint).
- **Eyes:** Expressive rounded pill eyes with glossy white reflection circles.
- **Cheeks:** Soft pink blush circles (`#FDA4AF`) that pulse with excitement.

---

## 2. Web Vector Component: `MiloMascot.jsx`

```jsx
// frontend/src/components/mascot/MiloMascot.jsx
import React from 'react';
import { motion } from 'framer-motion';

export const MiloMascot = ({ state = 'snooze', size = 120, className = '' }) => {
  // State-based animation variants
  const animations = {
    snooze: {
      y: [0, -6, 0],
      rotate: [0, 2, 0, -2, 0],
      transition: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }
    },
    party: {
      y: [0, -18, 0],
      rotate: [0, -10, 10, -5, 5, 0],
      scale: [1, 1.08, 1],
      transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
    },
    nudge: {
      rotate: [-3, 3, -3],
      x: [-2, 2, -2],
      transition: { repeat: Infinity, duration: 0.6, ease: 'linear' }
    },
    detective: {
      scale: [1, 1.03, 1],
      transition: { repeat: Infinity, duration: 2.0, ease: 'easeInOut' }
    }
  };

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      animate={animations[state] || animations.snooze}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Outer Shadow Rim */}
        <circle cx="50" cy="53" r="44" fill="#047857" />

        {/* Main Coin Body */}
        <circle cx="50" cy="50" r="44" fill="#10B981" />

        {/* Inner Embossed Ring */}
        <circle cx="50" cy="50" r="38" stroke="#34D399" strokeWidth="2.5" strokeDasharray="4 2" />

        {/* State-Specific Faces */}
        {state === 'snooze' && (
          <g id="face-snooze">
            {/* Sleeping Closed Eyes */}
            <path d="M34 46 Q38 52 42 46" stroke="#064E3B" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M58 46 Q62 52 66 46" stroke="#064E3B" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Cute Smile */}
            <path d="M47 56 Q50 60 53 56" stroke="#064E3B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Blush */}
            <ellipse cx="33" cy="52" rx="4" ry="2" fill="#F43F5E" opacity="0.4" />
            <ellipse cx="67" cy="52" rx="4" ry="2" fill="#F43F5E" opacity="0.4" />
            {/* Floating 'Zzz' */}
            <text x="70" y="32" fill="#34D399" fontSize="12" fontWeight="bold" opacity="0.8">z</text>
            <text x="78" y="22" fill="#34D399" fontSize="16" fontWeight="bold" opacity="0.6">Z</text>
          </g>
        )}

        {state === 'party' && (
          <g id="face-party">
            {/* Cool Sunglasses */}
            <rect x="26" y="40" width="22" height="14" rx="4" fill="#0F172A" />
            <rect x="52" y="40" width="22" height="14" rx="4" fill="#0F172A" />
            <line x1="48" y1="46" x2="52" y2="46" stroke="#0F172A" strokeWidth="3" />
            {/* Glasses Glare */}
            <line x1="30" y1="43" x2="35" y2="43" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="56" y1="43" x2="61" y2="43" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            {/* Wide Open Happy Mouth */}
            <path d="M42 60 Q50 72 58 60 Z" fill="#991B1B" />
            <path d="M46 64 Q50 68 54 64" fill="#F87171" />
            {/* Confetti Particles */}
            <circle cx="18" cy="24" r="2.5" fill="#F59E0B" />
            <circle cx="82" cy="20" r="3" fill="#EC4899" />
            <rect x="74" y="68" width="4" height="4" transform="rotate(30 74 68)" fill="#3B82F6" />
          </g>
        )}

        {state === 'nudge' && (
          <g id="face-nudge">
            {/* Serious / Impatient Eyes */}
            <circle cx="38" cy="46" r="4.5" fill="#064E3B" />
            <circle cx="62" cy="46" r="4.5" fill="#064E3B" />
            <circle cx="36.5" cy="44.5" r="1.5" fill="white" />
            <circle cx="60.5" cy="44.5" r="1.5" fill="white" />
            {/* Raised Eyebrows */}
            <line x1="33" y1="38" x2="43" y2="40" stroke="#064E3B" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="57" y1="40" x2="67" y2="38" stroke="#064E3B" strokeWidth="2.5" strokeLinecap="round" />
            {/* Straight Impatient Line Mouth */}
            <line x1="45" y1="58" x2="55" y2="58" stroke="#064E3B" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {state === 'detective' && (
          <g id="face-detective">
            {/* Monocle on Right Eye */}
            <circle cx="38" cy="46" r="4" fill="#064E3B" />
            <circle cx="62" cy="46" r="8" stroke="#F59E0B" strokeWidth="2.5" fill="none" />
            <line x1="68" y1="52" x2="76" y2="62" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
            <circle cx="62" cy="46" r="4" fill="#064E3B" />
            {/* Smirk Smile */}
            <path d="M46 58 Q54 62 58 56" stroke="#064E3B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </g>
        )}
      </svg>
    </motion.div>
  );
};
```
