# Phase 4: European Payments Council (EPC) SEPA QR Specification

> **Standard:** EPC069-12 SEPA Credit Transfer QR Code  
> **Use Case:** Enabling European banking apps (Sparkasse, ING, BNP, Revolut, etc.) to scan and pre-fill instant bank transfers directly from PayMatrix

---

## 1. Payload Format Structure

An EPC QR code contains a strict newline-separated (`\n` or `\r\n`) text payload conforming to the following fields:

```
BCD
002
1
SCT
{BIC}
{Recipient Name}
{IBAN}
EUR{Amount in 2 decimals}
{Purpose Code}
{Structured Reference}
{Unstructured Remittance Info}
```

### Field Definitions:
1. `BCD`: Service Tag (Constant: Business Card Data).
2. `002`: Version (Version 2).
3. `1`: Character Set (1 = UTF-8).
4. `SCT`: Identification (SEPA Credit Transfer).
5. `BIC`: Receiver Bank BIC/SWIFT code (Optional, can be blank).
6. `Recipient Name`: Beneficiary Name (Max 70 chars).
7. `IBAN`: International Bank Account Number (Max 34 chars, whitespace stripped).
8. `Amount`: Must begin with `EUR` followed by standard decimal (e.g. `EUR14.50`). Max `EUR999999999.99`.
9. `Purpose Code`: Optional 4-letter SEPA purpose code (e.g. `CHAR` for shared expense).
10. `Structured Reference`: Optional RF Creditor Reference (ISO 11649).
11. `Unstructured Remittance`: Text message displayed on bank statement (e.g. `paymatrix - Berlin trip`).

---

## 2. JavaScript / TypeScript Payload Generator

```javascript
// frontend/src/utils/epcQrGenerator.js
export const generateEpcPayload = ({
  name,
  iban,
  amount,
  bic = '',
  remittance = 'paymatrix settlement',
}) => {
  if (!iban) throw new Error('IBAN is required for European bank transfers.');
  const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
  const cleanName = (name || 'PayMatrix Member').trim().slice(0, 70);
  const formattedAmount = `EUR${Number(amount).toFixed(2)}`;
  const cleanRemittance = remittance.trim().slice(0, 140);

  // Strict 12-line EPC string
  return [
    'BCD',
    '002',
    '1',
    'SCT',
    bic.trim().toUpperCase(),
    cleanName,
    cleanIban,
    formattedAmount,
    '', // Purpose code
    '', // Structured reference
    cleanRemittance,
    '', // Beneficiary to originator info
  ].join('\n');
};
```
