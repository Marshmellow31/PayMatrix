# paymatrix 2.2.2 (22002)

## Overview & Alignment

Version 2.2.2 delivers Android 15 edge-to-edge system compliance, resolves Play Console deprecated window display warnings, and introduces a refined Apple Liquid Glass floating navigation architecture alongside adaptive member selection grids across `native-android` and the Web PWA.

---

## Key Changes & Improvements

### 1. Android 15 Edge-to-Edge Compliance & Play Console Migration
- **Deprecated Attributes Removed**: Migrated `styles.xml` away from `android:windowLightStatusBar`, `android:windowActionModeOverlay`, and `android:windowNoTitle` in favor of standard `Theme.Material.NoActionBar`.
- **Modern Edge-to-Edge Initialization**: Configured `enableEdgeToEdge()` in `MainActivity.onCreate()` with explicit transparent `SystemBarStyle.dark` for both status and navigation bars, ensuring full backward compatibility for pre-Android 15 devices while complying with Android 15 mandatory edge-to-edge drawing.
- **Display Cutout Extension**: Set `layoutInDisplayCutoutMode = LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` to allow content to draw cleanly behind modern camera punch-holes and notches without letterboxing.

### 2. Apple Liquid Glass Floating Pill Navigation Bar
- Replaced rigid Material navigation bar with a weightless, floating obsidian glass capsule (`height = 60.dp`, `RoundedCornerShape(32.dp)`).
- Layered Apple specular top-lit light rim (`Color.White.copy(alpha = 0.22f)`), frosted sheen, and ambient drop shadows.
- Active tab capsule (`Color.White.copy(alpha = 0.12f)`) with haptic tactile response on tab transitions.
- Scoped status bar insets to outer Scaffold and single navigation-bar insets to floating pill, eliminating bottom dead space.

### 3. Adaptive Member Selection Grid (Multi-Payer & Split)
- Dynamic content-wrapping grid in Step 2 ("Who paid") and Step 3 ("Split with") replacing fixed 255dp container.
- Small groups (e.g. 2 members) fit horizontally side-by-side in Row 1 (~74dp height) without empty void.
- Dynamically fills Row 1, Row 2, then Row 3 before enabling horizontal scrolling, which organizes extra members column-wise in stacks of 3.

### 4. Avatar Stack & Deterministic Color Palettes
- Added `2.dp` border of `CardSurface` around each avatar in `AvatarStack` so overlapping circles cleanly cut out without letter bleed-through.
- Expanded 12-tone deterministic fallback palette for group members without external photos.

### 5. Floating Offline / Sync Indicator & Header Polish
- Relocated full-width yellow offline banner to a compact floating pill directly above the floating navbar.
- Bold uppercase `PAYMATRIX` branding in header with status indicator removed for an uncluttered bar.
- Category badge icon parity on group list cards (`✈ TRIP`) and clean non-redundant hero headers.

---

## Release Invariants & Verification
- **Application ID**: `com.paymatrix.app`
- **Version Code**: `22002`
- **Version Name**: `2.2.2`
- **Target SDK**: `36` (Android 16 / Android 15 compatibility)
- **Min SDK**: `24` (Android 7.0)
- **Financial Precision**: Unchanged integer-paise arithmetic (`Money.toPaise`, `BalanceEngine.kt`).
- **Signing Identity**: Signed with official release keystore matching prior native releases.
