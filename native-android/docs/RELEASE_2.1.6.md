# PayMatrix Native Android 2.1.6 Release Notes

- **Version Name**: `2.1.6`
- **Version Code**: `21006`
- **Package Name**: `com.paymatrix.app`
- **Target SDK**: 35 (Android 15)
- **Minimum SDK**: 26 (Android 8.0)
- **Release Date**: September 4, 2026

---

## 🚀 Key Updates & Bug Fixes

### 1. Web-Parity Step-Wise Expense Creation
- Migrated expense creation and editing into an interactive 2-step wizard:
  - **Step 1 (Essentials)**: Large amount input (`₹`), title, category selection chips, date picker, and group tag.
  - **Step 2 (Split & Distribution)**: Payer horizontal selector, Split method (Equal, Exact, GST), dynamic Select All / Deselect All, and real-time live distribution preview with exact member shares.
- Dynamic `SELECT ALL` / `DESELECT ALL` toggle automatically reflects current participant selection.

### 2. Transaction Editing Fix
- Resolved Firestore version type conflict where numeric version updates failed if previously written as Double from the web client.
- Hardened `updateExpense` audit logging and payload immutability for `paidBy`.

### 3. Web-Parity Settle Up & UPI Payment Options
- Introduced redesigned Settle Up modal matching web UI:
  - **Total You Owe** summary card with quick **Settle All** button.
  - **Recommended Payments** with **Ready** (UPI ID configured) and **No ID** badges.
  - **Partial Settlement** with inline amount editing.
  - **Custom Settlement** for settling custom amounts with any group member.
- **On-Device UPI QR Generation**: Built-in ZXing QR generator creating high-resolution UPI payment QR codes (`upi://pay?pa=...&pn=...&am=...&cu=INR`).
- **Save QR to Device Gallery**: Seamlessly saves QR code to `Pictures/PayMatrix` via Android MediaStore.
- **Pay via UPI App**: Native Intent launcher supporting Google Pay, PhonePe, Paytm, and default UPI applications.
- **Copy UPI ID**: One-tap clipboard copy with user feedback.

### 4. Google Sign-In Verification Bypass
- Fixed issue on certain Android distributions (e.g. OnePlus / OxygenOS) where selecting a Google account triggered an unexpected "account verification failed" error.
- Google accounts are now authenticated directly via Google OAuth without enforcing email verification checks.

---

## 📦 Artifacts & Checksums

### Signed Production APK
- **File**: `releases/paymatrix-native-2.1.6.apk`
- **SHA-256**: `3EF3A432CA7A3D2E834DFF3664B2610560F9B21B13BC2FC9558ECACD17D80552`

### Google Play App Bundle (AAB)
- **File**: `releases/paymatrix-native-2.1.6.aab`
- **SHA-256**: `0CF4058CB3F46C569108174A48574A5D17D1E784C9A0585AA70510D380BDA6F5`
