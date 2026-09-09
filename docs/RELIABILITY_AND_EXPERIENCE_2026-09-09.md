# paymatrix: two-part improvement plan

## Part one — reliability (implemented locally)

- **PWA startup:** navigation uses the installed precached shell immediately, instead of waiting up to 1.5 seconds for network HTML. HTML and hashed bundles stay within the same release. The existing service-worker update checks download new releases in the background; activation remains explicit to protect unfinished forms.
- **Authenticated startup:** restore the verified Firebase session before waiting for profile enrichment. Clean up old listeners and reset account data on identity changes. The notifications listener now queries the actual `to` field.
- **Saved web balances:** render Firestore's local snapshot first and refresh in the background. Label cached balances, refresh on reconnect/late read completion, cancel obsolete screen updates, and retain prior data on failure instead of replacing it with a fabricated zero balance. Local Firestore query caches may be incomplete; cached figures are provisional.
- **Saved Android data:** restore the cached account profile and group/summary snapshot on startup. Display reads have a bounded network wait with saved-data fallback. Existing listeners refresh data; group-list metadata changes trigger refresh after reconnect. Cached display reads do not advance the last-sync timestamp. Mutation validation keeps its existing read paths and settlement confirmation remains online-only.
- **Notification destinations:** web activity rows and foreground toasts navigate; service-worker clicks await navigation/focus. Android tray notifications carry distinct pending intents, and launcher-intent extras cover background FCM delivery. In-app notification rows use the same allowlisted resolver. Friend events open Friends; group events open the related group; unknown/external URLs fall back to Home. Pending native destinations wait for authentication/loading.
- **Expense editing:** retain the existing reactive version/payer/split hydration. Disable progression until the existing expense has hydrated. Later snapshots do not reset in-progress edits or silently replace their initial version.

## Verification

- Web: **42 tests passed** across six files, including service-worker navigation/click behavior, slow-network cache fallback, missing-cache handling, and notification routing.
- Web: targeted ESLint and production build passed; Workbox generated the service worker and precache. Build evidence: `../native-android/build/part-one-web-build.log`.
- Android: **26 unit tests passed**, including notification route validation. Debug build succeeded. Lint report has no errors (existing warnings remain).
- Android API 36 emulator: **one dedicated expense hydration test passed**, covering delayed arrival, 60/40 payer percentages, 25/75 split percentages, save gating, and later version changes. No financial write was sent by the synthetic test.
- Android evidence: `../native-android/build/reliability-verification.log` and `../native-android/app/build/reports/androidTests/connected/debug/index.html`.
- The existing audit emulator had a release-signature mismatch with debug tests. Its app/data were preserved; the successful run used a separate writable emulator data directory.
- The design detector reported no findings for the touched web screens. This is not a full visual audit; that belongs to part two.

**Still needs physical-device confirmation:** installed iPhone PWA cold/offline launch after deployment; real Android foreground/background/terminated push taps; cached account and financial data under real poor-network conditions; end-to-end concurrent expense saves against Firestore. An initial install without saved assets/data still needs a connection. iOS can evict site storage; instant startup cannot be guaranteed after eviction.

## Part two — experience and final APK (implemented)

1. Android widgets: realistic picker previews, group selection/reconfiguration, a selected-group balance widget, group-specific add-expense and scan-bill actions, and an overall summary widget. Show saved-data freshness and handle logout/deleted groups.
2. Light-theme actions: replace overly heavy black button surfaces with theme-consistent action colors and verify contrast, pressed and disabled states.
3. Compact Friends and group activity rows; working member-details actions including friend status/add friend where allowed.
4. Shared type, title placement, horizontal padding, section/card spacing and paragraph scale across native tabs. Verify light/dark, small screens and large text with real rendered captures.
5. Finish a source-backed Splitwise parity table against both clients. Investigate currency conversion, receipt itemization and default group splits; distinguish missing features from existing features or incomplete UX. Do not blindly add every competitor feature.
6. Build the final signed APK after the above work, retaining `com.paymatrix.app`, release signing identity, and lowercase `paymatrix`/`logo.png`. Verify package/version/signature and upgrade behavior, then report remaining physical-device gates.

## Research used

- [Google PWA navigation patterns](https://web.dev/articles/handling-navigation-requests): precached HTML with matching deployment assets.
- [Google PWA serving](https://web.dev/learn/pwa/serving): installed service workers can serve visits without navigation network requests.
- [Firebase offline persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline): local snapshots and cache metadata; cached queries can be incomplete.
- [FCM Android reception](https://firebase.google.com/docs/cloud-messaging/android/receive-messages): background notification/data messages deliver routing data through launcher intent extras.
- [Android widget quality](https://developer.android.com/docs/quality-guidelines/widget-quality): representative previews and deliberate configuration are part of quality widgets.
- [Splitwise features](https://www.splitwise.com/) and [Splitwise Pro](https://assets.splitwise.com/subscriptions/new): source material for the second-part comparison.

## Repository and release state

Branch: `codex/android-experience-2.3`. Starting HEAD: `5c4f128`.
No commit, push, PR, merge, production deployment or final signed release was performed for part one. Existing `firestore.rules` edits and the supplied `AGENTS.md` were preserved. `native-android/` is intentionally Git-ignored: native changes and test artifacts exist locally and will not be included in an ordinary web commit.

These changes improve startup and interaction reliability. Million-user capacity has not been established. Server-side aggregation, query/read budgets, load tests, monitoring, abuse controls and a staged rollout need separate evidence before making that claim.

Part-two implementation details and final verification are recorded in [release notes](../native-android/docs/RELEASE_2.3.1.md). The requested [Splitwise comparison](SPLITWISE_COMPARISON_2026-09-09.md) distinguishes existing functionality from remaining gaps.
