import { db, auth } from '../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getDocFromCache,
  getDocFromServer,
  getDocsFromCache,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { calculateSplits, computeGroupBalances } from '../utils/balanceEngine.js';
import { createNotification } from '../utils/notificationHelper.js';
import { withRetry } from '../utils/retryOperation.js';
import loggingService from './loggingService.js';
import validationService, { ExpenseSchema } from './validationService.js';
import sanitizationService from './sanitizationService.js';
import { fromPaise, toPaise } from '../utils/money.js';
import syncTracker from './syncTracker.js';
import { serializeFirestoreData } from '../utils/firestoreSerialization.js';
import { buildAnalyticsSnapshot } from '../utils/analyticsEngine.js';

// Helper to mimic Axios response structure expected by Redux Thunks
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

// Recursively remove undefined values for Firestore
const clean = (obj) => {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) return;
    if (
      obj[key] &&
      typeof obj[key] === 'object' &&
      !Array.isArray(obj[key]) &&
      !(obj[key] instanceof Date)
    ) {
      newObj[key] = clean(obj[key]);
    } else {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

// Helper for non-blocking name resolution in activity logs (prioritizes speed)
const getStoredName = async (uid, fallback = 'Member') => {
  if (!uid) return fallback;
  try {
    const snap = await getDocFromCache(doc(db, 'publicProfiles', uid));
    if (snap.exists() && snap.data().name) return snap.data().name;
    if (snap.exists() && snap.data().email) return snap.data().email;
  } catch (_) {
    // Cache miss or offline error
  }
  return fallback;
};

const commitAuditedMutation = async ({
  groupId,
  recordRef,
  create = false,
  mutation,
  type,
  message,
  actorId,
  actorName,
}) => {
  const logRef = doc(collection(db, 'groups', groupId, 'logs'));
  const auditedMutation = {
    ...mutation,
    lastMutationId: logRef.id,
    lastMutationType: type,
    lastMutationAt: serverTimestamp(),
    lastEditedBy: actorId,
  };

  await withRetry(() => {
    const batch = writeBatch(db);
    if (create) batch.set(recordRef, auditedMutation);
    else batch.update(recordRef, auditedMutation);
    batch.update(doc(db, 'groups', groupId), { updatedAt: serverTimestamp() });
    batch.set(logRef, {
      type,
      message,
      actorId,
      actorName,
      relatedId: recordRef.id,
      groupId,
      createdAt: serverTimestamp(),
    });
    return batch.commit();
  });
  invalidateFinancialCaches();
  syncTracker.trackPendingWrites();

  return auditedMutation;
};

// Simple memoization cache for getSummary
let summaryCache = {
  data: null,
  timestamp: 0,
  hash: '',
};
const analyticsCache = new Map();
const analyticsRequests = new Map();
const ANALYTICS_CACHE_TTL = 30000;

const invalidateFinancialCaches = () => {
  summaryCache.data = null;
  summaryCache.timestamp = 0;
  summaryCache.hash = '';
  analyticsCache.clear();
};

/** Called by authSlice logout reducer to purge stale cross-user data after sign-out. */
export const clearSummaryCache = () => {
  invalidateFinancialCaches();
  analyticsRequests.clear();
};

const expenseService = {
  getExpenses: async (groupId, _page = 1) => {
    const q = query(collection(db, 'groups', groupId, 'expenses'), orderBy('createdAt', 'desc'));
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
    } catch (err) {
      console.warn('[OFFLINE_FALLBACK] getExpenses: fetching from cache');
      const { getDocsFromCache } = await import('firebase/firestore');
      querySnapshot = await getDocsFromCache(q);
    }
    const expenses = querySnapshot.docs
      .map((doc) => serializeFirestoreData({ _id: doc.id, ...doc.data() }))
      .filter((exp) => exp.status !== 'deleted' && exp.status !== 'archived');

    // Mimic the backend pagination signature
    return wrap({ expenses, totalPages: 1, currentPage: 1 });
  },

  getExpense: async (groupId, id) => {
    if (!groupId || !id) throw new Error('groupId and id are required for getExpense');
    const docRef = doc(db, 'groups', groupId, 'expenses', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Expense not found');
    return wrap({ expense: serializeFirestoreData({ _id: docSnap.id, ...docSnap.data() }) });
  },

  addExpense: async (groupId, data, userId) => {
    if (!userId) throw new Error('Authentication required to record transactions.');
    if (!groupId) throw new Error('Group ID required for expense');
    const amount = parseFloat(data.amount || 0);
    if (isNaN(amount) || amount <= 0) throw new Error('Invalid expense amount');
    if (amount > 1000000) throw new Error('Expense amount exceeds safety threshold (1M)');

    // Calculate splits array from form structure before saving
    const splits = calculateSplits(
      amount,
      data.splitType || 'equal',
      data.splitData || {},
      data.participants || []
    );

    const currentUid = auth.currentUser?.uid;
    if (!currentUid) throw new Error('Auth session missing');

    // Sanitize and Validate input
    const cleanData = sanitizationService.sanitizeObject(data);

    const payload = clean({
      ...cleanData,
      amount,
      amountPaise: toPaise(data.amount),
      groupId,
      paidBy: currentUid,
      paidByName: 'Member',
      splits,
      splitUserIds: splits.map((split) => split.user),
      admin: currentUid,
      createdBy: currentUid,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Final schema check
    validationService.validate(ExpenseSchema, payload);

    // Pre-generate IDs so the financial write and its audit record are atomic and replay-safe.
    const docRef = doc(collection(db, 'groups', groupId, 'expenses'));
    const actorName = await getStoredName(currentUid, 'Someone');
    const auditedPayload = await commitAuditedMutation({
      groupId,
      recordRef: docRef,
      create: true,
      mutation: { ...payload, status: payload.status || 'active', version: 1 },
      type: 'expense_added',
      message: `${actorName} added "${data.title || 'an expense'}" (₹${amount.toFixed(2)})`,
      actorId: currentUid,
      actorName,
    });

    // Secondary tasks: Log and metadata lookups happen in background (non-blocking)
    (() => {
      try {
        // Create global notifications for all participants (except the actor)
        const participantIds = data.participants || [];
        participantIds.forEach((pId) => {
          if (pId !== userId) {
            createNotification(
              pId,
              `${actorName} added "${data.title || 'an expense'}" (₹${parseFloat(data.amount || 0).toFixed(2)})`,
              'expense_added',
              docRef.id,
              groupId
            );
          }
        });
      } catch (_) {
        // ignore background logging failures
      }
    })();

    return wrap(
      { expense: serializeFirestoreData({ _id: docRef.id, ...auditedPayload }) },
      'Expense saved instantly offline/online'
    );
  },

  updateExpense: async (id, data, _userId) => {
    const groupId = data.groupId;
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) throw new Error('Auth session missing');
    const docRef = doc(db, 'groups', groupId, 'expenses', id);
    const previousSnap = await getDoc(docRef);
    if (!previousSnap.exists()) throw new Error('Expense not found');
    const previous = previousSnap.data();

    // Re-calculate splits if amount or split configuration changed
    const splits = calculateSplits(
      data.amount,
      data.splitType,
      data.splitData || {},
      data.participants || []
    );

    const payload = clean({
      title: data.title,
      description: data.description,
      amount: Number(data.amount),
      amountPaise: toPaise(data.amount),
      currency: data.currency || previous.currency || 'INR',
      date: data.date,
      splitType: data.splitType,
      splitData: data.splitData || {},
      participants: data.participants || [],
      category: data.category,
      attachments: data.attachments,
      notes: data.notes,
      paidByName: previous.paidByName || 'Member',
      splits,
      splitUserIds: splits.map((split) => split.user),
      updatedAt: serverTimestamp(),
      version: Number(previous.version || 1) + 1,
    });
    const actorName = await getStoredName(currentUid, 'Someone');
    const changes = [];
    if (previous.title !== data.title) changes.push('title');
    if (toPaise(previous.amount) !== toPaise(data.amount)) changes.push('amount');
    if (previous.category !== data.category) changes.push('category');
    const auditedPayload = await commitAuditedMutation({
      groupId,
      recordRef: docRef,
      mutation: payload,
      type: 'expense_updated',
      message: `${actorName} edited "${data.title || 'an expense'}"${changes.length ? ` (${changes.join(', ')})` : ''}`,
      actorId: currentUid,
      actorName,
    });

    return wrap({
      expense: serializeFirestoreData({ _id: id, ...previous, ...auditedPayload }),
    });
  },

  deleteExpense: async (id, groupId, userId) => {
    if (!groupId) throw new Error('deleteExpense requires groupId');

    const docRef = doc(db, 'groups', groupId, 'expenses', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Expense not found');
    const actorId = auth.currentUser?.uid;
    if (!actorId || actorId !== userId) throw new Error('Authentication session mismatch.');
    const actorName = await getStoredName(actorId, 'Someone');
    await commitAuditedMutation({
      groupId,
      recordRef: docRef,
      mutation: {
        status: 'deleted',
        updatedAt: serverTimestamp(),
        version: Number(snap.data().version || 1) + 1,
      },
      type: 'expense_deleted',
      message: `${actorName} deleted "${snap.data().title || 'an expense'}"`,
      actorId,
      actorName,
    });

    return wrap({ message: 'Expense deleted' });
  },

  restoreExpense: async (id, groupId, userId) => {
    if (!groupId) throw new Error('restoreExpense requires groupId');
    const docRef = doc(db, 'groups', groupId, 'expenses', id);

    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return wrap(
          {
            error:
              'This record was permanently deleted in an older version and cannot be restored.',
          },
          404
        );
      }

      const actorId = auth.currentUser?.uid;
      if (!actorId || actorId !== userId) throw new Error('Authentication session mismatch.');
      const actorName = await getStoredName(actorId, 'Someone');
      const expenseTitle = snap.data()?.title || 'an expense';
      await commitAuditedMutation({
        groupId,
        recordRef: docRef,
        mutation: {
          status: 'active',
          updatedAt: serverTimestamp(),
          version: Number(snap.data().version || 1) + 1,
        },
        type: 'expense_restored',
        message: `${actorName} restored "${expenseTitle}"`,
        actorId,
        actorName,
      });
      return wrap({ message: 'Expense restored' });
    } catch (err) {
      console.error('Restore failed:', err);
      // If it's a "No document to update" error from Firebase directly (rare but possible with race conditions)
      if (err.code === 'not-found' || err.message?.includes('No document to update')) {
        return wrap({ error: 'Expense record not found in the database.' }, 404);
      }
      throw err;
    }
  },

  // Notice: For balances, we actually compute this on the client now when the store updates.
  // But to satisfy old Thunks, we can mock it by pulling all expenses + settlements
  // and running balanceEngine directly here.
  getBalances: async (groupId) => {
    const { computeGroupBalances } = await import('../utils/balanceEngine.js');

    // Fetch expenses and settlements
    // Fetch expenses and settlements with offline fallback
    const expQ = query(collection(db, 'groups', groupId, 'expenses'));
    const stlQ = query(collection(db, 'groups', groupId, 'settlements'));

    let expSnap, stlSnap;
    try {
      [expSnap, stlSnap] = await Promise.all([getDocs(expQ), getDocs(stlQ)]);
    } catch (err) {
      console.warn('[OFFLINE_FALLBACK] getBalances: fetching from cache');
      const { getDocsFromCache } = await import('firebase/firestore');
      [expSnap, stlSnap] = await Promise.all([
        getDocsFromCache(expQ).catch(() => ({ docs: [] })),
        getDocsFromCache(stlQ).catch(() => ({ docs: [] })),
      ]);
    }

    const grpRef = doc(db, 'groups', groupId);
    let grpSnap;
    try {
      grpSnap = await getDoc(grpRef);
    } catch (err) {
      const { getDocFromCache } = await import('firebase/firestore');
      grpSnap = await getDocFromCache(grpRef).catch(() => null);
    }

    const expenses = expSnap.docs
      .map((d) => ({ _id: d.id, ...d.data() }))
      .filter((e) => e.status !== 'deleted');
    const settlements = stlSnap.docs
      .map((d) => ({ _id: d.id, ...d.data() }))
      .filter((s) => s.status !== 'deleted');
    const groupMembers = (grpSnap.exists() && grpSnap.data().members) || [];

    const balances = computeGroupBalances(
      expenses,
      settlements,
      groupMembers.map((uid) => ({ uid }))
    );
    return wrap({ balances });
  },

  getSettlements: async (groupId) => {
    const q = query(collection(db, 'groups', groupId, 'settlements'), orderBy('createdAt', 'desc'));
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
    } catch (err) {
      console.warn('[OFFLINE_FALLBACK] getSettlements: fetching from cache');
      const { getDocsFromCache } = await import('firebase/firestore');
      querySnapshot = await getDocsFromCache(q);
    }
    const settlements = querySnapshot.docs
      .map((doc) => ({ _id: doc.id, ...doc.data() }))
      .filter((s) => s.status !== 'deleted');
    return wrap({ settlements });
  },

  deleteSettlement: async (id, groupId, userId) => {
    if (!groupId) throw new Error('deleteSettlement requires groupId');
    const docRef = doc(db, 'groups', groupId, 'settlements', id);

    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Settlement not found');
    const actorId = auth.currentUser?.uid;
    if (!actorId || actorId !== userId) throw new Error('Authentication session mismatch.');
    const [actorName, payeeName] = await Promise.all([
      getStoredName(actorId, 'Someone'),
      getStoredName(snap.data().payee, 'Member'),
    ]);
    await commitAuditedMutation({
      groupId,
      recordRef: docRef,
      mutation: {
        status: 'deleted',
        updatedAt: serverTimestamp(),
        version: Number(snap.data().version || 1) + 1,
      },
      type: 'settlement_deleted',
      message: `${actorName} deleted a settlement of ₹${Number(snap.data().amount || 0).toFixed(2)} to ${payeeName}`,
      actorId,
      actorName,
    });
    return wrap({ message: 'Settlement deleted' });
  },

  restoreSettlement: async (id, groupId, userId) => {
    if (!groupId) throw new Error('restoreSettlement requires groupId');
    const docRef = doc(db, 'groups', groupId, 'settlements', id);

    const snap = await getDoc(docRef);
    if (!snap.exists()) return wrap({ error: 'Settlement record not found.' }, 404);

    const actorId = auth.currentUser?.uid;
    if (!actorId || actorId !== userId) throw new Error('Authentication session mismatch.');
    const actorName = await getStoredName(actorId, 'Someone');
    const data = snap.data();
    const payeeName = await getStoredName(data.payee, 'Member');
    await commitAuditedMutation({
      groupId,
      recordRef: docRef,
      mutation: {
        status: 'active',
        updatedAt: serverTimestamp(),
        version: Number(data.version || 1) + 1,
      },
      type: 'settlement_restored',
      message: `${actorName} restored a settlement of ₹${(data.amount || 0).toFixed(2)} to ${payeeName}`,
      actorId,
      actorName,
    });
    return wrap({ message: 'Settlement restored' });
  },

  createSettlement: async (groupId, data, userId) => {
    if (!userId) throw new Error('Authentication required to settle up.');
    if (!groupId) throw new Error('Group ID required for settlement');

    // Safety check: ensure amount is a valid positive number
    const amountPaise = toPaise(data.amount);
    if (amountPaise <= 0) throw new Error('Invalid settlement amount');
    if (amountPaise > 100000000) throw new Error('Settlement amount exceeds safety threshold (1M)');
    const amount = fromPaise(amountPaise);

    const currentUid = auth.currentUser?.uid;
    if (!currentUid) throw new Error('Auth session missing');
    if (currentUid !== userId) throw new Error('Settlement payer does not match this session.');
    if (!data.payee || data.payee === currentUid) throw new Error('Choose another group member.');

    // Financial confirmations are never finalized from an unverified offline session.
    await getDocFromServer(doc(db, 'groups', groupId)).catch(() => {
      throw new Error('Connect to the internet before confirming a payment.');
    });

    const operationId = String(data.operationId || '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 120);
    if (!operationId) throw new Error('Settlement operation identifier is required.');

    const settlementData = {
      payer: currentUid,
      payee: data.payee,
      amount,
      amountPaise,
      notes: data.notes || 'Settled up',
      groupId,
      operationId,
      confirmationStatus: 'confirmed',
      confirmedBy: currentUid,
      confirmedAt: serverTimestamp(),
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1,
    };

    const docRef = doc(db, 'groups', groupId, 'settlements', operationId);

    try {
      const [actorName, payeeName] = await Promise.all([
        getStoredName(currentUid, 'Someone'),
        getStoredName(data.payee, 'Member'),
      ]);
      const auditedSettlement = await commitAuditedMutation({
        groupId,
        recordRef: docRef,
        create: true,
        mutation: settlementData,
        type: 'settlement_added',
        message: `${actorName} recorded a payment to ${payeeName}: ₹${amount.toFixed(2)}`,
        actorId: currentUid,
        actorName,
      });
      Object.assign(settlementData, auditedSettlement);
    } catch (error) {
      await loggingService.logError('expenseService', 'createSettlement', error);
      throw error;
    }

    // Secondary tasks (non-blocking)
    (async () => {
      try {
        const actorName = await getStoredName(currentUid, 'Someone');

        // Trigger notification for the recipient
        if (currentUid !== data.payee) {
          createNotification(
            data.payee,
            `${actorName} settled ₹${amount.toFixed(2)} with you.`,
            'settlement_received',
            docRef.id,
            groupId
          ).catch(() => {});
        }
      } catch (err) {
        console.warn('Background task failure:', err);
      }
    })();

    return wrap({ settlement: { _id: docRef.id, ...settlementData } }, 'Settlement recorded');
  },

  getSummary: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId)
      return wrap({ totalOwed: 0, totalOwe: 0, netBalance: 0, categories: [], groupBalances: {} });

    const now = Date.now();
    // Use a 30s TTL for the summary to prevent heavy fan-out reads on rapid sequential updates
    if (summaryCache.data && summaryCache.hash === userId && now - summaryCache.timestamp < 30000) {
      return wrap(summaryCache.data);
    }

    try {
      // 1. Resolve Groups first (Cache-first for speed on Dashboard)
      const groupCol = collection(db, 'groups');
      const q = query(groupCol, where('members', 'array-contains', userId));

      let groupSnap;
      try {
        groupSnap = await getDocs(q);
      } catch (err) {
        console.warn('[OFFLINE_FALLBACK] getSummary: fetching groups from cache');
        const { getDocsFromCache } = await import('firebase/firestore');
        groupSnap = await getDocsFromCache(q);
      }

      const activeGroupDocs = groupSnap.docs.filter((d) => d.data()?.status !== 'deleted');
      const groupIds = activeGroupDocs.map((d) => d.id);
      let totalOwed = 0;
      let totalOwe = 0;
      const categoryTotals = {};
      const groupBalances = {};

      const { computeGroupBalances } = await import('../utils/balanceEngine.js');

      // 2. Process each cohort's financials
      for (const groupId of groupIds) {
        let expSnap, stlSnap;
        const expCol = collection(db, 'groups', groupId, 'expenses');
        const stlCol = collection(db, 'groups', groupId, 'settlements');

        try {
          // eslint-disable-next-line no-await-in-loop
          [expSnap, stlSnap] = await Promise.all([getDocs(expCol), getDocs(stlCol)]);
        } catch (err) {
          const { getDocsFromCache } = await import('firebase/firestore'); // eslint-disable-line no-await-in-loop
          // eslint-disable-next-line no-await-in-loop
          [expSnap, stlSnap] = await Promise.all([
            getDocsFromCache(expCol).catch(() => ({ docs: [] })),
            getDocsFromCache(stlCol).catch(() => ({ docs: [] })),
          ]);
        }

        const expenses = expSnap.docs.map((d) => ({ _id: d.id, ...d.data() }));
        const settlements = stlSnap.docs.map((d) => ({ _id: d.id, ...d.data() }));

        // Category distribution (Your actual share) - SKIP DELETED
        expenses.forEach((exp) => {
          if (exp.status === 'deleted' || exp.status === 'archived') return;

          // Find the user's specific share in this expense
          const userSplit = exp.splits?.find((s) => {
            const sUid = s.user?._id || s.user?.uid || s.user || '';
            return sUid === userId;
          });

          if (userSplit && exp.category) {
            categoryTotals[exp.category] =
              (categoryTotals[exp.category] || 0) + parseFloat(userSplit.amount || 0);
          }
        });

        // Compute balances
        const groupDoc = groupSnap.docs.find((d) => d.id === groupId);
        const members = groupDoc.data().members || [];
        const activeExpenses = expenses.filter((e) => e.status !== 'deleted');
        const activeSettlements = settlements.filter((s) => s.status !== 'deleted');
        const balances = computeGroupBalances(
          activeExpenses,
          activeSettlements,
          members.map((uid) => ({ uid }))
        );
        const myBalance = balances[userId] || 0;

        groupBalances[groupId] = myBalance;
        if (myBalance > 0) totalOwed += myBalance;
        else if (myBalance < 0) totalOwe += Math.abs(myBalance);
      }

      const categories = Object.keys(categoryTotals)
        .map((name) => ({
          name,
          value: categoryTotals[name],
        }))
        .sort((a, b) => b.value - a.value);

      const finalData = {
        totalOwed,
        totalOwe,
        netBalance: totalOwed - totalOwe,
        categories,
        groupBalances,
      };

      // Save to cache
      summaryCache = {
        data: finalData,
        timestamp: Date.now(),
        hash: userId,
      };

      return wrap(finalData);
    } catch (error) {
      console.error('[CRITICAL] Summary engine error:', error);
      return wrap({ totalOwed: 0, totalOwe: 0, netBalance: 0, categories: [], groupBalances: {} });
    }
  },

  getUserSettlementPlan: async (groupId, userId) => {
    const balancesReq = await expenseService.getBalances(groupId);
    const balancesMap = balancesReq.data.data.balances;
    const { simplifyDebts } = await import('../utils/balanceEngine.js');
    const plan = simplifyDebts(balancesMap);

    const userDebts = plan.filter((tx) => tx.from === userId);
    const total_owe = userDebts.reduce((sum, tx) => sum + tx.amount, 0);

    return wrap({
      total_owe,
      settlements: userDebts,
      simplifiedDebts: plan,
    });
  },

  getActivity: async (groupId) => {
    const q = query(
      collection(db, 'groups', groupId, 'logs'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    let snap;
    try {
      snap = await getDocs(q);
    } catch (err) {
      console.warn('[OFFLINE_FALLBACK] getActivity: fetching from cache');
      const { getDocsFromCache } = await import('firebase/firestore');
      snap = await getDocsFromCache(q);
    }
    const activity = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    return wrap({ activity });
  },

  getAnalyticsSnapshot: (days = 30, { force = false } = {}) => {
    const userId = auth.currentUser?.uid;
    const periodDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
    const emptySnapshot = {
      ...buildAnalyticsSnapshot({ expenses: [], userId: userId || '', days: periodDays }),
      balances: { totalOwedPaise: 0, totalOwePaise: 0, netBalancePaise: 0, groups: [] },
      generatedAt: new Date().toISOString(),
      source: 'empty',
    };
    if (!userId) return wrap(emptySnapshot);

    const cacheKey = `${userId}:${periodDays}`;
    const cached = analyticsCache.get(cacheKey);
    if (!force && cached && Date.now() - cached.timestamp < ANALYTICS_CACHE_TTL) {
      return wrap({ ...cached.data, source: 'memory' });
    }
    if (!force && analyticsRequests.has(cacheKey)) return analyticsRequests.get(cacheKey);

    const request = (async () => {
      try {
        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', userId)
        );
        let groupSnap;
        try {
          groupSnap = await getDocs(groupsQuery);
        } catch {
          groupSnap = await getDocsFromCache(groupsQuery);
        }

        const activeGroups = groupSnap.docs
          .map((groupDoc) => ({ id: groupDoc.id, ...groupDoc.data() }))
          .filter((group) => group.status !== 'deleted');

        const groupData = await Promise.all(
          activeGroups.map(async (group) => {
            const expenseQuery = query(collection(db, 'groups', group.id, 'expenses'));
            const settlementQuery = query(collection(db, 'groups', group.id, 'settlements'));
            let expenseSnap;
            let settlementSnap;
            try {
              [expenseSnap, settlementSnap] = await Promise.all([
                getDocs(expenseQuery),
                getDocs(settlementQuery),
              ]);
            } catch {
              [expenseSnap, settlementSnap] = await Promise.all([
                getDocsFromCache(expenseQuery).catch(() => ({ docs: [] })),
                getDocsFromCache(settlementQuery).catch(() => ({ docs: [] })),
              ]);
            }

            return {
              group,
              expenses: expenseSnap.docs.map((expenseDoc) =>
                serializeFirestoreData({
                  _id: expenseDoc.id,
                  groupId: group.id,
                  groupName: group.name || group.title || 'Shared group',
                  ...expenseDoc.data(),
                })
              ),
              settlements: settlementSnap.docs.map((settlementDoc) =>
                serializeFirestoreData({ _id: settlementDoc.id, ...settlementDoc.data() })
              ),
            };
          })
        );

        const allExpenses = groupData.flatMap((entry) => entry.expenses);
        const insights = buildAnalyticsSnapshot({
          expenses: allExpenses,
          userId,
          days: periodDays,
        });

        let totalOwedPaise = 0;
        let totalOwePaise = 0;
        const balanceGroups = groupData
          .map(({ group, expenses, settlements }) => {
            const balances = computeGroupBalances(
              expenses.filter((expense) => expense.status !== 'deleted'),
              settlements.filter((settlement) => settlement.status !== 'deleted'),
              (group.members || []).map((uid) => ({ uid }))
            );
            const balancePaise = toPaise(balances[userId] || 0);
            if (balancePaise > 0) totalOwedPaise += balancePaise;
            if (balancePaise < 0) totalOwePaise += Math.abs(balancePaise);
            return {
              id: group.id,
              name: group.name || group.title || 'Shared group',
              balancePaise,
            };
          })
          .filter((group) => group.balancePaise !== 0)
          .sort((a, b) => Math.abs(b.balancePaise) - Math.abs(a.balancePaise));

        const data = {
          ...insights,
          balances: {
            totalOwedPaise,
            totalOwePaise,
            netBalancePaise: totalOwedPaise - totalOwePaise,
            groups: balanceGroups,
          },
          generatedAt: new Date().toISOString(),
          source:
            typeof navigator === 'undefined' || navigator.onLine ? 'network' : 'offline-cache',
        };

        analyticsCache.set(cacheKey, { data, timestamp: Date.now() });
        return wrap(data);
      } catch (error) {
        console.error('Analytics snapshot error:', error);
        if (cached) return wrap({ ...cached.data, source: 'stale-cache' });
        return wrap(emptySnapshot);
      } finally {
        analyticsRequests.delete(cacheKey);
      }
    })();

    analyticsRequests.set(cacheKey, request);
    return request;
  },
};

export default expenseService;
