# PayMatrix Android Performance and UX

## Purpose

This document defines the production UX and performance contract for the PayMatrix Android app.
It applies whether the first Android implementation is a native shell around the existing React
application or a later fully native UI. The Android app must remain a separate build target from
`frontend/`; the existing Vite PWA must continue to build and deploy independently.

PayMatrix is a financial collaboration app. Correct balances, predictable navigation, and reliable
input are more important than decorative animation. A device being old, offline, rotated, or set to
three-button navigation must not make an expense form unsafe to use.

## Current PayMatrix Baseline

- The web client is React 19, React Router 7, Redux Persist, Firestore, Framer Motion, Chart.js, and
  a Vite PWA.
- Current Google login in `frontend/src/services/authService.js` uses `signInWithPopup`. The Android
  app must not invoke this web popup. It must use the native Google account chooser and exchange the
  returned Google credential with Firebase Authentication.
- Current notifications in `frontend/src/services/fcmService.js` use browser service workers and a
  VAPID key. Android must use the native FCM registration token and Android notification channels.
- Important routes include `/dashboard`, `/groups`, `/groups/:id`, expense forms, `/friends`,
  `/activity`, `/profile`, `/join/:code`, onboarding, and admin routes.
- First-run state uses `paymatrix_onboarding_seen_v1`. Invite handling uses `pendingInviteCode`.
  Android navigation and storage changes must preserve both flows.
- The web CSS currently disables root overscroll and pull-to-refresh. Android must make an explicit
  refresh decision per screen instead of accidentally enabling WebView overscroll.

## Definition of Done

The Android UX is release-ready only when all of these are true:

- System Back works identically with gesture navigation, the software Back button, and legacy
  hardware/three-button Back.
- Predictive Back is supported on current Android versions; an edge swipe is never consumed merely
  to run analytics or business logic.
- No tappable control, focused field, snackbar, dialog action, or bottom navigation item is hidden by
  a status bar, display cutout, navigation bar, gesture inset, or keyboard.
- Text entry remains usable with Gboard and at least one OEM keyboard, including autofill, password
  manager overlays, suggestion rows, and the numeric keypad.
- Layout survives portrait, landscape, split-screen, tablet, and fold/unfold changes without losing
  draft expense data.
- Scrolling and gestures render at the display's active refresh rate without an app-imposed 60 Hz
  cap. Performance is measured at 60, 90, and 120 Hz.
- No critical journey contains a repeatable long main-thread task, visible blank frame, double tap,
  or touch response delay.
- The release candidate passes the device matrix and performance gates in `06-TESTING.md`.

## Android Back Contract

Use AndroidX `OnBackPressedDispatcher` or the current supported AndroidX back API in the host
Activity. Do not intercept `KEYCODE_BACK` and do not call deprecated `Activity.onBackPressed()`.
Keep predictive Back enabled.

Back handling must use this order. Only the first applicable rule consumes the event:

1. Dismiss a transient native surface: account chooser, permission rationale, date picker, menu,
   bottom sheet, full-screen image, or dialog.
2. Dismiss the top web surface: modal, drawer, command menu, toast action surface, or selection mode.
   The web layer must expose whether such a surface is open; do not infer it from DOM class names.
3. If an expense, settlement, profile, or group form is dirty, show one discard confirmation. A
   second Back after choosing Discard leaves the screen. Choosing Keep editing cancels Back.
4. If the embedded navigation stack can go back, navigate exactly one PayMatrix destination back.
   Never call both `history.back()` and a native pop for the same gesture.
5. At the authenticated root (`/dashboard`) or unauthenticated root, let Android perform back-to-home.
   Do not redirect root Back to another tab and do not show an exit confirmation.

Additional rules:

- After successful native Google login, remove login destinations from the back stack. Back must not
  return to the login screen.
- A `/join/:code` deep link must retain the invite through login and resume joining after auth.
- Bottom-navigation tab changes are not an unbounded history list. Back from a nested tab screen
  returns to that tab's root; Back from a root screen returns home.
- If an external browser, camera, document picker, or share sheet was launched, Android owns that
  child Activity. Returning from it must restore the same PayMatrix route and draft.
- Back cancellation during a predictive gesture must restore the current surface without committing
  navigation or form changes.
- Do not use an edge-swipe listener that competes with Android's left or right system Back gesture.

Official reference: [Predictive Back](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture).

## Gesture Navigation

### System gestures

- Reserve the left and right edge regions for Android Back. Avoid horizontal drag handles, sliders,
  and destructive swipe actions at the screen edge.
- Do not request gesture exclusion for whole screens. A small exclusion rectangle is acceptable only
  for a control whose core function cannot work otherwise, and it must be tested on both edges.
- Preserve Android's home gesture area. Bottom actions must sit above the mandatory gesture inset.
- Three-button navigation is a first-class mode, not a compatibility afterthought.

### App gestures

- Use gestures only as shortcuts. Every swipe action must have a visible tap alternative.
- A horizontal swipe must not trigger until horizontal movement clearly exceeds vertical movement.
  Vertical lists must continue scrolling when the user's motion is mostly vertical.
- Never use a swipe alone for deleting an expense, settlement, friend, or group. Require a visible
  confirmation for destructive financial actions.
- Touch targets must be at least 48 by 48 dp, with at least 8 dp separation where accidental taps
  could change money or membership.
- Do not globally disable pinch zoom for accessibility. Prevent accidental form zoom by using
  readable input sizes and responsive layouts.
- Avoid long-press-only actions. Long press may expose a shortcut but cannot hide core functionality.

### Pull to refresh

Do not enable generic WebView pull-to-refresh. Firestore snapshot listeners already update primary
data. If a specific screen needs manual refresh, use a native or clearly bounded refresh container
that:

- activates only when the inner list is at scroll position zero;
- shows progress without moving fixed navigation under system bars;
- deduplicates concurrent requests;
- preserves cached data on failure; and
- provides a retry action and accessible status announcement.

## Edge-to-Edge, Insets, and Safe Areas

New Play releases should target current Android requirements, which means edge-to-edge behavior is
mandatory on modern devices. The host Activity must draw edge-to-edge and provide authoritative
window insets to the UI.

Required inset categories:

- status bars and display cutouts;
- navigation bars for gesture and three-button modes;
- mandatory system gesture regions;
- IME/keyboard insets; and
- caption bar or taskbar in freeform and large-screen modes.

Implementation contract:

- The native root consumes no inset until it has passed the correct values to the screen that needs
  them. Avoid consuming insets in a parent and starving siblings on older Android versions.
- If a WebView hosts the React UI, expose native insets as CSS custom properties and map them to the
  top-level layout. Do not assume `env(safe-area-inset-*)` alone reflects every Android WebView and
  keyboard configuration.
- Background color or imagery may extend under system bars. Text, inputs, navigation items, floating
  buttons, and destructive actions may not.
- Scrolling content may continue behind a transparent navigation bar, but its final item needs bottom
  padding equal to the navigation inset plus its normal spacing.
- Status and navigation icon appearance must update for light/dark surfaces and maintain contrast.
- Test hole-punch, corner cutout, center cutout, rounded-corner, gesture, and three-button emulators.
- Snackbars appear above bottom navigation and the current system/IME inset.
- Full-screen dialogs and sheets receive their own inset handling; they cannot rely on Activity padding.

Official reference: [Edge-to-edge in Views](https://developer.android.com/develop/ui/views/layout/edge-to-edge).

## Keyboard and Form Behavior

The host Activity should resize the usable content for the IME. Do not solve keyboard overlap by
adding a fixed bottom margin or by panning the entire window.

Required behavior:

- The focused field and its validation message remain visible above the keyboard.
- Sticky submit actions move above the IME or become part of the scrollable form; they never remain
  behind the keyboard.
- Opening or closing the keyboard must not reload the WebView, reset React state, or navigate.
- The Back gesture closes the keyboard first when an editable field owns IME focus. A subsequent Back
  follows the screen navigation contract.
- Use numeric decimal input for expense amounts, but allow locale-appropriate decimal separators and
  normalize only after validation.
- Use `Next` between fields and `Done` only when submitting is valid and idempotent.
- Pressing `Done` while a save is already in flight must not create a duplicate expense.
- Autofill must work for identity fields. Do not mark ordinary fields as password fields to suppress
  keyboard suggestions.
- Focus returns to the triggering control after a dialog, date picker, account chooser, or error is
  dismissed.
- Validation errors are announced and linked to their fields. Do not clear entered values on an error.
- Test font scale 100, 130, and 200 percent with the keyboard open.

For WebView layouts, `100dvh` is preferable for live viewport height, but native IME inset delivery is
the source of truth. Any `visualViewport` fallback must be debounced and removed on unmount.

## Screen Orientation and Window Changes

Do not lock PayMatrix to portrait. Support portrait and landscape on phones, tablets, foldables, and
resizable windows. A future store decision to restrict a form factor must be explicit and documented,
not introduced as an orientation shortcut.

On rotation, resize, split-screen, or fold/unfold:

- retain authenticated session, active route, scroll position where practical, modal state, and all
  unsaved expense fields;
- do not duplicate Firestore listeners or re-submit writes;
- recompute available width and insets instead of using cached screen dimensions;
- collapse multi-column layouts before text or action buttons overlap;
- keep charts readable with an accessible tabular alternative; and
- restore camera/document-picker results exactly once after Activity recreation.

Test both "Don't keep activities" and background process termination. Persist only the minimum draft
data needed to recover; never persist Google tokens or service credentials in web storage.

## Refresh Rate and Jank Goals

PayMatrix must follow the display's active refresh rate. Do not select a fixed display mode merely to
claim 120 Hz, and do not run animation timers at a hard-coded 60 fps. Use vsync-driven animation and
allow Android to choose an appropriate mode for power and thermal conditions.

Frame budgets:

| Active refresh rate | Approximate frame budget |
| --- | ---: |
| 60 Hz | 16.7 ms |
| 90 Hz | 11.1 ms |
| 120 Hz | 8.3 ms |

Production goals:

- Touch feedback begins in the next rendered frame under normal load.
- Common scrolls, tab changes, modal opens, and Back transitions have no repeatable visible hitch.
- No single JavaScript task over 50 ms occurs in a normal core journey after warm-up.
- Cold launch shows a stable branded surface quickly and never a prolonged white WebView flash.
- Login account chooser invocation, dashboard first content, and expense save have performance traces.
- The app remains usable during sync; network latency must not block the UI thread.
- Test performance in a release build with debugging disabled. Debug WebView results are diagnostic,
  not release evidence.

These are engineering gates, not a promise that every physical frame is always delivered. Android can
lower refresh rate under battery saver, thermal pressure, static content, or OEM policy. The app must
avoid adding its own bottleneck and must remain responsive under those conditions.

Official reference: [Measure Android performance](https://developer.android.com/topic/performance/measuring-performance).

## PayMatrix Performance Hotspots

### React and WebView

- Keep the native bundle separate from the PWA deployment. Build the web assets once for a release and
  package immutable, hashed assets; do not point production at the live Vercel site.
- Disable PWA install prompts and browser-only service-worker behavior inside the Android build.
- Avoid rerendering the whole route on Firestore snapshot changes. Normalize records and update only
  affected list rows or balance summaries.
- Virtualize long activity, notification, friend, group, and admin lists after measurement shows a
  need. Preserve accessibility order and scroll restoration.
- Lazy-load admin routes, analytics charts, bill scanning, PDF export, and other non-launch features.
- Pause Framer Motion and chart animation when the Activity is not resumed or the element is offscreen.
- Respect Android's reduced-motion accessibility setting.
- Prefer transform and opacity animation. Avoid animating layout, large blur radii, and full-screen
  backdrop filters during scroll.
- Keep DOM depth and fixed translucent layers low. The current web login uses large blur effects;
  Android login is a separate native screen and should avoid those costly layers.

### Firestore and state

- Attach only the listeners needed by the visible journey and unsubscribe on route exit or logout.
- Do not create duplicate listeners after rotation, WebView recreation, or auth restoration.
- Paginate unbounded activity/log collections and cap initial query sizes.
- Keep balance calculations deterministic and off the animation path. Large calculations should be
  scheduled outside touch/scroll handling and measured before moving to a worker.
- Show cached data immediately with a clear sync state. Do not blank the dashboard during reconnect.
- Keep write actions idempotent so retry, rotation, or a double tap cannot duplicate money records.

### Native shell

- Create one main host Activity unless a platform flow requires another Activity.
- Initialize Firebase and nonessential monitoring without blocking first draw.
- Avoid synchronous disk, keystore, network, and JSON work on the main thread.
- Keep release WebView debugging disabled and permit only PayMatrix-owned navigation in the host.
- Pause or destroy camera and heavy resources when backgrounded.

## WebView Profiling Procedure

Use a debuggable non-production build with test data. Never enable WebView remote debugging in a Play
release.

1. Connect a physical device with USB debugging and confirm it using `adb devices`.
2. Open the app and reproduce one journey at a time: cold launch, login, dashboard scroll, group open,
   expense form, save, chart open, and Back.
3. On desktop Chrome, open `chrome://inspect/#devices`, select the PayMatrix WebView, and choose Inspect.
4. Record a Performance trace with screenshots, Web Vitals, and memory. Look for long JavaScript tasks,
   forced layout, excessive style recalculation, large paints, and repeated network calls.
5. Repeat with CPU slowdown only for diagnosis; final gates use an actual low-tier device.
6. Use the Memory panel to compare heap snapshots before and after opening/closing the same route five
   times. Detached DOM trees and growing listeners are failures.
7. Use Android Studio CPU, Memory, Network, and Energy profilers for the host and WebView processes.
8. Capture a System Trace/Perfetto trace for a repeatable hitch. Correlate main thread, RenderThread,
   WebView renderer, binder, GC, and frame timeline events.
9. Enable Developer Options > Show refresh rate to confirm 90/120 Hz activation during interaction.
10. Record build type, device, OS, WebView version, thermal state, and trace link with every finding.

## Performance Release Gate

- [ ] Tested a release-signed or release-equivalent build, not only debug.
- [ ] Completed cold and warm launch traces on low-tier and current flagship physical devices.
- [ ] Completed 60, 90, and 120 Hz interaction checks where hardware supports them.
- [ ] Found no repeatable visible jank in dashboard, group detail, expense entry, activity, and Back.
- [ ] Found no WebView listener, DOM, Activity, or Firebase subscription leak after five repetitions.
- [ ] Verified keyboard, insets, three-button navigation, gestures, rotation, split-screen, and font scale.
- [ ] Verified battery saver and one thermal-throttled run remain functionally responsive.
- [ ] Uploaded the candidate to the internal Play track and reviewed Android vitals before wider rollout.

## References

- [Android predictive Back](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture)
- [Android custom Back navigation](https://developer.android.com/guide/navigation/navigation-custom-back)
- [Android edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
- [Android performance measurement](https://developer.android.com/topic/performance/measuring-performance)
- [Android slow rendering](https://developer.android.com/topic/performance/vitals/render)
