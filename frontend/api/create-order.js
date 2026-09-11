import Razorpay from 'razorpay';
import { verifyFirebaseUser } from '../server/firebaseAuth.js';
import {
  createOrderToken,
  createReceipt,
  parseOrderInput,
  requireRazorpayConfig,
} from '../server/razorpay.js';
import { requireServerFeature } from '../server/runtimeFlags.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });

  try {
    requireServerFeature('RAZORPAY_TEST_CHECKOUT_ENABLED');
  } catch (error) {
    return response.status(error.statusCode).json({ code: error.code, error: error.message });
  }

  let user;
  try {
    user = await verifyFirebaseUser(request);
  } catch (error) {
    console.error('[razorpay:create-order] authentication unavailable:', error.message);
    return response.status(503).json({ error: 'Authentication service is unavailable.' });
  }
  if (!user) return response.status(401).json({ error: 'Authentication required.' });

  let input;
  let config;
  try {
    input = parseOrderInput(request.body);
    config = requireRazorpayConfig();
  } catch (error) {
    const status = error instanceof TypeError ? 400 : 500;
    return response.status(status).json({ error: error.message });
  }

  try {
    const razorpay = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
    const order = await razorpay.orders.create({
      amount: input.amount,
      currency: input.currency,
      receipt: createReceipt(user.localId),
      notes: { purpose: 'paymatrix_standard_checkout_test' },
    });

    return response.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: config.keyId,
      order_token: createOrderToken(order.id, config.keySecret),
    });
  } catch (error) {
    const providerStatus = Number(error?.statusCode || error?.status);
    console.error('[razorpay:create-order] provider request failed:', providerStatus || 'unknown');
    if (providerStatus === 401) {
      return response.status(401).json({ error: 'Razorpay credentials were rejected.' });
    }
    return response.status(500).json({ error: 'Unable to create the Razorpay order.' });
  }
}
