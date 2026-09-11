# PayMatrix v3.0 — Complete Flagship UI/UX Architecture & Overhaul Plan

> **Design Language:** Digital Obsidian × Neon Emerald Tactile Physics  
> **Inspiration:** Duolingo Tactility, Linear Minimalism, Apple Wallet Precision  
> **Core Guarantee:** 100% backend and business logic preservation (Firestore models, integer arithmetic, unconfirmed settlement safety rule)

---

## 1. Executive Design Philosophy

The current PayMatrix APK felt incomplete because the new v3 concepts (Milo mascot, 3D buttons, audio, haptics, multi-currency, and gamification) were staged in isolated files rather than being deeply woven into the daily user journey.

This overhaul completely rebuilds the **visual, tactile, and auditory experience of the entire Android client**:
1. **Sensory Tactility Everywhere:** Every primary button, secondary button, tab switch, and member toggle physically presses down with 3D bevel depth and spring physics, coupled with low-latency audio clicks and subtle vibration waveforms.
2. **Emotional Mascot Integration:** Milo the Mint is not a static banner—he is an animated financial companion embedded in the Dashboard, the Settlement Celebrations, the Receipt Scanner, and Empty States.
3. **Gamified Retention Loops:** Streaks with animated fire embers, Karma XP progression levels, and unlockable achievement badges live prominently in the UI.
4. **Global Payment Rails in Settle Up:** The Settle Up dialog allows users to choose between Indian UPI, European EPC SEPA QR, Brazilian Pix, PayPal.me, Venmo, or Physical Cash with instant QR rendering and copy helpers.
5. **Floating Glassmorphic Dock:** A modern bottom navigation bar with floating elevation, rounded pill indicators, and fluid spring transitions.

---

## 2. Component Design System Overhaul (`Components.kt`)

### 2.1 The 3D Chunky Action Buttons
Replaces all flat buttons across the app with physical, mechanical depth:
- **`PrimaryAction` (Chunky Emerald):**
  - Face: `#10B981` with top highlight `#34D399`
  - Base Shadow: `#047857` (4dp elevation)
  - Press Animation: Translates 4dp down with `Spring.DampingRatioMediumBouncy`
  - Auditory/Tactile: Plays `pop` sound via `SoundManager`, triggers `HapticHelper.playClickHaptic`
- **`SecondaryAction` (Chunky Slate):**
  - Face: `#1E293B` with 1dp border `#334155`
  - Base Shadow: `#0F172A` (4dp elevation)
  - Press Animation: Translates 4dp down
- **`DangerAction` (Chunky Coral):**
  - Face: `#F43F5E` with top highlight `#FB7185`
  - Base Shadow: `#BE123C` (4dp elevation)

### 2.2 Glassmorphic Obsidian Cards
- Container: `#1A1A1A` with subtle radial gradient
- Border: 1dp border with `Color.White.copy(alpha = 0.08f)`
- Corner Radius: 22dp
- Interactive Cards: Tap elevates/depresses with spring animation

### 2.3 Rolling Number Tickers
- Animates balance changes with smooth cubic-bezier easing rather than instant text replacement.

---

## 3. Screen-by-Screen Overhaul Plan

### 3.1 App Shell & Navigation (`PayMatrixApp.kt`)
- **Top App Bar:**
  - Emblazoned with `paymatrix` diamond logo in bold typography.
  - Flame streak pill (`🔥 14 days`) next to the brand.
  - Profile avatar with live sync indicator ring.
- **Floating Bottom Dock:**
  - Modern floating pill bar with 16dp horizontal margin and 12dp elevation.
  - Glassmorphic backdrop (`#151515` with 92% opacity).
  - Selected tab displays an animated emerald capsule pill indicator with icon scale bounce.
  - Every tab tap triggers a crisp tick audio cue and haptic tick.

### 3.2 Home Dashboard (`DashboardScreen.kt`)
- **Milo Mascot Command Center:**
  - A prominent card at the top displaying the animated Milo vector mascot.
  - Milo's emotional state reflects real-time balance:
    - `SNOOZE`: Net balance == 0 & zero debts pending.
    - `PARTY`: User has settled debts or is in strong positive balance.
    - `NUDGE`: Debts are pending or user owes group members.
  - Interactive speech bubble with contextual financial guidance.
- **3D Quick Action Launcher:**
  - `[+ Add Expense]` (Chunky Emerald)
  - `[📸 Scan Bill]` (Chunky Blue)
  - `[⚡ Settle Up]` (Chunky Orange)
- **Net Balance Display Card:**
  - Hero typographic balance with rolling animation.
  - "You are owed" / "You owe" sub-cards with visual trend arrows.

### 3.3 Expense Addition Flow (`ExpenseFormScreen.kt`)
- **Step 1: Essentials & Category:**
  - Currency selector pill allowing selection between USD, EUR, INR, GBP, JPY, KWD.
  - Large numeric keypad input with instant formatting.
  - Chunky category chips with category-specific icon badges.
- **Step 2: Split & Distribution:**
  - Participant toggle cards: Tapping a member toggles them in/out with a bouncy spring scale and crisp `fx_pop` sound!
  - Split method segmented slider: Equal, Exact, Percentage, Shares.
  - Live allocation breakdown displaying exact subunit distribution calculated via Hare-Niemeyer.
  - Chunky Emerald Save button playing `fx_coin` sound on save!

### 3.4 Groups & Settle Up (`GroupsScreens.kt`)
- **Group Details Header:**
  - Group category banner with total spend and member count.
  - "Financial Wrapped" button generating the Spotify-Wrapped style recap story card.
- **Settle Up Modal:**
  - Prominently displays receiver's payment options.
  - Rail Switcher: `[UPI]` · `[SEPA EPC]` · `[Pix]` · `[PayPal]` · `[Cash]`.
  - Generates high-res QR code for the selected rail using ZXing.
  - Deep-link button launches UPI / Venmo / PayPal directly.
  - "Confirm Settlement" button triggers Confetti cannon particle celebration and celebratory trumpet fanfare (`fanfare.mp3`)!

### 3.5 Friends & Activity Feed (`FriendsActivityScreens.kt`)
- **Friends Ledger:**
  - 1-on-1 net balance cards with direct 1-tap "Settle" chunky button.
- **Activity Timeline:**
  - Rich event icons (expense created, debt simplified, payment confirmed) with relative timestamps.

### 3.6 Profile & Gamification Hub (`LogsProfileScreens.kt`)
- **Gamification Header:**
  - Flame Streak counter (`🔥 14-Day Zero-Debt Streak`).
  - Karma XP Level badge (e.g. `Level 3: Split Master` with progress bar).
- **Achievement Badges Showcase:**
  - ⚡ Speedy Settler
  - 🤝 Fair Share Master
  - 📸 Itemizer Elite
  - 🌐 Globetrotter
  - 🛡️ Zero-Balance Knight
- **Settings & Preferences:**
  - Sound Effects toggle (`SoundPool` on/off).
  - Haptics toggle (`VibratorManager` on/off).
  - Default Currency preference selector.
  - Autonomous Offline Notifications toggle (`WorkManager`).

---

## 4. Implementation Roadmap & Execution Order

| Step | Target File | Core Upgrades |
| :--- | :--- | :--- |
| **Step 1** | `Components.kt` | 3D Chunky buttons (`PrimaryAction`, `SecondaryAction`, `DangerAction`), `ObsidianCard` elevation, `MoneyText` formatting, haptics and audio binding. |
| **Step 2** | `PayMatrixApp.kt` | Modern Floating Pill Navigation Dock, Top Bar with flame streak, theme integration. |
| **Step 3** | `DashboardScreen.kt` | Interactive Milo Mascot Command Center, 3D Quick Action row, high-contrast balance hero card. |
| **Step 4** | `ExpenseFormScreen.kt` | Bouncy participant toggles with `pop` sound, currency selector, Hare-Niemeyer allocation preview. |
| **Step 5** | `GroupsScreens.kt` | Settle Up rail dispatcher (UPI, EPC, Pix, PayPal, Cash), ZXing QR rendering, Confetti fanfare on confirm. |
| **Step 6** | `LogsProfileScreens.kt` | Profile gamification dashboard, Karma XP, Streak counter, badge grid, audio/haptic toggles. |
| **Step 7** | Build & Verification | `assembleRelease` compilation, APK signing, in-place installation on connected device (`sweetin`). |
