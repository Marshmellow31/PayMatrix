/* eslint-env node */

import crypto from 'node:crypto';

const ORDER_TOKEN_TTL_MS = 30 * 60 * 1000;

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left), 'utf8');
  const rightBuffer = Buffer.from(String(right), 'utf8');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const hmac = (value, secret) =>
  crypto.createHmac('sha256', secret).update(value).digest('hex');

export const requireRazorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Razorpay is not configured.');
  return { keyId, keySecret };
};

export const parseOrderInput = (body = {}) => {
  const amount = Number(body.amount);
  const currency = String(body.currency || 'INR').trim().toUpperCase();

  if (!Number.isSafeInteger(amount) || amount < 100) {
    throw new TypeError('Amount must be an integer of at least 100 paise.');
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new TypeError('Currency must be a three-letter ISO code.');
  }
  return { amount, currency };
};

export const createReceipt = (uid) => {
  const safeUid = String(uid).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
  return `pm_test_${safeUid}_${Date.now()}`.slice(0, 40);
};

export const createOrderToken = (orderId, keySecret, issuedAt = Date.now()) => {
  const payload = `${orderId}.${issuedAt}`;
  return `${payload}.${hmac(payload, keySecret)}`;
};

export const readOrderToken = (token, keySecret, now = Date.now()) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [orderId, issuedAtRaw, signature] = parts;
  const issuedAt = Number(issuedAtRaw);
  const payload = `${orderId}.${issuedAtRaw}`;
  const validAge = Number.isSafeInteger(issuedAt) && now >= issuedAt && now - issuedAt <= ORDER_TOKEN_TTL_MS;
  if (!orderId.startsWith('order_') || !validAge || !safeEqual(hmac(payload, keySecret), signature)) {
    return null;
  }
  return orderId;
};

export const verifyPaymentSignature = ({ orderId, paymentId, signature, keySecret }) => {
  if (![orderId, paymentId, signature].every((value) => typeof value === 'string' && value.length > 0)) {
    return false;
  }
  return safeEqual(hmac(`${orderId}|${paymentId}`, keySecret), signature);
};
