export const THEME = {
  colors: {
    bgDark: '#000000',
    bgObsidian: '#0e0e0e',
    surface: '#151515',
    surfaceLow: '#131313',
    surfaceCard: '#131313',
    surfaceHigh: '#1b1b1b',
    surfaceHighest: '#242424',
    surfaceVariant: '#353534',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    borderMedium: 'rgba(255, 255, 255, 0.08)',
    borderFocus: 'rgba(255, 255, 255, 0.20)',

    // Pure Monochrome Accents (Strictly zero green)
    emerald: '#ffffff',
    emeraldDark: '#d4d4d4',
    emeraldSoft: 'rgba(255, 255, 255, 0.08)',
    emeraldGlow: 'rgba(255, 255, 255, 0.15)',
    
    red: '#ffffff',
    redSoft: 'rgba(255, 255, 255, 0.08)',
    amber: '#ffffff',
    amberSoft: 'rgba(255, 255, 255, 0.08)',
    violet: '#ffffff',
    violetSoft: 'rgba(255, 255, 255, 0.08)',

    // Text hierarchy
    textPrimary: '#ffffff',
    textSecondary: '#e5e2e1',
    textMuted: '#c7c6c6',
    textDim: '#919191',
    textSubtle: 'rgba(255, 255, 255, 0.30)',
    textDark: '#1a1c1c',
  },
  fonts: {
    heading: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  },
  shadows: {
    chassis: '0 40px 100px -20px rgba(0, 0, 0, 0.95), 0 20px 40px -10px rgba(0, 0, 0, 0.85)',
    card: '0 16px 40px rgba(0, 0, 0, 0.60)',
    glowEmerald: '0 0 50px rgba(255, 255, 255, 0.08)',
    subtleGlow: '0 0 80px rgba(255, 255, 255, 0.04)',
  },
  radius: {
    phone: '52px',
    screen: '42px',
    card: '20px',
    pill: '9999px',
  },
} as const;
