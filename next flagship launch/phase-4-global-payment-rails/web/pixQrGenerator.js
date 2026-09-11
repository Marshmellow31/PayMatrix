/**
 * pixQrGenerator.js
 * Generates Brazil Central Bank Pix EMVCo BR Code Standard payload
 * Computes Type-Length-Value (TLV) strings and CRC16-CCITT polynomial checksum
 */

// Format single TLV element
const formatTlv = (id, value) => {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
};

// CRC16-CCITT (0x1021) with initial 0xFFFF
export const computeCrc16 = (str) => {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

export const generatePixPayload = ({
  pixKey,
  name,
  city = 'SAO PAULO',
  amount,
  txId = '***'
}) => {
  if (!pixKey) throw new Error('Pix key is required.');

  const cleanName = (name || 'PAYMATRIX').trim().slice(0, 25).toUpperCase();
  const cleanCity = city.trim().slice(0, 15).toUpperCase();

  // Field 26: Merchant Account Info (GUI + Pix Key)
  const gui = formatTlv('00', 'br.gov.bcb.pix');
  const key = formatTlv('01', pixKey.trim());
  const merchantAccountInfo = formatTlv('26', `${gui}${key}`);

  // Field 54: Amount
  const amountStr = Number(amount).toFixed(2);
  const amountTlv = formatTlv('54', amountStr);

  // Field 62: Additional Data Field (TxID)
  const txIdTlv = formatTlv('62', formatTlv('05', txId));

  let payloadWithoutCrc =
    formatTlv('00', '01') +             // Payload Format Indicator
    formatTlv('01', '12') +             // Point of Initiation (12 = Dynamic/Static with Amount)
    merchantAccountInfo +               // Pix Account Info
    formatTlv('52', '0000') +           // Merchant Category Code
    formatTlv('53', '986') +            // Transaction Currency (986 = BRL)
    amountTlv +                         // Transaction Amount
    formatTlv('58', 'BR') +             // Country Code
    formatTlv('59', cleanName) +        // Merchant Name
    formatTlv('60', cleanCity) +        // Merchant City
    txIdTlv +                           // TxID
    '6304';                             // CRC16 Tag and Length prefix

  const crc = computeCrc16(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
};

export default generatePixPayload;
