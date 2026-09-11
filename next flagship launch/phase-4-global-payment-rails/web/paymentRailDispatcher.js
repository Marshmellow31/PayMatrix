/**
 * paymentRailDispatcher.js
 * Unified cross-border payment dispatcher for PayMatrix v3
 * Detects recipient payment handles and produces appropriate QR payload or deep link intent
 */
import { generateEpcPayload } from './epcQrGenerator.js';
import { generatePixPayload } from './pixQrGenerator.js';

export const dispatchPaymentRail = ({
  railType = 'UPI', // 'UPI' | 'EPC' | 'PIX' | 'PAYPAL' | 'VENMO' | 'CASHAPP' | 'CASH'
  recipient = {},
  amount = 0,
  currency = 'USD',
  note = 'paymatrix split'
}) => {
  const numericAmount = Number(amount) || 0;

  switch (railType.toUpperCase()) {
    case 'UPI': {
      const vpa = recipient.vpa || recipient.upiId || '';
      const name = recipient.name || 'PayMatrix Member';
      const uri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${numericAmount.toFixed(2)}&cu=INR`;
      return {
        rail: 'UPI',
        type: 'INTENT_AND_QR',
        actionUri: uri,
        qrData: uri,
        copyText: vpa,
        label: 'Pay via UPI App',
        currency: 'INR'
      };
    }

    case 'EPC': {
      const payload = generateEpcPayload({
        name: recipient.name,
        iban: recipient.iban,
        amount: numericAmount,
        bic: recipient.bic,
        remittance: note
      });
      return {
        rail: 'EPC',
        type: 'QR_AND_COPY',
        actionUri: null,
        qrData: payload,
        copyText: (recipient.iban || '').replace(/\s+/g, ''),
        label: 'Scan in European Banking App',
        currency: 'EUR'
      };
    }

    case 'PIX': {
      const pixKey = recipient.pixKey || recipient.chavePix || '';
      const payload = generatePixPayload({
        pixKey,
        name: recipient.name,
        amount: numericAmount
      });
      return {
        rail: 'PIX',
        type: 'QR_AND_COPY',
        actionUri: null,
        qrData: payload,
        copyText: pixKey,
        label: 'Scan via Pix App',
        currency: 'BRL'
      };
    }

    case 'PAYPAL': {
      const handle = (recipient.paypalHandle || '').replace(/^@/, '');
      const url = `https://paypal.me/${encodeURIComponent(handle)}/${numericAmount.toFixed(2)}${currency}`;
      return {
        rail: 'PAYPAL',
        type: 'WEB_LINK',
        actionUri: url,
        qrData: url,
        copyText: handle,
        label: 'Open PayPal.me',
        currency
      };
    }

    case 'VENMO': {
      const handle = (recipient.venmoHandle || '').replace(/^@/, '');
      const intentUri = `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(handle)}&amount=${numericAmount.toFixed(2)}&note=${encodeURIComponent(note)}`;
      const webFallback = `https://venmo.com/${encodeURIComponent(handle)}`;
      return {
        rail: 'VENMO',
        type: 'APP_LINK',
        actionUri: intentUri,
        fallbackUri: webFallback,
        qrData: webFallback,
        copyText: handle,
        label: 'Open Venmo',
        currency: 'USD'
      };
    }

    case 'CASH': {
      return {
        rail: 'CASH',
        type: 'MANUAL_CONFIRM',
        actionUri: null,
        qrData: null,
        copyText: null,
        label: 'Record Physical Cash Handover',
        currency
      };
    }

    default:
      throw new Error(`Unsupported payment rail: ${railType}`);
  }
};

export default dispatchPaymentRail;
