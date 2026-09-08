# paymatrix Android experience plan

Status: implementation authorized, 2026-09-08. Baseline: release 2.2.2, SHA256 5ba8da235839324d4d3b88634ec76d7f9b101a5c253d36f966586fd4eb26fe58. Local APK matches GitHub. Main started clean at ced5c4e. Native source is intentionally ignored by that commit; preserve that repository decision and ship a sanitized native-source archive with the APK for reproducibility.

Final user refinements: version 2.3.0 / 23000; navbar has no extra bottom gap beyond the Android system inset; item help appears only after tapping How it works and opens a dismissible sheet; expense footer has no enclosing surface/border; empty logs intro is two short sentences. These supersede the initial inline-help direction below.

## Evidence and audit limits

Installed Impeccable native audit and Apple Design references were read; Android conventions take precedence over iOS implementation details. Source audit covers the native Compose routes; it is not proof of physical-device behavior. An existing emulator has a differently signed install; preserve it. Use an isolated AVD and synthetic UI fixtures for authenticated screen QA, and distinguish those from release login verification.

Verified source findings:
- P1: Theme.kt always supplies the dark scheme. Components.kt duplicates fixed dark surfaces; screens hard-code white text. A light colorScheme alone cannot fix this.
- P1: PayMatrixApp.kt floating navigation uses blue-purple 1E1E24/111116 glass over neutral 101010 content. Replace decorative glass with semantic navigation surface, clear selected state and Android tab semantics.
- P1: BalanceEngine.kt itemized mode reallocates the full bill by dish subtotals, silently falling back to equal when all subtotals are zero. UI calls the difference GST/extra without knowing its source. Require explicit, positive subtotals and explain allocation; never describe an unexplained difference as verified tax.
- P2: login and navigation use 9.5–11sp copy; raise essential copy, enlarge small text links' touch areas, and test 200% font scale.
- P2: MainShell is recreated inside each destination; tab selection has color animation but no authored screen transition. Preserve state and use bounded fades for peers, directional motion for detail/steps.
- P2: No local reminder worker or app-widget receiver exists. Existing FCM is a separate remote event channel.

No fabricated numeric health score: TalkBack, frame timing and all authenticated release screens require runtime evidence. Existing positives: native Compose, integer-paise allocation, multiple payers, pending-sync indicators, verified-email gating, QR settlement fallback, and saved tab state.

## Design contract

Audience: friends, roommates and small travel groups recording shared expenses in daylight and evening. Operate mode: understand the balance, add an expense, verify a split, settle with confidence.

Dark: neutral charcoal canvas #191919, surfaces #222222 / #2C2C2C, soft white foreground #F2F0EB, muted #B8B6B0. Light: reference-inspired warm ivory #F5F2E9, near-white surfaces #FFFDF7, ink #191A18, secondary #62635D. Values are proposed tokens subject to rendered contrast verification. Navigation uses the same surface family; system-bar icons follow actual theme. System / Light / Dark preference persists. Keep lowercase paymatrix, logo.png, package and signing identity.

Use readable Android typography, 48dp actions, 16–24dp page gutters, restrained 12–20dp corner shapes, semantic success/error colors with textual labels. Borrow spacing and hierarchy from the supplied Rodeo/Mobbin screenshot, not its imagery, iOS chrome or attribution strip.

## Screen-by-screen scope

| Screen / flow | Change and verification |
|---|---|
| Launch, sign-in, register, verify email, reset password | Theme-aware background and fields, clear primary action, readable legal links, keyboard and retry states; preserve auth behavior. |
| Home | Readable balances and next action, recent groups/activity; one clear Add expense path; visible cached/pending status. |
| Groups / create / edit / join / members | Consistent rows, empty state with next step, readable member controls, safe invite and admin states. |
| Group detail: overview / expenses / members / activity / insights | Unified surfaces and tabs, stable scrolling, expense edit/delete recovery, explicit payer and participant shares. |
| Add / edit expense | Keep amount → paid by → split flow. Default simple equal split; optional Items & charges, example and per-person receipt review. Preserve dates, multi-payer validation and drafts during steps. |
| Receipt scan and review | Theme camera/gallery/loading/error states; scanned values are editable suggestions; manual entry remains available. |
| Friends / requests / detail | Distinguish pending request from friend, clear empty/error states, consistent balance wording. |
| Settle / QR / pending confirmation | Readable amount and recipient; retain literal black-on-white QR and explicit confirmation. A UPI return never confirms money moved. |
| Activity / notifications | Separate ledger events from on-device reminders; clear read status, no repeated prompts. |
| Logs / entries / sharing | Theme forms and lists without changing personal-versus-shared financial meaning. |
| Analytics | Accessible labels, no color-only meaning, honest empty data. |
| Profile / appearance / reminders / widgets | Discoverable appearance choice, local reminder controls and widget setup with privacy defaults. |
| Terms / privacy / export / delete account | Readable long text, safe actions, unchanged legal meaning and export behavior. |
| All sheets, dialogs and transient states | Both themes, large text, keyboard, loading, failure, empty, offline and account changes. |

## Items & charges: practical scope

Support groceries, travel bookings, household purchases and meals with person subtotals, not dish-specific wording. Users enter the final bill and each person's pre-charge subtotal; show subtotal, added charges or discount, and final allocated shares. This release retains the compatible itemized wire format. Do not invent item-level tax rates or imply legal GST calculation. Explain that a mixed-rate invoice needs exact shares calculated from that invoice; a full item/tax/beneficiary ledger is a later schema change requiring web, rules and migration tests.

Worked example: items ₹600 + ₹400, receipt tax/charges ₹50, final ₹1,050 → ₹630 and ₹420. Show “₹600 items + ₹30 allocated charges”. For ₹100 discount on ₹1,000 items, shares become ₹540 and ₹360. Included tax must not be added again. Zero subtotals and negative amounts are blocked; final allocations sum exactly to bill paise. Save and reopen preserve item subtotals. Explicit line-item tax/delivery/tip controls should follow in a compatible extension if they can be validated across clients; no speculative backend mutation in a visual release.

## Navigation and motion

Keep five existing destinations to avoid losing logs/profile. Use a solid themed navigation surface and labeled selectable tabs. Peer navigation uses ~180ms fades; detail/step motion may use a small directional transition, never a whole-screen carousel for unrelated tabs. Repeated tab taps do nothing; preserve saved state. Honor system disabled animation; measure release frames rather than assuming requesting 120Hz prevents jank.

## Local reminders and widget

Implement device-only, opt-in reminders using persisted local snapshots/settings and WorkManager. No network constraint or FCM dependency. Notify only on an actionable local draft or user-enabled weekly review; rate-limit, respect quiet hours, offer snooze/disable, cancel on sign-out, and avoid private amounts on the lock screen. Locally cached shared balances can be stale: reminders invite review, never assert another person's current debt. WorkManager timing is approximate and OS-controlled; force-stop prevents normal background execution until reopening.

Widget: compact quick-open / add-expense widget, optional locally cached balance with timestamp and privacy setting. Start with privacy-safe shortcuts and a clear signed-out state. Open the app before mutations; never settle from a widget. Match light/dark appearance, handle resizing, reinstall/update and account changes. Native RemoteViews is acceptable for this small widget; Glance is the preferred path when adding richer layouts.

## Useful references and skills

- Official Android agent skills: https://github.com/android/skills — prefer focused Compose/accessibility/edge-to-edge guidance to installing many overlapping community packs. Researched, not automatically installed.
- Compose animation: https://developer.android.com/develop/ui/compose/animation/quick-guide
- Widgets/Glance: https://developer.android.com/develop/ui/compose/glance
- WorkManager scheduling: https://developer.android.com/reference/androidx/work/PeriodicWorkRequest — minimum periodic interval 15 minutes, execution can be delayed by Doze.
- Notifications: https://developer.android.com/develop/ui/compose/notifications
- Mobbin: https://mobbin.com — public pattern catalog checked; no claim to have reviewed gated Splitwise flows. Supplied screenshot is the specific visual reference.

## Delivery and acceptance

1. Save baseline and plan; implement shared theme first, then migrate screen colors and navigation.
2. Implement clear proportional item splitting, on-device settings/reminders and widget; preserve backend compatibility.
3. Run meaningful allocation/reminder tests, build and lint, then one batched visual pass of synthetic screens in both themes and key sizes. Fix findings and confirm once.
4. Verify signed release APK metadata, certificate matches 2.2.2, checksum and clean upgrade on isolated emulator. Test launch and permission denial. Report authenticated/physical-device gaps explicitly.
5. Publish a new versioned GitHub release with APK, checksum, sanitized native source, changelog and QA evidence. Never overwrite 2.2.2. Source archive excludes credentials, local paths, google-services configuration, signing material and build/cache files; document prerequisites.

Competitive success means lower effort: target an ordinary split under 30 seconds in usability tests, an understandable breakdown without explanation, reliable offline recovery, and no repeated reminders. These are targets, not measured claims of superiority to Splitwise. Encourage return through usefulness and trust rather than debt streaks or pressure notifications.
