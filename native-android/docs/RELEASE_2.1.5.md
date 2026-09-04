# paymatrix Android 2.1.5 release record

## Scope

Version 2.1.5 resolves Google Sign-In re-authentication failures ([16] Account reauth failed), updates Google branding to the official 4-color asset, and refines authentication usability across both email and Google sign-in flows. It preserves package com.paymatrix.app, database integrity, and release signing identity.

### Changes and Bug Fixes

- **Google Sign-In Reliability**:
  - Configured GetGoogleIdOption with ilterByAuthorizedAccounts = false and utoSelectEnabled = false to guarantee the interactive Google Account chooser opens reliably.
  - Implemented automatic stale credential state clearing and retry on transient Play Services reauth ([16]) errors.
  - Handled credential cancellation gracefully without displaying unexpected error alerts to the user.
  - Added user-friendly translations for authentication error messages.
- **Branding & UI**:
  - Replaced the plaintext placeholder with the official 4-color Google vector logo (ic_google_logo.xml).
  - Added keyboard IME actions (Done / action triggers) on authentication text fields for smoother input.
- **Build & Identity**:
  - Bumped ersionCode to 21005 and ersionName to "2.1.5".

## Verification completed on 4 September 2026

- Android release build: compiled, linted, and packaged with R8 shrinking via JDK 17.
- Signed App Bundle: 
ative-android/releases/paymatrix-native-2.1.5.aab (10.48 MB).
  - SHA-256: 504C3ACD298A82552CC3C2ECE03A65102A79CEE84C0804E8A4E1B273B26D6DA2
- Signed Release APK: 
ative-android/releases/paymatrix-native-2.1.5.apk (5.40 MB).
  - SHA-256: D5782B538221D659E045585EE084B6693BEFD3C5BD6DC66F4E51CFFB95B8D7D7
- Signature Scheme v2 verified with paymatrix-upload-key.jks.
- 16 KiB page-alignment verified (Alignment..: 16384 bytes (PAGE)).
