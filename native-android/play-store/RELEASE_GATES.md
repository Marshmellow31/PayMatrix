# Google Play release gates

The signed AAB and Play Console state must satisfy every item before production rollout.

## Account gates

- [ ] Confirm whether the developer account is Personal or Organization.
- [ ] If it is a Personal account created after 13 November 2023, complete the required closed test with at least 12 opted-in testers for 14 continuous days.
- [ ] Confirm the highest versionCode already uploaded for `com.paymatrix.app`; it must be lower than `21000`.
- [ ] Enroll in Play App Signing and securely archive the upload key.
- [ ] If Google classifies the product as a financial-service provider, use an eligible Organization account and complete the applicable verification.

## Firebase/App Check gates

- [ ] Confirm Spark or Blaze billing plan in Firebase Console; do not infer it from the CLI.
- [ ] Register both upload-key and Play App Signing SHA-256 certificates in Firebase Authentication and App Check.
- [ ] Link the Play Integrity API to Firebase project `paymatrix-174b5`.
- [ ] Test App Check metrics before enabling enforcement.
- [ ] Configure budget alerts before moving to Blaze.

## Artifact and quality gates

- [ ] Build signed APK and AAB from the same commit.
- [ ] Verify package, version, certificates, R8 mapping, 16 KB alignment, and SHA-256 checksums.
- [ ] Run unit, Firestore authorization, lint, bundle, upgrade-install, airplane-mode, and cold-start tests.
- [ ] Complete Google sign-in, avatar, camera, notification, UPI, deep-link, high-refresh, large-font, and TalkBack checks on physical devices.
- [ ] Upload to Internal testing and review the automated pre-launch report.
- [ ] Keep crash and ANR health below Google Play's bad-behavior thresholds before broad rollout.

## Store content gates

- [x] Valid 512×512 PNG icon generated from the canonical `logo.png`.
- [x] 1024×500 feature graphic generated and visually checked.
- [ ] Capture at least four final phone screenshots from the release build.
- [x] App name, short description, full description, Data Safety worksheet, and App content worksheet prepared.
- [ ] Add a confidential reviewer account in Play Console.
- [ ] Read back every declaration from Play Console after saving.
