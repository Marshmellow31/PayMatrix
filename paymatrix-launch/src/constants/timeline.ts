export const FPS = 60;
export const TOTAL_DURATION_IN_SECONDS = 18;
export const TOTAL_DURATION_IN_FRAMES = FPS * TOTAL_DURATION_IN_SECONDS; // 1080 frames

export const TIMELINE = {
  hook: {
    start: 0,
    duration: 90, // 1.50s
  },
  logo: {
    start: 90,
    duration: 75, // 1.25s
  },
  heroGroup: {
    start: 165,
    duration: 150, // 2.50s
  },
  expenseSplit: {
    start: 315,
    duration: 150, // 2.50s
  },
  scannerHero: {
    start: 465,
    duration: 135, // 2.25s
  },
  settlement: {
    start: 600,
    duration: 150, // 2.50s
  },
  montage: {
    start: 750,
    duration: 165, // 2.75s
  },
  launchPayoff: {
    start: 915,
    duration: 165, // 2.75s
  },
} as const;
