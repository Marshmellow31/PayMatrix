/* eslint-env node */
import crypto from 'crypto';
import { upsertRazorpayEntitlement } from '../server/subscriptionEntitlement.js';
import { requireServerFeature } from '../server/runtimeFlags.js';

export const config = { api: { bodyParser: false } };

const readBody = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw Object.assign(new Error('Webhook too large'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    requireServerFeature('RAZORPAY_SUBSCRIPTIONS_ENABLED');
    const rawBody = await readBody(req);
    const signature = req.headers['x-razorpay-signature'] || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!secret) return res.status(503).send('Webhook is not configured');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    if (
      typeof signature !== 'string' ||
      !/^[a-f0-9]{64}$/.test(signature) ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return res.status(400).send('Invalid signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    if (!String(payload.event || '').startsWith('subscription.'))
      return res.status(200).send('Ignored');
    const subscription = payload.payload?.subscription?.entity;
    const uid = subscription?.notes?.uid;
    if (!uid || !subscription?.id) return res.status(200).send('Ignored');

    const providerEventId =
      req.headers['x-razorpay-event-id'] ||
      crypto.createHash('sha256').update(rawBody).digest('hex');
    const eventId = crypto.createHash('sha256').update(String(providerEventId)).digest('hex');
    const eventTimestamp = Number(payload.created_at ? payload.created_at * 1000 : Date.now());

    await upsertRazorpayEntitlement({
      uid,
      subscription,
      eventId,
      event: payload.event,
      eventTimestamp,
    });

    return res.status(200).send('ok');
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).send(error.message);
    console.error('Razorpay subscription webhook failed:', error);
    return res.status(500).send('Webhook processing failed');
  }
}
