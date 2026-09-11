import { describe, expect, it } from 'vitest';
import {
  createOrderToken,
  parseOrderInput,
  readOrderToken,
  verifyPaymentSignature,
} from '../../server/razorpay.js';

describe('Razorpay server helpers', () => {
  it('accepts integer paise and rejects sub-minimum orders', () => {
    expect(parseOrderInput({ amount: 100, currency: 'inr' })).toEqual({
      amount: 100,
      currency: 'INR',
    });
    expect(() => parseOrderInput({ amount: 99 })).toThrow(/at least 100 paise/);
    expect(() => parseOrderInput({ amount: 100.5 })).toThrow(/integer/);
  });

  it('round-trips a fresh server order token and rejects tampering or expiry', () => {
    const token = createOrderToken('order_test123', 'secret', 1000);
    expect(readOrderToken(token, 'secret', 2000)).toBe('order_test123');
    expect(readOrderToken(`${token}x`, 'secret', 2000)).toBeNull();
    expect(readOrderToken(token, 'secret', 1000 + 31 * 60 * 1000)).toBeNull();
  });

  it('verifies the checkout signature with constant-time comparison', () => {
    expect(
      verifyPaymentSignature({
        orderId: 'order_test123',
        paymentId: 'pay_test123',
        signature: '8645d0ec07e3574862b139c4524ea5518ba0e49ad552ec84b14c897c727100c6',
        keySecret: 'secret',
      })
    ).toBe(true);
    expect(
      verifyPaymentSignature({
        orderId: 'order_test123',
        paymentId: 'pay_test123',
        signature: 'tampered',
        keySecret: 'secret',
      })
    ).toBe(false);
  });
});
