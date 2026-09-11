# First-Time User Onboarding Specification — Apple-Style Feature Sheet

Reference Design: `docs/design/onboarding_reference.png` (Apple iOS "Welcome to [App]" / "What's New in [App]" modal sheet pattern).

---

## 1. Design Principles & HIG Alignment

When a user opens `paymatrix` for the first time, they should not be dumped abruptly into an uncontextualized login form or complex multi-step wizard. Instead, they are greeted by a sleek, focused, Apple-inspired feature showcase sheet that immediately communicates what `paymatrix` is, why it's better, and how their data is protected.

### Visual Anatomy
1. **Container & Shell**:
   - Deep obsidian/black canvas (`#0A0A0A` / `#000000`) matching PayMatrix's dark aesthetic.
   - Generous top/bottom safe-area insets (iOS home bar, Android gesture nav, notch/status bar).
   - Centered or left-aligned max-width (`max-w-md` on web, full-width with 24dp margins on mobile).
2. **Top Header**:
   - Primary title: Large bold display typography (`font-black tracking-tight text-3xl sm:text-4xl text-white`).
   - Title text: `"Welcome to paymatrix"` (or `"What's New in paymatrix"` on major version updates).
   - Subtitle: Clear, reassuring 1–2 line proposition in `text-white/60 text-sm sm:text-base`.
     > *"Effortless group expense splitting, instant debt simplification, and direct UPI settlements."*
3. **Feature Highlight Rows (3–4 Items)**:
   - Each row features a left-aligned icon in a distinct accent color or rounded container, paired with a bold title and concise explanation:
     - **Item 1: Integer-Paise Precision**
       - Icon: `Receipt` / `Coins` (Cyan / Emerald accent `#10B981`)
       - Title: `Paise-Level Precision`
       - Description: `Deterministic bill splitting down to integer paise. Zero lost rounding or orphaned cents.`
     - **Item 2: Multi-Payer & Debt Simplification**
       - Icon: `Users` / `Split` (Amber / Orange accent `#F59E0B`)
       - Title: `Smart Multi-Payer Ledgers`
       - Description: `Handle complex multi-person bills and let our greedy engine minimize who owes whom in the fewest transfers.`
     - **Item 3: One-Tap UPI Settlement**
       - Icon: `QrCode` / `Zap` (Sky / Indigo accent `#38BDF8`)
       - Title: `Instant UPI Settlements`
       - Description: `Launch directly into PhonePe, GPay, or Paytm with prefilled amounts and unconfirmed settlement isolation.`
     - **Item 4: Privacy & Offline-First**
       - Icon: `ShieldCheck` (Purple / Violet accent `#A855F7`)
       - Title: `Private by Design`
       - Description: `Encrypted group ledgers, cached offline display reads, and zero advertising trackers.`
4. **Trust & Privacy Badge**:
   - Two-person privacy silhouette / lock icon + discreet small footnote text:
     > *"paymatrix keeps your group finances encrypted and confidential. Your spending activity is never shared or sold."*
5. **Sticky Action CTA**:
   - High-contrast, full-width rounded pill button: `"Continue"`.
   - Smooth tactile feedback / spring motion.
   - Advances first-time visitors directly into sign-in / registration (`/login`).

---

## 2. Platform Architecture

### Web / PWA (`frontend/`)
- Component: `frontend/src/components/onboarding/WelcomeSheet.jsx` (or upgraded `frontend/src/pages/Onboarding.jsx`).
- Routing Gate (`frontend/src/App.jsx`):
  - Check `hasSeenOnboarding()` (key: `paymatrix_onboarding_seen_v1`).
  - If `!hasSeenOnboarding()`: render `<WelcomeSheet onContinue={() => { markOnboardingSeen(); navigate('/login'); }} />`.
  - Allow re-inspecting anytime via `/?preview=1` or from the Profile/Settings help section.

### Native Android Jetpack Compose (`native-android/`)
- Screen: `com.paymatrix.app.ui.WelcomeSheet.kt`.
- Preference: `DevicePreferences.hasSeenOnboarding(context): Boolean` and `DevicePreferences.setSeenOnboarding(context)`.
- Navigation Gate (`PayMatrixApp.kt`):
  - In `GateScreen`:
    - If `user == null`:
      - If `!hasSeenOnboarding`: navigate to `"welcome"`
      - Else: navigate to `"login"`
    - If `user != null`: proceed to `"dashboard"` or pending invite.
- Material 3 Compose styling:
  - `Surface(color = CanvasBlack)`
  - `Text(style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)`
  - `Icon` with tinted background container `Modifier.size(44.dp).clip(CircleShape)`
  - `Button(shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black))`

---

## 3. Invariant & Safety Checklist
- [x] Product branding strictly lowercase `paymatrix`.
- [x] Financial terminology emphasizes integer paise and unconfirmed settlement isolation.
- [x] Storage persistence strictly non-blocking (gracefully degrades if `localStorage` is disabled).
- [x] Responsive layout tested for notch safe areas, tall screens, and small screens (e.g. 360x640).
