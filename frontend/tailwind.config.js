/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        "on-background": "#E2E2E2",
        surface: "#121212",
        "on-surface": "#E2E2E2",
        "surface-container-lowest": "#0F0F0F",
        "surface-container-low": "#141414",
        "surface-container": "#1A1A1A",
        "surface-container-high": "#222222",
        "surface-container-highest": "#2D2D2D",
        "on-surface-variant": "#A0A0A0",
        primary: "#FFFFFF",
        secondary: "#808080",
        error: "#FF4444",
        "error-container": "#440000",
        "on-error-container": "#FF8888",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        manrope: ["Manrope", "sans-serif"],
      },
      backdropBlur: {
        premium: "24px",
      },
    },
  },
  plugins: [],
}
