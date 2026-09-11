# Phase 4: Pix (Brazil) & Global Deep Links Implementation

> **Protocols:** Brazil Pix EMVCo TLV Format, PayPal.me URL, Venmo URI Scheme, Cash App URL  
> **Platform Parity:** Web PWA & Native Android APK

---

## 1. Unified Payment Rail Dispatcher

```javascript
// frontend/src/utils/paymentRailDispatcher.js
export const getSettlementAction = ({
  paymentMethod, // 'UPI' | 'EPC' | 'PIX' | 'PAYPAL' | 'VENMO' | 'CASHAPP' | 'CASH'
  recipientData,
  amount,
  currency = 'USD',
  note = 'paymatrix settlement'
}) => {
  switch (paymentMethod) {
    case 'UPI':
      return {
        type: 'QR_AND_INTENT',
        intentUri: `upi://pay?pa=${encodeURIComponent(recipientData.vpa)}&pn=${encodeURIComponent(recipientData.name)}&am=${amount.toFixed(2)}&cu=INR`,
        qrPayload: `upi://pay?pa=${encodeURIComponent(recipientData.vpa)}&pn=${encodeURIComponent(recipientData.name)}&am=${amount.toFixed(2)}&cu=INR`,
        label: 'Pay via UPI App',
      };

    case 'EPC':
      return {
        type: 'QR_AND_COPY',
        qrPayload: generateEpcPayload({
          name: recipientData.name,
          iban: recipientData.iban,
          amount,
          remittance: note,
        }),
        copyValue: recipientData.iban,
        label: 'Scan in European Banking App',
      };

    case 'PAYPAL':
      return {
        type: 'EXTERNAL_LINK',
        url: `https://paypal.me/${encodeURIComponent(recipientData.handle)}/${amount.toFixed(2)}${currency}`,
        label: 'Open PayPal.me',
      };

    case 'VENMO':
      return {
        type: 'EXTERNAL_LINK',
        url: `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(recipientData.handle)}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`,
        fallbackUrl: `https://venmo.com/${encodeURIComponent(recipientData.handle)}`,
        label: 'Open Venmo',
      };

    case 'CASH':
      return {
        type: 'MANUAL_CONFIRM',
        label: 'Record Physical Cash Payment',
      };

    default:
      return null;
  }
};
```
