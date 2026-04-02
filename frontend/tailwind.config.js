/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Digital Obsidian — Surface Hierarchy
        surface: {
          DEFAULT: '#1a1a1a',
          dim: '#0e0e0e',
          bright: '#3a3939',
          container: {
            DEFAULT: '#1a1a1a',
            low: '#1a1a1a',      // Deep Ink
            lowest: '#1a1a1a',
            high: '#2a2a2a',
            highest: '#353535',
          },
          variant: '#353534',
          tint: '#c6c6c7',
        },
        // Primary — Monochrome White System
        primary: {
          DEFAULT: '#ffffff',
          container: '#d4d4d4',
          fixed: '#5d5f5f',
          'fixed-dim': '#454747',
        },
        'on-primary': {
          DEFAULT: '#1a1c1c',
          container: '#000000',
        },
        // Secondary
        secondary: {
          DEFAULT: '#c7c6c6',
          container: '#464747',
          fixed: '#c7c6c6',
          'fixed-dim': '#ababab',
        },
        'on-secondary': {
          DEFAULT: '#1a1c1c',
          container: '#e3e2e2',
        },
        // Tertiary
        tertiary: {
          DEFAULT: '#e5e2e1',
          container: '#929090',
          fixed: '#5f5e5e',
          'fixed-dim': '#474746',
        },
        // Surface text
        'on-surface': {
          DEFAULT: '#e5e2e1',
          variant: '#c6c6c6',
        },
        // Outline
        outline: {
          DEFAULT: '#919191',
          variant: '#474747',
        },
        // Error
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
        'on-error': {
          DEFAULT: '#690005',
          container: '#ffdad6',
        },
        // Inverse
        inverse: {
          surface: '#e5e2e1',
          'on-surface': '#313030',
          primary: '#5d5f5f',
        },
        // Background
        background: '#1a1a1a',
        'on-background': '#e5e2e1',
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
