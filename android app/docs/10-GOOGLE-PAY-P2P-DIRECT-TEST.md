# Google Pay Direct Intent P2P Test

## Official Google Pay in-app workflow

Google Pay India supports UPI in-app payments by handing a `upi://pay` URI to
Google Pay on Android. The documented merchant flow is:

1. Build a UPI URI with payee address, payee name, merchant code, transaction
   reference, transaction note, amount, currency, and optional transaction URL.
2. Launch Google Pay with `Intent.ACTION_VIEW` and package
   `com.google.android.apps.nbu.paisa.user`.
3. Google Pay shows the payment screen.
4. If Google Pay returns submitted or succeeded, the merchant app must still
   verify the payment with its PSP/payment aggregator before treating the order
   as paid.
5. NPCI also requires merchant apps to support the generic UPI intent path, not
   only the Google Pay package-specific path.

Official source checked on August 21, 2026:
https://developers.google.com/pay/india/api/android/in-app-payments

## What PayMatrix is testing

PayMatrix settle-up is P2P: one group member pays another member's personal UPI
ID. That is not the same as Google Pay's documented merchant-receipt flow because
PayMatrix does not have a merchant VPA, merchant code, PSP verification callback,
or payment aggregator status check.

The app now includes a debug-only native Android experiment beside the existing
QR path:

- `Pay via UPI` keeps the current QR flow.
- `Test GPay Direct` launches Google Pay directly using the receiver's personal
  UPI ID, settlement amount, transaction note, and a generated transaction ref.

This experiment should answer whether Google Pay accepts, warns, blocks, or
cancels a personal-VPA direct intent from PayMatrix. It must not be used as proof
that money was transferred.

## Physical phone test checklist

Use a signed-in Android phone with Google Pay installed and a working bank
account.

1. Install the debug APK.
2. Sign in to PayMatrix.
3. Ensure the receiver profile has a valid personal UPI ID.
4. Open a group where the signed-in user owes that receiver money.
5. Open settle-up.
6. Tap `Test GPay Direct`.
7. Record which result happens:
   - Google Pay opens with correct payee and amount.
   - Google Pay shows scam/risk/policy warning.
   - Google Pay blocks the payment before UPI PIN.
   - Google Pay lets the payment submit.
   - Google Pay returns to PayMatrix with cancel/failure.
8. Verify any submitted payment inside Google Pay/bank history before tapping
   `Mark Paid` in PayMatrix.

## Expected decision

If Google Pay blocks or warns on personal UPI IDs, keep QR as the production
path. If it submits successfully, PayMatrix still needs a verification strategy
before any automatic settlement marking can be considered.
