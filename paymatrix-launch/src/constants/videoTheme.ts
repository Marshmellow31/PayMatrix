// PayMatrix Launch Video Design Tokens
// Derived directly from frontend/tailwind.config.js & frontend/src/index.css

export const VIDEO_THEME = {
  // Video Stage Canvas — Authentic App Grey Theme (#1a1a1a)
  canvas: '#1a1a1a',           // Digital Obsidian grey canvas
  canvasSubtle: '#141414',     // Faint vignette falloff

  // PayMatrix Digital Obsidian Hierarchy (Exact Production Tokens from tailwind.config.js)
  pageBg: '#1a1a1a',           // Production app page background (surface.container.lowest / body)
  surfaceDim: '#121212',       // surface.dim
  surfaceLow: '#151515',       // surface.container.low (Card surfaces & list rows)
  surfaceDefault: '#1a1a1a',   // surface.DEFAULT
  surfaceLowest: '#1a1a1a',    // surface.container.lowest
  surfaceHigh: '#1b1b1b',      // surface.container.high (Elevated cards)
  surfaceHighest: '#242424',   // surface.container.highest (Modals / drawers)
  surfaceVariant: '#353534',   // surface.variant (Chips / inputs)
  surfaceBright: '#3a3939',    // surface.bright

  // High-Contrast Monochrome Typography
  textPrimary: '#ffffff',      // Pure white headlines & values
  textSecondary: '#e5e2e1',    // Clean silver for subtitles
  textMuted: '#c7c6c6',        // Supporting text
  textDim: '#919191',          // Outline & meta info
  textDark: '#1a1c1c',         // On-primary dark ink for white CTA buttons

  // Semantic & Tone Accents (from Dashboard.jsx & GroupDetail.jsx)
  emerald: '#34d399',          // emerald-400 / emerald-300
  emeraldTone: 'rgba(110, 231, 183, 0.9)', // text-emerald-300/90
  emeraldBg: 'rgba(110, 231, 183, 0.1)',   // bg-emerald-300/10
  emeraldBorder: 'rgba(110, 231, 183, 0.2)',

  red: '#f87171',              // red-400 / red-300
  redTone: 'rgba(252, 165, 165, 0.9)',     // text-red-300/90
  redBg: 'rgba(252, 165, 165, 0.1)',       // bg-red-300/10
  redBorder: 'rgba(252, 165, 165, 0.2)',

  amber: '#fbbf24',            // amber-400 / amber-300
  amberTone: 'rgba(252, 211, 77, 0.9)',    // text-amber-300/90
  amberBg: 'rgba(252, 211, 77, 0.1)',      // bg-amber-300/10
  amberBorder: 'rgba(252, 211, 77, 0.2)',

  blue: '#60a5fa',             // blue-400 / blue-300
  blueTone: 'rgba(147, 197, 253, 0.9)',
  blueBg: 'rgba(147, 197, 253, 0.1)',

  violet: '#a78bfa',           // violet-400
  violetBg: 'rgba(167, 139, 250, 0.1)',
  violetBorder: 'rgba(167, 139, 250, 0.2)',

  // Category Color Map (Exact from frontend/src/utils/constants.js)
  categoryColors: {
    Trip: '#6366f1',
    Food: '#f97316',
    Roommates: '#22c55e',
    Friends: '#ec4899',
    Work: '#3b82f6',
    Events: '#f59e0b',
    Couple: '#f43f5e',
    Sports: '#10b981',
    Entertainment: '#a855f7',
    Shopping: '#06b6d4',
    Family: '#8b5cf6',
    Other: '#919191',
  },

  // Glass & Borders
  borderGlass: 'rgba(255, 255, 255, 0.05)',
  borderDefault: 'rgba(255, 255, 255, 0.08)',
  borderHigh: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',

  // Gradients & CTAs
  heroGradient: 'linear-gradient(145deg, #101010 0%, #1b1b1b 55%, #242424 100%)', // Exact from Dashboard.jsx
  ctaPrimary: 'linear-gradient(135deg, #ffffff 0%, #d4d4d4 100%)',
  ctaSecondary: '#1f1f1f',
  chassisTitanium: 'linear-gradient(150deg, #2b2b2b 0%, #171717 40%, #0a0a0a 100%)',
  silverGlint: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%)',

  // Radii Tokens (from Tailwind & CSS classes)
  radii: {
    hero: '1.85rem',      // 29.6px (rounded-[1.85rem] on hero card)
    card: '1.5rem',       // 24px (rounded-3xl)
    row: '1.35rem',       // 21.6px (rounded-[1.35rem] on group rows)
    badge: '1rem',        // 16px (rounded-2xl)
    button: '0.75rem',    // 12px (rounded-xl)
    pill: '9999px',       // rounded-full
  },

  // Shadows
  shadows: {
    hero: '0 24px 65px rgba(0,0,0,0.3)',
    actionPrimary: '0 16px 38px rgba(255,255,255,0.05)',
    modal: '0 40px 80px -20px rgba(0,0,0,0.9)',
  },

  // Typography Stacks
  fonts: {
    heading: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  },
} as const;
