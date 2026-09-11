import { auth } from '../config/firebase.js';

const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Razorpay request failed.');
  return payload;
};

export const authenticatedPost = async (url, body) => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in before starting checkout.');
  return parseResponse(
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
  );
};

export const authenticatedGet = async (url, { signal } = {}) => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in to continue.');
  return parseResponse(
    await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal,
    })
  );
};

let checkoutPromise;
export const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutPromise) return checkoutPromise;
  checkoutPromise = new Promise((resolve, reject) => {
    const script =
      document.querySelector(`script[src="${CHECKOUT_SCRIPT_URL}"]`) ||
      document.createElement('script');
    const finish = (error) => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        checkoutPromise = null;
        reject(error);
      } else resolve();
    };
    const timer = setTimeout(
      () => finish(new Error('Checkout timed out. Check your connection and try again.')),
      20000
    );
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      finish(window.Razorpay ? null : new Error('Checkout did not load. Try again.'));
    script.onerror = () =>
      finish(new Error('Unable to load Razorpay Checkout. Check your connection and retry.'));
    if (!script.isConnected) document.head.appendChild(script);
  });
  return checkoutPromise;
};

export const createRazorpayOrder = (amount = 100, currency = 'INR') =>
  authenticatedPost('/api/create-order', { amount, currency });

export const verifyRazorpayPayment = (payment, orderToken) =>
  authenticatedPost('/api/verify-payment', { ...payment, order_token: orderToken });
