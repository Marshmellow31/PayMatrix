/* eslint-env node */

import { requireFirebaseUser } from '../server/firebaseAdmin.js';
import { readTrustedEntitlement } from '../server/proAccess.js';
import { FREE_LIMITS, PRO_LIMITS } from '../server/proPolicyCore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const user = await requireFirebaseUser(req);
    const entitlement = await readTrustedEntitlement(user.uid);
    return res.status(200).json({
      state: entitlement.state,
      isPro: entitlement.isPro,
      limits: entitlement.isPro ? PRO_LIMITS : FREE_LIMITS,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to read subscription status.',
    });
  }
}

