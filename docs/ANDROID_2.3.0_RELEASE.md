# paymatrix 2.3.0

Android version code: 23000. Package: com.paymatrix.app.

## What changed

- Softer neutral obsidian and a warm ivory light theme. System, Light and Dark choices live in Profile → Make it yours and persist on the device.
- Navigation matches the selected theme, sits immediately above the system gesture area, and uses short fades. At large text sizes, the labeled navigation scrolls horizontally instead of clipping.
- Items & charges replaces dish-specific GST wording. It supports proportional receipt charges and discounts for any purchase. How it works opens a sheet with an easy example and the current bill calculation. The form no longer displays the explanation by default.
- Transaction action buttons no longer have an enclosing box. Essential copy is larger and several fixed-height controls now grow with text.
- Spending Logs opens with a short explanation and one creation action.
- Optional local reminders invite a review after time away or a check on changes previously waiting to sync. Quiet hours, rate limits, snooze and disable actions run on the device through WorkManager.
- A privacy-safe home-screen widget opens paymatrix or the group picker for adding an expense. It shows no balances or names.
- Save actions disable during work, and save progress remains visible above forms/dialogs.

## Use it

1. Install the APK as an update to a release-signed installation. Play-signed installations may require the Play delivery path if their certificate differs; do not uninstall a real user's app to work around that.
2. Profile → Make it yours → choose System, Light or Dark.
3. Add/edit expense → Split → Items & charges → enter item subtotals. Tap How it works for the explanation.
4. Profile → Make it yours → enable Quiet local reminders if wanted. Android notification permission is required.
5. Tap Add widget, or long-press the Android home screen → Widgets → paymatrix.

## Boundaries

This is proportional receipt allocation, not a GST tax-rate engine. Mixed-rate items and participant-specific fees should use Exact shares. Existing itemized/dishPaise data remains compatible. No database/rules migration or payment-confirmation behavior change is included.

Reminders use local state, so wording says what was pending last time; it never asserts another person's current debt. Android controls execution timing, and force-stop prevents ordinary background delivery until reopening. Physical-device delivery and authenticated production workflows are not certified by synthetic UI fixtures.

The widget deliberately provides shortcuts rather than cached financial data. Rich balance widgets and full line-item tax modeling remain follow-up product work in the audit plan.

## Verification

- Debug APK, signed release APK and signed AAB built successfully.
- 23 JVM tests passed, including paise conservation, receipt charges/discounts, zero/negative subtotal rejection and reminder suppression rules.
- Four Android instrumentation tests passed at normal size and again at 360dp width with 200% text. These cover save feedback, synthetic screen rendering/help-sheet interaction, and Android widget binding while offline.
- 72 synthetic UI captures cover 16 routes plus payer/split steps across both appearances and the two size settings. They do not exercise every authenticated backend mutation or every dialog.
- Lint: 0 errors, 65 warnings. Remaining warnings include dependency-update suggestions, launcher asset conventions, KTX suggestions, widget button styling and an existing credential exception-handling recommendation. They were not suppressed to claim a clean audit.
- APK metadata verified: com.paymatrix.app, 2.3.0, 23000, min SDK 24, target SDK 36. APK alignment passed. Certificate SHA256 matches 2.2.2: `77bc53c8e4c6eeb17449750b0bd1d83901682030219e8a363963428e9820659f`.
- On the isolated API 36 emulator, release 2.2.2 installed and upgraded in place to release 2.3.0 successfully. Cold launch completed; crash log was empty at inspection.
- The first launch screenshot included a System UI ANR dialog. After stopping the build daemon and restarting the isolated emulator, the app opened cleanly and sign-in → registration navigation passed using actual touch input. The cause of the System UI interruption was not established; the QA archive retains both captures.
- Physical-device Google/email login, UPI/camera behavior, long-duration reminder delivery under vendor battery restrictions, TalkBack traversal and frame-time benchmarks remain unverified. No Play Console submission is included.

## Source and recovery

The repository intentionally keeps Android source local as of ced5c4e. The release attaches a sanitized native-source ZIP with a per-file SHA256 manifest and build instructions. It excludes Firebase account configuration, SDK paths, signing material, caches and generated build outputs. The Git tag records the release documentation and packaging script; use the attached native-source archive to reproduce the app source.

Keep 2.2.2 available. If a critical regression is reported, stop promoting 2.3.0 and publish a corrected higher version using the existing key. Do not prescribe uninstall/downgrade as a data-preserving rollback. Play distribution and a main-branch merge are separate from this GitHub release.
