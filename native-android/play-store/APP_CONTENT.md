# Google Play App content declarations

## Ads

No. paymatrix contains no advertising SDK or paid placement.

## App access

The app supports Firebase Authentication via email & password and Google Sign-in. Reviewers can sign in directly using the pre-verified email/password test credentials provided in Play Console (no inbox access needed) or tap "Continue with Google".

Suggested reviewer path:

1. Open paymatrix on the sign-in screen.
2. Sign in with the provided reviewer email & password (or select **Continue with Google**).
3. Open **Goa weekend** to inspect expenses, members, Activity, and Insights.
4. Test the bill scanner with any sample receipt.
5. Use **Add expense** or inspect settlements (settle-up generates a UPI QR for scanning in banking apps; do not execute real bank payments during review).
6. Open **Spending logs** and inspect immutable Activity events.
7. Open **Profile → Security & privacy** and inspect account settings.

## Target audience

Adults and older teens managing shared expenses. The product is not designed for children. Choose only the age groups supported by the final Play Console questionnaire and privacy policy.

## Content rating

Complete the IARC questionnaire truthfully: no violence, sexual content, gambling, controlled substances, or user-to-user public social content. Users collaborate only in authenticated private groups.

## Financial features declaration

Declare the expense-splitting and financial-recordkeeping functionality. Explain:

> paymatrix is a shared-expense ledger. It is not a bank, wallet, lender, investment product, remittance provider, or payment processor. It can open an installed UPI app using a user-selected payment intent, but it does not verify that funds moved. A settlement enters the shared ledger only after explicit user confirmation.

Do not select a money-transfer-provider category unless Google Play determines that the intent-launching feature falls into that category. If Play makes that determination, stop the release and complete the organization-account and financial-policy requirements before production.

## Permissions

- Camera: requested only when the user taps **Open camera** in Receipt scanner.
- Notifications: requested only when the user enables notifications from Profile.
- Internet/network state: Firebase synchronization, sign-in, receipt extraction, and sync-state UI.
- Vibration: system feedback/notification behavior.
- Biometrics/fingerprint: contributed by Android's Google credential provider; paymatrix does not read or store biometric data.
- Wake lock: contributed by Firebase Messaging for reliable system-managed notification delivery.

No SMS, call log, contacts, background location, storage, accessibility, VPN, or broad package-query permission is requested.

## External URLs

- Privacy: https://pay-matrix.vercel.app/privacy
- Account deletion: https://pay-matrix.vercel.app/delete-account
- Support: https://github.com/Marshmellow31/PayMatrix/issues
