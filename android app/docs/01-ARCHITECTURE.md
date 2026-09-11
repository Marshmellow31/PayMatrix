# PayMatrix Android App: Architecture

## Architecture decision

Use Capacitor as a native Android container around an Android-mode build of the existing React and Vite application. Keep the native project, native dependencies, Gradle build, Android resources, and release configuration under `android app/`. Keep `frontend/` as the canonical web/PWA application.

The design deliberately does not use a remote production URL inside WebView. Every release packages a versioned, verified Vite artifact so the installed app starts without depending on the availability or mutable state of the Vercel frontend.

## System context

```text
PayMatrix web release
  frontend/ source
    -> Vite web build
    -> frontend/dist
    -> Vercel + PWA service worker

PayMatrix Android release
  frontend/ source
    -> Vite Android-mode build
    -> android app/www (generated)
    -> Capacitor sync
    -> android app/android (native project)
    -> Gradle
    -> debug APK / signed APK / signed AAB

Both clients
    -> Firebase Authentication
    -> Cloud Firestore
    -> Cloud Functions
    -> Firebase Cloud Messaging
    -> HTTPS scan-bill endpoint
```

## Target directory layout

Only the three documentation files exist in this pass. The following is the intended implementation layout:

```text
PayMatrix/
|-- frontend/
|   |-- src/
|   |   |-- platform/                 # Planned shared platform contract
|   |   |-- pages/
|   |   |-- services/
|   |   `-- ...
|   |-- public/
|   |-- package.json                  # Existing web package remains canonical
|   `-- vite.config.js                # Web behavior plus guarded android mode
|-- android app/
|   |-- docs/
|   |   |-- 00-GOALS-AND-SCOPE.md
|   |   |-- 01-ARCHITECTURE.md
|   |   `-- 02-IMPLEMENTATION-ROADMAP.md
|   |-- android/                      # Capacitor-generated native project
|   |-- scripts/                      # Asset validation and release helpers
|   |-- www/                          # Generated Android Vite artifact; ignored
|   |-- capacitor.config.ts
|   |-- package.json
|   |-- package-lock.json
|   |-- .env.example                  # Non-secret names only
|   `-- .gitignore
|-- functions/
|   `-- index.js                      # Dual-platform push and API support
|-- firestore.rules                  # Per-installation token authorization
`-- firebase.json
```

## Build boundary

### Web build

The current web command remains:

```powershell
npm --prefix .\frontend run build
```

Expected behavior:

- Outputs to `frontend/dist`.
- Includes the PWA manifest and service worker.
- Includes `InstallPrompt` and `PwaUpdatePrompt` behavior.
- Uses browser Google `signInWithPopup`.
- Uses browser FCM with VAPID and the service worker.

### Android build

The Android workspace invokes the existing Vite compiler with an explicit Android mode and output directory:

```powershell
npm --prefix .\frontend run build -- --mode android --outDir "..\android app\www"
```

The future `vite.config.js` change must make Android mode deterministic:

- PWA plugin disabled for `mode === 'android'`.
- No service worker emitted.
- No PWA install or update behavior activated at runtime.
- Source maps disabled for release unless uploaded privately to a crash service.
- `base` and asset URLs remain compatible with Capacitor's local HTTPS origin.
- Production API base injected through a non-secret environment variable.
- The output contains `index.html` and all referenced local assets.

The Android build then runs `npx cap sync android`, which copies `www/` into the native project and updates native plugin configuration.

### Artifact validation

Before `cap sync`, a script under `android app/scripts/` should fail the build unless:

- `www/index.html` exists.
- No Vite development host or live-reload URL is present.
- No `VITE_*` secret-like value is accidentally embedded beyond approved public Firebase configuration.
- No service worker registration asset is emitted for Android.
- The build identifies itself as Android runtime through a compile-time marker.
- The asset manifest is complete and contains no absolute local file paths.
- The expected version and Git commit are recorded in a generated metadata file.

`android app/www/` is disposable output and should not be committed.

## Source and file ownership

### Android-owned files

`android app/` owns:

- Capacitor dependencies and config.
- Gradle wrapper and Android Gradle project.
- `AndroidManifest.xml`, native resources, icons, splash assets, themes, and network security config.
- Kotlin or Java needed for Activity-level system behavior.
- Android signing hooks and release variants.
- Android plugin configuration.
- Android build scripts and generated `www/` assets.
- Android test code, Macrobenchmark module, and release runbooks.

### Frontend-owned files that will need narrow platform guards

The native folder cannot, by itself, make the existing Firebase JavaScript Auth instance authenticated. The following shared-runtime changes are expected during implementation, while preserving web behavior:

- `frontend/src/services/authService.js`: select web popup or native Credential Manager adapter.
- `frontend/src/pages/Login.jsx`: render a compact Android-specific login composition while keeping the existing web screen.
- `frontend/src/App.jsx`: disable PWA prompts in native runtime and mount native lifecycle/navigation bridges.
- `frontend/src/config/firebase.js`: initialize browser messaging only when supported and avoid WebView service-worker assumptions.
- `frontend/src/services/fcmService.js`: delegate to browser or native push adapter.
- `frontend/src/hooks/usePushNotifications.js`: use the platform adapter rather than browser capability checks alone.
- `frontend/src/main.jsx`: preserve browser setup and avoid gesture handlers that interfere with Android system navigation.
- `frontend/src/hooks/useBillScanner.js`: use an explicit Android-safe HTTPS API endpoint and attach Firebase identity.
- `frontend/src/utils/exportUtils.js`: delegate native file open/share operations where browser downloads are unreliable.
- `frontend/vite.config.js`: retain web PWA output and add Android-mode output behavior.

These files remain frontend-owned because they control React runtime behavior. The Android implementation must not fork whole pages into a copied source tree.

### Backend-owned files

- `functions/index.js`: per-installation FCM delivery, Android payloads, stale-token cleanup, and any callable API bridge.
- `firestore.rules`: owner-only device token documents.
- `frontend/api/scan-bill.js`: authenticated Android-compatible API behavior if Vercel remains the endpoint owner.
- Firebase Console: Android app registration, OAuth fingerprints, Google provider, FCM, App Check, and release configuration.

## Platform contract

Add a small interface with web and Android implementations. Feature code should depend on the interface, not directly on Capacitor.

Suggested contract:

```text
runtime.kind() -> "web" | "android"
runtime.isNative() -> boolean

auth.signInWithGoogle()
auth.signOut()

navigation.onBackRequest(handler)
navigation.onOpenUrl(handler)
navigation.minimizeAtRoot()

notifications.requestPermission()
notifications.getToken()
notifications.onTokenChanged(handler)
notifications.onReceived(handler)
notifications.onAction(handler)

files.shareFile(file, metadata)
files.openFile(file, metadata)

camera.pickReceipt(options)

haptics.selectionChanged()
haptics.confirm()
haptics.error()
```

Rules for the contract:

- Browser implementation must not import native code on its active path.
- Android implementation is loaded only after positive Capacitor platform detection.
- Feature code must remain testable with a fake adapter.
- Native errors are normalized into stable app-level error codes.
- Adapter methods must not expose Google ID tokens or FCM tokens to logs or Redux.

## Runtime initialization sequence

```text
1. Android launches MainActivity.
2. Capacitor loads packaged assets from the local HTTPS origin.
3. React mounts Redux and Redux Persist.
4. Platform bootstrap detects Android and installs native listeners once.
5. Firebase JS app and Auth initialize.
6. Auth state listener resolves the current session.
7. Deep-link or restored plugin result is read.
8. Router selects login, onboarding, invite, dashboard, or requested route.
9. After authenticated UI is stable, notification registration is evaluated.
```

Listener ownership must be explicit. App, push, and URL listener handles are removed on unmount or hot reload. Do not call broad `removeAllListeners()` because another feature may own a listener.

## Authentication architecture

### Why native-only Firebase Auth is not sufficient

The current app reads Firestore through the Firebase JavaScript SDK. A user authenticated only in the native Android Firebase SDK is not automatically authenticated in the JavaScript Firebase Auth instance inside WebView. If those sessions diverge, Firestore rules see an unauthenticated JavaScript client.

### Selected flow

Use `@capacitor-firebase/authentication` at the Capacitor major version selected for the project, configured for Google and Credential Manager. Use its native Google flow to obtain a Google credential while skipping persistent native Firebase auth when required by the plugin integration pattern. Then sign the existing Firebase JavaScript Auth instance in with `GoogleAuthProvider.credential(...)` and `signInWithCredential(...)`.

```text
Android login button
  -> Credential Manager bottom sheet
  -> user selects device Google account
  -> plugin returns Google ID token and optional access token
  -> React native auth adapter creates Firebase JS credential
  -> Firebase JS signInWithCredential
  -> existing onAuthStateChanged in App.jsx fires
  -> existing user document and notification listeners start
  -> authService preserves current profile creation/update behavior
  -> router enters dashboard or pending invite
```

Security requirements:

- Validate that an ID token exists before credential exchange.
- Never send the Google token to PayMatrix servers unless a server flow is explicitly designed.
- Never store Google ID or access tokens in Redux, localStorage, Firestore, or logs.
- Preserve the existing user document fields and first-login behavior.
- Preserve `pendingInviteCode` behavior in `useAuth.js` and `JoinGroup.jsx`.
- Handle account chooser cancellation as a neutral user action, not a security error.
- On sign-out, clear Firebase JS Auth, notification registration for that installation, and Credential Manager state as supported.

### Android login UI

The Android route stays `/login`, but the view is not the current desktop-oriented two-column web composition.

Android login requirements:

- Edge-to-edge, single-column layout sized for phones.
- Brand, concise value statement, one persistent "Continue with Google" button, privacy/support links, and progress/error state.
- The button launches native Credential Manager; the account chooser itself remains system UI.
- No browser popup wording, onboarding-preview marketing controls, or desktop feature-card grid in the first viewport.
- Accessible focus, screen-reader label, 48 dp minimum touch target, and large-font resilience.
- No automatic chooser loop after cancellation. The user can press the persistent button to retry.

## Firebase configuration architecture

Use the existing Firebase project so web and Android users share UIDs and data.

Required Android registration:

- Final package ID.
- Debug signing SHA-1 and SHA-256.
- Upload key SHA-1 and SHA-256.
- Play App Signing SHA-1 and SHA-256 after Play creates the signing certificate.
- Updated `google-services.json` in the native app module.

`google-services.json` is configuration, not a private server secret, but it must still be reviewed, belong to the correct project and package, and never be substituted by a developer's unrelated Firebase project in release.

## Navigation and back architecture

### Router history

Continue using React Router's `BrowserRouter`. Capacitor's default Android scheme is HTTPS, which supports path-based routing. Do not change to hash routing unless a verified WebView routing defect forces it.

### Back coordinator

Create one React-level back coordinator mounted near `App`. It owns a stack of dismissible UI handlers and route fallback rules.

Back algorithm:

```text
on Android back commit:
  if a registered transient surface can dismiss:
    dismiss only the top surface
  else if focused form has unsaved changes:
    show the existing confirmation policy
  else if router has a valid in-app prior entry:
    navigate(-1)
  else if current route is not its section root:
    navigate to the section root with replace
  else:
    release back to Android task behavior or minimize at root
```

Implementation constraints:

- System back button and edge-back gesture use the same Android callback path.
- Do not implement a second custom edge-swipe recognizer in JavaScript.
- Listening to Capacitor `backButton` replaces default behavior, so the handler must explicitly cover route back and root behavior.
- Use AndroidX back dispatch in any custom `MainActivity` work. Do not intercept `KEYCODE_BACK` directly.
- Full predictive in-WebView progress animation is not required for the first production release. Correct committed navigation and normal back-to-home predictive behavior are required.
- At task root, prefer normal Android back-to-home behavior. `exitApp()` is a last resort, not a general navigation tool.

### Transient UI registration

`Modal`, bill scanner, sidebar, menus, and future bottom sheets should register when open and unregister when closed. State must not be inferred by querying arbitrary DOM classes.

### Deep-link back behavior

- If the app was already open, push the linked route on current history.
- If cold-started from a group or friend link, create a synthetic authenticated parent route before the destination, or define dashboard as the deterministic back destination.
- `/join/:code` must preserve `pendingInviteCode` when authentication is required.
- Invalid or unauthorized links route to a stable error state, never a blank WebView.

## App Links architecture

Use verified Android App Links for the canonical HTTPS domain. Keep the package custom scheme only for controlled internal callbacks if needed.

Components:

- Android intent filters for approved hosts and paths.
- `https://<domain>/.well-known/assetlinks.json` containing the final package and Play signing certificate fingerprint.
- Capacitor App `appUrlOpen` listener.
- A strict URL parser mapping allowed paths to React Router routes.
- Rejection of unknown schemes, hosts, and privileged admin paths.

Initial route allowlist:

- `/join/:code`
- `/groups/:id`
- `/friends`
- `/friends/:id`
- `/activity`
- `/dashboard`

## PWA isolation

Android mode must not:

- Register `frontend/public/sw.js`.
- Show `InstallPrompt`.
- Show `PwaUpdatePrompt`.
- Request web notification permission.
- Use VAPID tokens.
- Depend on a service worker SPA fallback.

The native package update mechanism is Play Store versioning. Firebase offline persistence remains useful, but Workbox caching is a web-only concern.

## Push notification architecture

### Client

Use the Capacitor push-notification path or the compatible Firebase Messaging plugin selected with Capacitor 8. The implementation must support Android 13 runtime permission and token refresh.

Recommended Firestore shape:

```text
users/{uid}/devices/{installationId}
  token: string
  platform: "android" | "web"
  enabled: boolean
  appVersion: string
  appBuild: string
  locale: string
  createdAt: server timestamp
  updatedAt: server timestamp
  lastSeenAt: server timestamp
```

`installationId` is a random app-install identifier, not an advertising ID or hardware identifier.

Rules:

- A user may read and write only their own device documents.
- A client may not write another user's token.
- Token values are not copied into analytics or logs.
- Logout deletes or disables only the current installation document.

### Server

`sendPushOnNotification` and `broadcastNotification` in `functions/index.js` should:

1. Read active installation tokens for the target user.
2. During migration, also read legacy `users/{uid}.fcmToken` when present.
3. Deduplicate tokens.
4. Send multicast in bounded batches.
5. Include generic `notification` and `data` fields.
6. Include web-specific `webpush` options.
7. Include Android-specific priority, icon, color, channel ID, and click routing data.
8. Delete only tokens reported invalid or unregistered.
9. Record aggregate result counts without token values.

### Channels

Create stable channels such as:

- `expenses`: new expenses and group balance changes.
- `settlements`: settlement received or removed.
- `social`: friend requests and accepted requests.
- `general`: administrative or uncategorized notices.

Channel IDs are API and should not be renamed after release. Users control channel importance in Android settings.

## Bill scanning and network architecture

The packaged app's local origin is not the Vercel production origin. The current `fetch('/api/scan-bill')` would resolve against the local Capacitor origin and fail.

Selected production behavior:

- Inject an explicit HTTPS base such as `VITE_SCAN_API_URL` in Android mode.
- Obtain the current Firebase ID token immediately before the request.
- Send `Authorization: Bearer <Firebase ID token>`.
- Verify that token server-side before calling Gemini.
- Apply user-level rate limits server-side.
- Accept the Capacitor request through explicit CORS or move scanning behind a Firebase callable function.
- Keep `GEMINI_API_KEY` server-side only.
- Maintain image compression before upload.
- Set request timeout, cancellation, retry rules, and user-visible offline state.

The existing Vercel endpoint may remain the owner if authentication and CORS are implemented correctly. Moving to a callable function is an architecture decision, not a prerequisite to create the wrapper.

## Camera, files, sharing, and UPI

### Bill scanner

The current HTML inputs with `accept="image/*"` and `capture="environment"` may work in WebView, but production acceptance requires camera and gallery tests across supported Android versions. If behavior is inconsistent, use Capacitor Camera or Android Photo Picker through the platform adapter.

Do not request broad media or storage permission when a system picker can provide scoped access.

### Export and share

Browser `window.open`, object URLs, and anchor downloads are not sufficient as the only Android implementation. Native mode should write to app cache, expose the file through a safe content URI, invoke the Android share sheet or viewer, and clean old temporary files.

### UPI

UPI intents must:

- Use an allowlisted `upi://pay` URI generated from validated values.
- Check whether any handler is installed.
- Open through Android intent handling.
- Return a clear fallback when no UPI app exists.
- Never treat an intent launch result alone as proof of payment.

## Edge-to-edge and system UI

Android should use edge-to-edge layout with explicit safe-area handling.

Requirements:

- Status and navigation bar icon contrast follows the active dark theme.
- CSS uses `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` where content reaches system bars.
- Bottom navigation clears both gesture inset and three-button navigation.
- Focused inputs remain visible above the IME.
- Modal height uses dynamic viewport units where supported.
- Orientation is portrait by default unless a tested tablet experience justifies rotation.
- Touch targets remain at least 48 dp and do not occupy the system back gesture strip.

## Performance architecture

### Display refresh policy

Do not hard-code a 60 Hz cap. Keep hardware acceleration enabled. Let Android choose the active refresh mode by default and measure it. A native preferred refresh-rate hint may be added only if profiling proves the WebView is incorrectly held below the device mode. The operating system can ignore a requested frame rate.

### Main-thread budget

At 120 Hz the JavaScript, style, layout, paint, composite, and native bridge work share an 8.3 ms frame budget. Native bridge calls must not run continuously during scroll or gesture progress.

### Known repo hotspots to profile

- Repeated `backdrop-filter` and large blur layers in `frontend/src/index.css` and multiple pages.
- Broad `transition-all` usage across dashboard, friends, forms, and navigation.
- Framer Motion list entrance animations and layout springs.
- Chart.js rendering in analytics views.
- Large expense forms with many controlled inputs.
- Full Firestore snapshot to Redux update paths.
- `scroll-behavior: smooth` and global `overscroll-behavior` in `frontend/src/index.css`.
- Fixed bottom navigation with backdrop blur.

Optimization order:

1. Measure a release build on hardware.
2. Remove unnecessary rerenders and expensive synchronous work.
3. Animate only `transform` and `opacity` for motion-critical paths.
4. Reduce or remove backdrop blur on moving surfaces.
5. Limit chart animation and render work on small screens.
6. Virtualize only lists proven large enough to need it.
7. Move non-urgent work after interaction or to idle periods.
8. Add a reduced-motion and reduced-effects path based on user preference and measured device capability.

### Performance verification

- Android Macrobenchmark with `StartupTimingMetric` and `FrameTimingMetric`.
- Perfetto system trace for jank root cause.
- Chrome WebView remote inspection in debug builds only.
- Android GPU rendering/profile tools where applicable.
- Firebase Performance Monitoring or equivalent after privacy review.
- Memory soak with route, scanner, and modal cycles.
- Network tests for offline, high latency, packet loss, and backend cold start.

## Security architecture

- HTTPS only; `usesCleartextTraffic="false"` in release.
- No production `server.url` in Capacitor config.
- WebView debugging enabled only for debug variants.
- External navigation allowlist; unknown URLs open in the system browser or are rejected.
- No token or PII logging.
- R8/resource shrinking enabled after plugin compatibility tests.
- Backup policy reviewed so cached financial data and auth state are not unintentionally restored to another device.
- Screens containing sensitive balances may optionally use a privacy-screen policy after product approval.
- App Check with Play Integrity introduced in monitor mode before enforcement.
- Dependency lockfiles and release dependency audit required.
- Firestore rules and callable functions remain the authorization boundary; the APK is never trusted.

## Build variants and environment separation

Recommended variants:

| Variant | Purpose | Backend | Debuggable | Signing |
| --- | --- | --- | --- | --- |
| `debug` | Local development | Firebase emulator or controlled dev project | Yes | Android debug key |
| `staging` | Internal QA | Staging Firebase/API where available | No by default | Staging upload key |
| `release` | Play tracks | Production Firebase/API | No | Protected upload key |

If separate Firebase projects are not available initially, use explicit feature flags and test users. Never point a debuggable build with experimental writes at production without a conscious test plan.

## Release architecture

- APK is the direct-install test artifact.
- AAB is the Play upload artifact.
- Play App Signing holds the app signing key.
- The developer holds a separate upload key, backed up outside Git.
- Every release increments `versionCode`.
- Release CI builds from a tagged commit, verifies assets, runs tests, and signs without printing secrets.
- Internal testing precedes closed testing; closed testing precedes staged production.
- Rollback is a new AAB from last known-good code with a higher `versionCode`.

## Observability

Minimum release signals:

- Crash-free users and sessions.
- Android vitals: crash, ANR, slow startup, slow frames, and excessive wakeups where applicable.
- Auth outcome counts by normalized error code, without email or token.
- Push send success/failure counts by platform.
- Notification open routing failures.
- Bill scan latency and failure category.
- App version adoption.
- Backend callable error rates.

Alerts should identify a release version and feature path. Do not log receipt images, expense descriptions, emails, tokens, invite codes, or full notification bodies.

## Architecture decisions that must not drift silently

- Capacitor major version and all official plugins use one compatible major.
- Native Google auth plugin uses the matching compatible major.
- Package ID is immutable after Play publication.
- Browser Auth and Android Auth converge on Firebase JavaScript Auth.
- PWA service worker is web-only.
- Push tokens are per installation.
- Play production uses AAB and Play App Signing.
- Remote WebView content is forbidden in production.
- High-refresh behavior is measured, not claimed from CSS alone.

## Primary references

- Capacitor documentation: `https://capacitorjs.com/docs`
- Capacitor configuration: `https://capacitorjs.com/docs/config`
- Capacitor App and back handling: `https://capacitorjs.com/docs/apis/app`
- Capacitor Android setup: `https://capacitorjs.com/docs/android`
- Firebase Google sign-in on Android: `https://firebase.google.com/docs/auth/android/google-signin`
- Android Credential Manager Sign in with Google: `https://developer.android.com/identity/sign-in/credential-manager-siwg`
- Firebase Cloud Messaging Android setup: `https://firebase.google.com/docs/cloud-messaging/android/get-started`
- Android predictive back: `https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture`
- Android frame-rate guidance: `https://developer.android.com/media/optimize/performance/frame-rate`
- Android app signing: `https://developer.android.com/studio/publish/app-signing`
- Google Play target API policy: `https://support.google.com/googleplay/android-developer/answer/11926878`
