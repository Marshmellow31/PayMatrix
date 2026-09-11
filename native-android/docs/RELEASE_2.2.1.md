# paymatrix 2.2.1 (22001)

## Overview & Alignment

Version 2.2.1 introduces the multi-payer expense engine and a streamlined 3-step creation workflow across both the native Android application (`native-android`) and the Web PWA (`frontend`). This release addresses UI usability, enables splitting bills paid by multiple individuals, resolves the GST itemized reconfiguration crash, and ensures universal Google profile photo propagation while safeguarding custom uploads.

---

## Key Features & Improvements

### 1. 3-Step Expense Creation Flow

1. **Step 1: Essentials**
   - **Boxed Amount Card**: Dedicated container featuring a prominent `₹` prefix and bold amount typography.
   - **Category Palette**: Colorful circular category badges with distinct icon backgrounds and centered category labels positioned underneath.
   - **Details**: Title input, optional notes, date assist chips, and group context selector.

2. **Step 2: Who Paid? (Multi-Payer Engine)**
   - **3-Row Horizontal Avatar Grid**: Horizontally swipeable 3-row grid for selecting group members with visual check badges and centered display names.
   - **Flexible Payment Modes**: Single payer or multi-payer selection.
     - **Equally**: Divides total outlay evenly among selected payers with integer-paise remainder allocation.
     - **Unequally**: Supports custom amounts (`₹ Exact`) or relative fractions (`% Percent`).
   - **Live Balance Gate**: Real-time validation chip confirming that total allocated payments exactly equal the expense total before proceeding.

3. **Step 3: Split With**
   - **Matching 3-Row Avatar Grid**: Participant selection grid matching the Step 2 visual layout.
   - **5 Allocation Modes**: Equal, Percentage (`%`), Exact (`₹`), Shares/Parts, and GST Itemized.
   - **Selected Member Drawer**: Granular allocation controls per member with real-time balance calculations.

---

### 2. GST Itemized Crash Resolution

- **Root Cause**: Navigating to GST Itemized split mode previously triggered an unhandled `NumberFormatException` when parsing empty or intermediate input fields with `Money.toPaise("")`.
- **Fix**: Implemented `Money.toPaiseOrNull(str)` with zero-safe fallbacks (`?: 0L`), preventing crashes on rapid mode transitions or empty input states.

---

### 3. Universal Google Avatar Propagation & Preservation

- **Avatar Sync**: Upon Google sign-in transitions, Google profile image URLs are automatically synchronized to:
  - `users/{uid}`
  - `publicProfiles/{uid}`
  - `friendCodes/{code}`
- **Storage Protection**: Existing custom user uploads (`https://firebasestorage.googleapis.com/...`) are protected from being overwritten by incoming Google photo URLs.

---

### 4. UI Polish & Layout Ergonomics

- **Snug Top Header**: Form header fits directly against the system status bar, removing top padding dead space.
- **Step Indicator**: Clean 3-segment progress indicator pills in the header displaying current workflow state.
- **Pinned Bottom Navigation**: Single bottom action button (`Next: Who Paid` → `Next: Split Details` → `Create expense` / `Save changes`) pinned above the system navigation bar with disabled visual states when step validations are unmet.

---

### 5. Google Account Email-Password Link Exemption

- **Bug**: Accounts created via Google OAuth that later linked an email/password credential were blocked by email verification toasts on subsequent email/password logins.
- **Fix**: Aligned web authentication with Native Android (`needsEmailVerification`), explicitly exempting accounts with `GoogleAuthProvider.PROVIDER_ID` (`google.com`) in `providerData` from email verification checks.

---

### 6. Firestore Security Rules Alignment

- **Update**: Added `'payers'` to `affectedKeys().hasOnly([...])` under `/groups/{groupId}/expenses/{expenseId}` update rules in `firestore.rules`, enabling seamless collaborative editing of multi-payer expenses.

---

## Release Artifacts

| Artifact | Type | Size | SHA256 Checksum |
| :--- | :--- | :--- | :--- |
| `paymatrix-native-2.2.1.aab` | Android App Bundle (Signed) | 10.16 MB | `b8e10abc3fafd5446ddfcef2ae93fa8738e0fd40566846ab8023e4d3d024a0e7` |
| `paymatrix-native-2.2.1.apk` | Release APK (Signed) | 5.22 MB | `1099429d7d155d1e46cf9684fa7f94e911c9cf701d44e7107f88b2a412151336` |
| `paymatrix-native-2.2.1-mapping.txt` | ProGuard / R8 Mapping | 72.4 MB | — |

---

## Verification & Test Results

- **Native Android Tests**: Gradle `testDebugUnitTest` completed cleanly (30 tasks passed).
- **Native Android Release Bundle**: `bundleRelease` generated signed production AAB (`BUILD SUCCESSFUL`).
- **Native Android Release APK**: `assembleRelease` generated signed standalone APK (`BUILD SUCCESSFUL`).
- **Web Unit Tests**: Vitest suite passed 100% (`32 passed`, including multi-payer balance engine tests).
- **Web Production Build**: Vite build completed successfully (`dist/` generated, PWA precache: 112 assets).
- **Web Lint & Format**: ESLint (`0 errors`) and Prettier formatting checks passed.
