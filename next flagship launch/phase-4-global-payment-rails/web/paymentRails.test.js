import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateEpcPayload } from './epcQrGenerator.js';
import { generatePixPayload, computeCrc16 } from './pixQrGenerator.js';
import { dispatchPaymentRail } from './paymentRailDispatcher.js';

describe('Global Payment Rails Generator Suite', () => {
  test('generates valid EPC SEPA QR payload conforming to BCD 002 SCT standard', () => {
    const payload = generateEpcPayload({
      name: 'Anna Schmidt',
      iban: 'DE89 3704 0044 0532 0130 00',
      amount: 42.50,
      remittance: 'Berlin Hostel Split'
    });

    const lines = payload.split('\n');
    assert.equal(lines[0], 'BCD');
    assert.equal(lines[1], '002');
    assert.equal(lines[2], '1');
    assert.equal(lines[3], 'SCT');
    assert.equal(lines[5], 'Anna Schmidt');
    assert.equal(lines[6], 'DE89370400440532013000'); // Stripped whitespace
    assert.equal(lines[7], 'EUR42.50');
    assert.equal(lines[10], 'Berlin Hostel Split');
  });

  test('generates valid Pix EMVCo BR Code with correct TLV structure and CRC16', () => {
    const payload = generatePixPayload({
      pixKey: 'harshil@example.com',
      name: 'Harshil Patel',
      amount: 25.00
    });

    assert.ok(payload.startsWith('000201')); // Format 01
    assert.ok(payload.includes('br.gov.bcb.pix'));
    assert.ok(payload.includes('harshil@example.com'));
    assert.ok(payload.includes('540525.00')); // Amount field 54, len 05, value 25.00
    assert.ok(payload.includes('5802BR')); // Country BR
    assert.ok(payload.includes('6304')); // CRC tag prefix

    // Verify CRC16 algorithm itself
    const sampleStr = payload.slice(0, -4);
    const expectedCrc = payload.slice(-4);
    assert.equal(computeCrc16(sampleStr), expectedCrc);
  });

  test('dispatches UPI rail correctly', () => {
    const result = dispatchPaymentRail({
      railType: 'UPI',
      recipient: { vpa: 'rohan@okhdfcbank', name: 'Rohan Sharma' },
      amount: 450.00
    });

    assert.equal(result.rail, 'UPI');
    assert.equal(result.type, 'INTENT_AND_QR');
    assert.ok(result.actionUri.startsWith('upi://pay?pa=rohan%40okhdfcbank'));
    assert.ok(result.actionUri.includes('am=450.00'));
  });

  test('dispatches PayPal rail correctly', () => {
    const result = dispatchPaymentRail({
      railType: 'PAYPAL',
      recipient: { paypalHandle: 'alexsmith' },
      amount: 30.00,
      currency: 'USD'
    });

    assert.equal(result.rail, 'PAYPAL');
    assert.equal(result.actionUri, 'https://paypal.me/alexsmith/30.00USD');
  });

  test('dispatches Cash settlement correctly', () => {
    const result = dispatchPaymentRail({
      railType: 'CASH',
      amount: 50.00,
      currency: 'EUR'
    });

    assert.equal(result.rail, 'CASH');
    assert.equal(result.type, 'MANUAL_CONFIRM');
    assert.equal(result.actionUri, null);
  });
});
