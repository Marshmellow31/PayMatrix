import { authenticatedPost, loadRazorpayCheckout } from './razorpayService.js';

export const startRazorpaySubscription = async ({
  cycle,
  country = 'IN',
  currency = 'INR',
  user,
  onDismiss,
  onSuccess,
  onFailure,
  onVerifying,
}) => {
  await loadRazorpayCheckout();
  const data = await authenticatedPost('/api/create-subscription', { cycle, country, currency });
  const checkout = new window.Razorpay({
    key: data.key_id,
    subscription_id: data.subscription_id,
    name: 'paymatrix',
    description: `paymatrix Pro · ${cycle}`,
    image: `${window.location.origin}/logo.png`,
    prefill: { name: user?.name || '', email: user?.email || '' },
    theme: { color: '#8b5cf6' },
    modal: {
      ondismiss: () => {
        onDismiss?.();
      },
      escape: true,
    },
    handler: async (payment) => {
      onVerifying?.();
      try {
        const result = await authenticatedPost('/api/verify-subscription', payment);
        onSuccess?.(result);
      } catch (err) {
        onFailure?.({ error: { description: err.message || 'Payment verification failed.' } });
      }
    },
  });
  checkout.on('payment.failed', (err) => {
    checkout.close();
    onFailure?.(err);
  });
  checkout.open();
  return data.subscription_id;
};
