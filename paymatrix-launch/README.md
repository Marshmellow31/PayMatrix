# paymatrix — Shared Moments (Remotion)

The current cut is **28 seconds, 1080 × 2400 at 60fps**, implemented entirely in
Remotion. Run `npm.cmd run render` for `renders/paymatrix-Shared-Moments.mp4`.
Select `paymatrix-Shared-Moments` in Studio. See [production notes](SHARED-MOMENTS.md)
for source ownership, fixture boundaries, fonts, audio and validation.

The original 18-second composition remains available with `npm.cmd run render:legacy`.
The historical specification below describes an earlier 40-second concept and is not
the current timeline or evidence of Google Play release status.

---

## Historical concept notes

> **Flagship 40-second cinematic product launch film celebrating the official release of PayMatrix on Google Play.**

---

## 🎬 Video Specifications

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Duration** | **40.00 seconds** (2,400 frames) | Precision locked to target range (38–42s) |
| **Framerate** | **60 FPS** | Ultra-smooth physical motion & UI transitions |
| **Resolution** | **1920 × 1080** | Full HD Landscape (16:9) |
| **Codec** | **H.264 / AAC** | High bitrate, universal web & social compatibility |
| **Design System** | **Digital Obsidian** | Deep blacks (`#080808`), emerald accents (`#10b981`), titanium chassis |
| **Narrative Payoff**| **"OUT NOW ON GOOGLE PLAY"** | Official Google Play badge + `com.paymatrix.app` release credentials |
| **Master Render** | `renders/PayMatrix-Launch.mp4` | Production master |

---

## 📐 Narrative Storyboard & Timeline

The 40-second film is choreographed across 8 purposeful scenes:

| Scene | Timecode | Frames | Narrative Focus | Core Visuals |
| :--- | :--- | :--- | :--- | :--- |
| **01: The Hook** | `0:00 – 0:03` | `0 – 180` | The relatable friction | Deep obsidian darkness; confident headline: *"Splitting expenses shouldn't be complicated."* |
| **02: Identity Reveal** | `0:03 – 0:07` | `180 – 420` | PayMatrix identity | Diamond emblem with metallic sweep; *"Shared expenses. Simplified."*; phone chassis begins emergence |
| **03: Product Hero & Group** | `0:07 – 0:13` | `420 – 780` | Real product experience | Photorealistic smartphone; Dashboard position card (`₹4,280.00`); seamless navigation into *"Goa Weekend"* group |
| **04: Add & Split** | `0:13 – 0:19` | `780 – 1140` | Effortless distribution | Dinner expense (`₹4,280.00`); *"Add once. Split automatically."*; instantaneous equal distribution into ₹1,070 shares |
| **05: AI Receipt Scanner** | `0:19 – 0:26` | `1140 – 1560` | Friction-free hero moment | 3D paper cafe bill enters; precision optical viewfinder & emerald laser sweep; kinetic beat: **Scan. Split. Done.** |
| **06: Balances → Settle Up** | `0:26 – 0:32` | `1560 – 1920` | Complete lifecycle | *"Harshil paid ₹4,280 / You owe ₹1,070"*; 3D elevated vector UPI QR code emerges with exact paise amount |
| **07: Fast Product Montage** | `0:32 – 0:36` | `1920 – 2160` | Technical excellence | Rapid cadence: Min-Flow engine (14 debts → 2 transfers), Category analytics, Offline-first architecture |
| **08: Release Payoff** | `0:36 – 0:40` | `2160 – 2400` | The official launch | Serene stillness; PayMatrix logo; *"Split smarter."*; **OUT NOW ON GOOGLE PLAY** with official badge |

---

## 🛠 Project Architecture

```
paymatrix-launch/
├── package.json               # Remotion 4.0, React 19, Lucide, QR Canvas
├── remotion.config.ts         # 1080p60 configuration, public dir, H.264
├── tsconfig.json              # TypeScript ESNext/Bundler config
├── public/
│   ├── logo.png               # Official PayMatrix high-res brand diamond
│   ├── google-play-badge.svg  # Crisp vector Google Play Store badge
│   ├── app-icon-512.png       # Native Android Play Store icon
│   └── audio/                 # Directory for soundtrack / audio stems
├── renders/
│   ├── PayMatrix-Launch.mp4   # Rendered master film
│   └── stills/                # Keyframe inspection stills across all scenes
└── src/
    ├── index.ts               # Remotion entry point
    ├── Root.tsx               # Composition registry (Master + 8 scene compositions)
    ├── MainFilm.tsx           # Sequence orchestration connecting all 8 scenes
    ├── constants/
    │   ├── timeline.ts        # Centralized frame & second timeline (2400 frames)
    │   └── theme.ts           # Digital Obsidian color tokens & typography
    ├── components/
    │   ├── PhoneMockup.tsx    # Flagship 3D smartphone chassis with glass reflection
    │   ├── Background.tsx     # Deep obsidian radial gradients & studio lighting
    │   ├── Glow.tsx           # Controlled bloom & chromatic lighting
    │   ├── AnimatedNumber.tsx # Eased currency ticker with Indian locale format
    │   ├── KineticText.tsx    # Confident staggered typographic headlines
    │   ├── ReceiptPaper.tsx   # Realistic cafe bill with line items & jagged edge
    │   ├── LaserScanner.tsx   # Precision optical viewfinder & emerald laser beam
    │   ├── UPIQRCode.tsx      # High-contrast scannable vector UPI QR card
    │   └── screens/
    │       ├── DashboardScreen.tsx
    │       ├── GroupScreen.tsx
    │       ├── ExpenseSplitScreen.tsx
    │       ├── SettlementScreen.tsx
    │       └── MontageCards.tsx
    └── scenes/
        ├── 01_HookScene.tsx
        ├── 02_LogoScene.tsx
        ├── 03_HeroGroupScene.tsx
        ├── 04_ExpenseSplitScene.tsx
        ├── 05_ScannerHeroScene.tsx
        ├── 06_SettlementScene.tsx
        ├── 07_MontageScene.tsx
        └── 08_LaunchPayoffScene.tsx
```

---

## 🚀 Quick Start Guide

### 1. Interactive Motion Preview
To launch the Remotion Studio in your browser to inspect animations frame-by-frame:
```bash
cd paymatrix-launch
npm start
```
You can inspect the full film or select any of the 8 individual scene compositions (`01-Hook`, `02-Logo`, `03-HeroGroup`, `04-ExpenseSplit`, `05-ScannerHero`, `06-Settlement`, `07-Montage`, `08-LaunchPayoff`) from the sidebar.

### 2. Render Master Video
To render the final 1080p60 MP4:
```bash
cd paymatrix-launch
npm run render
```
The output file will be written to `renders/PayMatrix-Launch.mp4`.

### 3. Render Individual Still Frames
To capture any exact frame as a high-resolution PNG:
```bash
# Capture frame 2300 (Google Play payoff)
npx remotion still src/index.ts PayMatrix-Launch renders/stills/launch.png --frame=2300
```

---

## 🎛 How to Customize & Iterate

### Adjusting Scene Timings
All scene timings, frame counts, and durations are centrally defined in:
[`src/constants/timeline.ts`](./src/constants/timeline.ts)

```typescript
export const TIMELINE = {
  hook: { start: 0, duration: 180 },        // 3.0s
  logo: { start: 180, duration: 240 },      // 4.0s
  heroGroup: { start: 420, duration: 360 }, // 6.0s
  // ...
};
```
If you modify durations, simply ensure the sum equals `TOTAL_DURATION_IN_FRAMES` (2400 frames for 40.0 seconds).

### Adding Music & Sound Effects
To add a musical soundtrack or sound design:
1. Place your licensed audio file in `public/audio/soundtrack.mp3`.
2. Import `Audio` and `staticFile` from `remotion` in `src/MainFilm.tsx`:
```tsx
import { Audio, staticFile } from 'remotion';

// Inside MainFilm:
<Audio src={staticFile('audio/soundtrack.mp3')} volume={0.8} />
```

### Adapting to Vertical Format (9:16 for Reels / Shorts)
The project architecture was designed from the ground up with modular components (`PhoneMockup`, `ReceiptPaper`, `UPIQRCode`, etc.).
To create a 1080 × 1920 9:16 vertical version:
1. In `src/Root.tsx`, register a new composition:
```tsx
<Composition
  id="PayMatrix-Launch-Vertical"
  component={MainFilm}
  durationInFrames={TOTAL_DURATION_IN_FRAMES}
  fps={FPS}
  width={1080}
  height={1920}
/>
```
2. In vertical mode, adjust `PhoneMockup` and typography alignment from a side-by-side layout (left text, right phone) to a vertical stack (top text, centered hero phone).

---

## 🛡️ Production Safety & Boundaries
- **Zero changes to production code**: The Remotion video project lives entirely in `paymatrix-launch/`. The production `frontend/` and `native-android/` apps remain completely untouched.
- **Financial & Payment Boundaries**: As documented in the Play Store data safety guidelines, PayMatrix generates on-device UPI payment intents and scannable QR codes; settlements require user confirmation. The launch video accurately communicates this workflow.
