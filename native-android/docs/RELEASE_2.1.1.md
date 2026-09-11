# paymatrix Android 2.1.1 Release Notes

## Overview

Version `2.1.1` (`versionCode = 21001`) delivers major user interface polish across the native Jetpack Compose Android client, resolving layout and spacing constraints, introducing floating quick-actions in group views, overhauling friend management with a dedicated 3-dots detail modal, and adding comprehensive back-gesture handling for all modals and dialogs.

---

## What's New in 2.1.1

### 1. Group Detailed View & Floating Scan Bill
- **Floating Bill Scanner (FAB)**: Relocated bill scanning to a high-visibility Floating Action Button on the bottom-right (`Icons.Default.DocumentScanner`), keeping bill capture accessible at any scroll depth.
- **Space-Optimized Hero Banner**: Redesigned `GroupHero` to eliminate redundant whitespace and duplicated titles:
  - Clean Category Icon badge, group name, category pill, and 1-tap copy invite code pill.
  - Symmetrical 2-button row: **Add expense** (primary white) and **Settle up** (secondary obsidian), with equal 50% width to prevent text wrapping.
- **Compact Expenses Timeline**: Compacted expense cards with a 40dp category icon container, single-line subtitle (`Paid by [Name] · [Date]`), bold amount display, and tighter vertical spacing.

### 2. Friends & Requests Tab Overhaul
- **Fixed TabRow Layout**: Replaced custom wrapping row with a Material 3 `TabRow` where **Friends (N)** and **Requests (N)** sit horizontally side-by-side with equal distribution, preventing vertical text wrapping.
- **Friend 3-Dots Details Modal**:
  - Tapping a friend or their `3-dots` menu button opens a detailed modal showing:
    - Shared groups list with category badges and per-group balance status.
    - 1-tap navigation to any shared group.
    - Net settlement position with that friend.
    - "Remove friend" option with confirmation dialog.

### 3. Bottom Navigation Bar Refinement
- Removed fixed height and custom box wrappers that caused vertical crowding on gesture navigation devices.
- Implemented native Material 3 pill indicators (`indicatorColor = Color.White.copy(alpha = .12f)`) with clean icon sizing (22dp) and bold active labels.

### 4. Back Gesture & Modal Dismissal
- Integrated `androidx.activity.compose.BackHandler` across `FriendsScreen`, `GroupScreen`, `LogGroupsScreen`, `LogEntriesScreen`, and `ProfileScreen`.
- Performing an Android back swipe/gesture now dismisses any open modal, dialog, or dropdown menu before navigating back.

### 5. Spending Logs Onboarding Explainer
- Added a rich **3-Step Explainer Hero Card** for new users with no spending logs, explaining the difference between split debt groups and personal/family timelines.

### 6. Profile Redesign & Text Alignment
- Dedicated **UPI Payment Details Card** with status badge, payment app compatibility note, and edit action.
- Perfectly aligned metric tiles ("TOTAL SHARED" and "ACTIVE GROUPS").

---

## Technical & Release Identity

- **Package**: `com.paymatrix.app`
- **Version**: `2.1.1`
- **Version Code**: `21001`
- **Min SDK**: `24` (Android 7.0)
- **Target SDK**: `36` (Android 15+)
- **Artifacts**: `native-android/releases/paymatrix-native-2.1.1.apk` (and SHA256 checksum)
- **Signing**: Continuous release keystore matching `v1.2.5` - `v2.1.0`.
