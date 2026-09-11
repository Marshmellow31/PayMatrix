export const FPS = 60;
export const BEATS = [
  { name: "Dinner", start: 0, duration: 180 },
  { name: "Group", start: 180, duration: 180 },
  { name: "Scan and review", start: 360, duration: 270 },
  { name: "Split", start: 630, duration: 240 },
  { name: "Balances", start: 870, duration: 240 },
  { name: "Payment QR", start: 1110, duration: 240 },
  { name: "Relief", start: 1350, duration: 120 },
  { name: "Close", start: 1470, duration: 210 },
] as const;
// Fictional creative fixture. Amounts are integer paise; no production calls.
export const DINNER = {
  total: 428000,
  share: 107000,
  receivable: 321000,
  people: ["Aarav", "Mira", "Kabir", "Riya"],
  items: [
    { name: "Dinner for four", amount: 360000 },
    { name: "Drinks", amount: 68000 },
  ],
};
export const money = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const C = {
  ink: "#111a16",
  green: "#68dab0",
  white: "#f1f5f2",
  muted: "#a6b9ae",
  paper: "#e5ebe5",
  dark: "#1a1a1a",
};
