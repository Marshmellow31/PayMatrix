# paymatrix 2.3.1 — reliability and everyday use

Version code 23001; package com.paymatrix.app. Includes the 9 September part-one reliability changes and part-two widget/UI work.

## Implemented
- Overall-summary widget and configurable group widget. Group actions open the selected group’s expense form or scanner. Native configuration can be reopened with Edit or launcher reconfiguration. Widgets use private saved snapshots and state their freshness; account switches clear them. They do not run background financial queries or write expenses themselves.
- Realistic Android 12+ preview layouts, Android 15+ generated previews, and older-device PNG previews rendered from the real widget views. Picker values are illustrative; actual widgets show a dash until data is available.
- Warm light theme with sage action surfaces, consistent page insets/title/body scales, compact Friends and member rows, expandable group logs, and a member details sheet with appropriate friend actions and shared groups.
- Group-aware scanner handoff; analysis remains online and all extracted data is reviewed in the expense form before saving.
- Cached PWA startup, notification destinations, saved data fallback, and tested asynchronous expense edit hydration from part one.

## Usage
1. Install the signed APK as an update and open paymatrix once to load your account/groups.
2. Long-press an empty area of your Android home screen, choose Widgets, then paymatrix.
3. Add Overall summary, or add Group balance and choose a group, then Save widget.
4. Tap Add expense or Scan bill on the group widget. Tap the title/balance to open the group. Tap Edit to change the group.
5. In a group, open Members and tap a person for details. In Logs, tap an entry to expand its full text/actions.

## Limits
Widgets show the last app snapshot, not continuously live server balances. They refresh as the app loads/updates; timestamps and pending-sync labels make this explicit. A removed group requires reconfiguration after the app receives that change. Android launcher behavior varies. iPhone PWA startup needs the web changes deployed and the service worker updated; installing this APK does not deploy the web app.

Real-device push reception, camera/AI, sign-in and multi-user financial flows still need device confirmation. Local tests cannot establish million-user capacity. See ../../docs/SPLITWISE_COMPARISON_2026-09-09.md for the requested feature comparison.

Source remains in the intentionally Git-ignored native-android directory. No push, PR, merge or production deployment is included in this local build.

## Final verification — 9 September 2026
- 27 Android unit tests passed; lint completed without errors (existing warnings remain).
- Six instrumentation tests passed at normal and 200% font scale, including edit hydration, save feedback, both widget providers, and synthetic light/dark screen captures. Evidence: build/part-two-nav-device.log and build/part-two-nav-large.log; captures: docs/experience-2.3.1/nav-final and nav-large.
- Latest requested navigation refinement included: 3dp icon/label gap, slimmer 22dp outer corners, unified selected-tab background, and minimum 52dp touch targets.
- Final build: build/part-two-nav-final.log, BUILD SUCCESSFUL. Signed APK: releases/paymatrix-2.3.1.apk, package com.paymatrix.app, version 2.3.1 (23001).
- APK SHA256: efe65a00962bff9dd260fcff1b6be3e4a2fe3e9543b18ba27e4e2b8c4756b3f2.
- Signing certificate SHA256 matches 2.3.0: 77bc53c8e4c6eeb17449750b0bd1d83901682030219e8a363963428e9820659f.
- Isolated emulator signed update 23000 → 23001 succeeded with firstInstallTime unchanged; cold launch succeeded and AndroidRuntime recorded no crash. This verifies installation compatibility, not real-account data migration or physical-device behavior.
- Branch codex/android-experience-2.3, existing HEAD 5c4f128. Changes remain local; no new commit, push, PR, merge, or web deployment. Unrelated firestore.rules and AGENTS.md preserved.
