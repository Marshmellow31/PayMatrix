/**
 * epcQrGenerator.js
 * Generates official European Payments Council (EPC) Quick Response Code Guidelines (EPC069-12)
 * for SEPA Credit Transfers (SCT) accepted by all modern European banking apps
 */

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

export default generateEpcPayload;
