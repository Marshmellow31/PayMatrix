/* eslint-env node */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin.js';
import { deriveEffectiveEntitlement } from './subscriptionEntitlementCore.js';
import { hourlyWindow, quotaDecision, usagePeriod } from './proPolicyCore.js';

const MAX_RECEIPT_SCANS_PER_HOUR = 10;

export const readTrustedEntitlement = async (uid, now = Date.now()) => {
  const snapshot = await adminDb().doc(`entitlements/${uid}`).get();
  const record = snapshot.exists ? snapshot.data() : {};
  const effective = deriveEffectiveEntitlement(record.sources || [], now);
  return { ...effective, sources: Array.isArray(record.sources) ? record.sources : [] };
};

export const consumeReceiptScan = async (uid, now = Date.now()) => {
  const db = adminDb();
  const entitlement = await readTrustedEntitlement(uid, now);
  const period = usagePeriod(now);
  const window = hourlyWindow(now);
  const reference = db.doc(`proUsage/${uid}/periods/${period}`);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists ? snapshot.data() : {};
    const scans = Number(current.receiptScans || 0);
    const currentHourly = Number(current.receiptScanHour || -1) === window
      ? Number(current.receiptScansThisHour || 0)
      : 0;
    const quota = quotaDecision({
      isPro: entitlement.isPro,
      used: scans,
      limitName: 'receiptScansPerMonth',
    });

    if (!quota.allowed) return { ...quota, reason: 'monthly_quota', entitlement, period };
    if (currentHourly >= MAX_RECEIPT_SCANS_PER_HOUR) {
      return {
        allowed: false,
        reason: 'hourly_abuse_limit',
        retryAfterSeconds: 3600 - Math.floor((now % 3_600_000) / 1000),
        entitlement,
        period,
      };
    }

    transaction.set(
      reference,
      {
        uid,
        period,
        receiptScans: scans + 1,
        receiptScanHour: window,
        receiptScansThisHour: currentHourly + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      allowed: true,
      limit: quota.limit,
      used: scans + 1,
      remaining: quota.limit === null ? null : Math.max(0, quota.limit - scans - 1),
      entitlement,
      period,
    };
  });
};

export const recordReceiptScan = async ({ uid, status, durationMs, itemCount, errorCode }) => {
  await adminDb().collection('ai_requests').add({
    uid,
    type: 'receipt_scan',
    status,
    durationMs: Math.max(0, Number(durationMs) || 0),
    itemCount: Math.max(0, Number(itemCount) || 0),
    errorCode: errorCode || null,
    model: 'gemini-3.1-flash-lite',
    createdAt: FieldValue.serverTimestamp(),
  });
};

