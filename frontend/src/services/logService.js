import { transactionFields } from '../utils/logTransactions.js';
import { db, auth } from '../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  arrayUnion,
  arrayRemove,
  getDocsFromCache,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import validationService, { LogEntrySchema } from './validationService.js';
import {
  compareCursorRecords,
  deduplicateById,
  PAGE_SIZES,
  getItemId,
  getCreatedAtMillis,
} from '../utils/cursorPagination.js';
import { instrumentation } from './instrumentation.js';
import { withRetry } from '../utils/retryOperation.js';

// Helper to mimic Axios response
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

const entriesCol = (groupId) => collection(db, 'logGroups', groupId, 'entries');
const activityCol = (groupId) => collection(db, 'logGroups', groupId, 'activity');

const myName = () => auth.currentUser?.displayName || auth.currentUser?.email || 'Member';

const activityPayload = (groupId, type, message, relatedId) => ({
  type,
  message: message.slice(0, 500),
  actorId: auth.currentUser?.uid,
  actorName: myName(),
  relatedId,
  groupId,
  createdAt: serverTimestamp(),
});

const logService = {
  createLogGroup: async (name, memberUids = []) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required');
    if (!name?.trim()) throw new Error('Group name is required');

    const payload = {
      name: name.trim().slice(0, 100),
      ownerId: uid,
      members: Array.from(new Set([uid, ...memberUids])),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await withRetry(() => addDoc(collection(db, 'logGroups'), payload));
    return wrap({ group: { _id: docRef.id, ...payload } }, 'Group created');
  },

  getMyLogGroups: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return wrap({ groups: [] });

    const q = query(collection(db, 'logGroups'), where('members', 'array-contains', uid));
    let snap;
    try {
      snap = await getDocs(q);
    } catch (err) {
      console.warn('[OFFLINE_FALLBACK] getMyLogGroups: fetching from cache');
      snap = await getDocsFromCache(q).catch(() => ({ docs: [] }));
    }

    const groups = snap.docs
      .map((d) => ({ _id: d.id, ...d.data() }))
      .filter((group) => group.status !== 'deleted')
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    return wrap({ groups });
  },

  getLogGroup: async (groupId) => {
    const snap = await getDoc(doc(db, 'logGroups', groupId));
    if (!snap.exists()) throw new Error('Group not found');
    return wrap({ group: { _id: snap.id, ...snap.data() } });
  },

  renameLogGroup: async (groupId, name) => {
    if (!name?.trim()) throw new Error('Group name is required');
    await withRetry(() =>
      updateDoc(doc(db, 'logGroups', groupId), {
        name: name.trim().slice(0, 100),
        updatedAt: new Date().toISOString(),
      })
    );
    return wrap({ message: 'Group renamed' });
  },

  addMembers: async (groupId, uids = []) => {
    if (uids.length === 0) return wrap({ message: 'No members to add' });
    await withRetry(() =>
      updateDoc(doc(db, 'logGroups', groupId), {
        members: arrayUnion(...uids),
        updatedAt: new Date().toISOString(),
      })
    );
    return wrap({ message: 'Members added' });
  },

  removeMember: async (groupId, uid) => {
    await withRetry(() =>
      updateDoc(doc(db, 'logGroups', groupId), {
        members: arrayRemove(uid),
        updatedAt: new Date().toISOString(),
      })
    );
    return wrap({ message: 'Member removed' });
  },

  leaveLogGroup: async (groupId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required');
    await withRetry(() => updateDoc(doc(db, 'logGroups', groupId), { members: arrayRemove(uid) }));
    return wrap({ message: 'Left group' });
  },

  deleteLogGroup: async (groupId) => {
    await withRetry(() =>
      updateDoc(doc(db, 'logGroups', groupId), {
        status: 'deleted',
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    return wrap({ message: 'Group deleted' });
  },

  addManualEntry: async (groupId, data) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required');

    const payload = {
      type: 'manual',
      ...(data.sourceGroupId
        ? {
            sourceGroupId: data.sourceGroupId,
            sourceGroupName: data.sourceGroupName || '',
            sourceExpenseId: data.sourceExpenseId || '',
          }
        : {}),
      title: data.title,
      ...transactionFields(data),
      category: data.category || 'Other',
      place: data.place || '',
      note: data.note || '',
      date: data.date || new Date().toISOString(),
      addedBy: uid,
      addedByName: myName(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    validationService.validate(LogEntrySchema, payload);

    const docRef = doc(entriesCol(groupId));
    const eventRef = doc(activityCol(groupId));
    const stamp = serverTimestamp();
    const auditedPayload = {
      ...payload,
      status: 'active',
      lastMutationId: eventRef.id,
      lastMutationType: 'entry_added',
      lastMutationAt: stamp,
      lastEditedBy: uid,
    };
    await withRetry(() => {
      const batch = writeBatch(db);
      batch.set(docRef, auditedPayload);
      batch.set(
        eventRef,
        activityPayload(groupId, 'entry_added', `${myName()} added "${payload.title}"`, docRef.id)
      );
      batch.update(doc(db, 'logGroups', groupId), { updatedAt: stamp });
      return batch.commit();
    });
    return wrap({ entry: { _id: docRef.id, ...auditedPayload } }, 'Entry added');
  },

  updateManualEntry: async (groupId, entryId, data) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required');

    const payload = {
      title: data.title,
      ...transactionFields(data),
      category: data.category || 'Other',
      place: data.place || '',
      note: data.note || '',
      date: data.date,
      updatedAt: new Date().toISOString(),
    };

    validationService.validate(LogEntrySchema.partial(), payload);

    await withRetry(() => {
      const batch = writeBatch(db);
      const eventRef = doc(activityCol(groupId));
      const stamp = serverTimestamp();
      batch.update(doc(db, 'logGroups', groupId, 'entries', entryId), {
        ...payload,
        updatedAt: stamp,
        lastMutationId: eventRef.id,
        lastMutationType: 'entry_updated',
        lastMutationAt: stamp,
        lastEditedBy: uid,
      });
      batch.set(
        eventRef,
        activityPayload(groupId, 'entry_updated', `${myName()} edited "${payload.title}"`, entryId)
      );
      batch.update(doc(db, 'logGroups', groupId), { updatedAt: stamp });
      return batch.commit();
    });
    return wrap({ message: 'Entry updated' });
  },

  deleteEntry: async (groupId, entryId) => {
    const entryRef = doc(db, 'logGroups', groupId, 'entries', entryId);
    const existing = await getDoc(entryRef);
    if (!existing.exists() || existing.data().status === 'deleted') {
      return wrap({ message: 'Entry already deleted' });
    }
    const title = existing.data().title || 'Entry';
    await withRetry(() => {
      const batch = writeBatch(db);
      const eventRef = doc(activityCol(groupId));
      const stamp = serverTimestamp();
      batch.update(entryRef, {
        status: 'deleted',
        deletedAt: stamp,
        updatedAt: stamp,
        lastMutationId: eventRef.id,
        lastMutationType: 'entry_deleted',
        lastMutationAt: stamp,
        lastEditedBy: auth.currentUser?.uid,
      });
      batch.set(
        eventRef,
        activityPayload(groupId, 'entry_deleted', `${myName()} deleted "${title}"`, entryId)
      );
      batch.update(doc(db, 'logGroups', groupId), { updatedAt: stamp });
      return batch.commit();
    });
    return wrap({ message: 'Entry deleted' });
  },

  getEntries: async (groupId, { pageSize = 100, lastDoc = null } = {}) => {
    let q = query(entriesCol(groupId), orderBy('date', 'desc'), limit(pageSize));
    if (lastDoc) {
      q = query(entriesCol(groupId), orderBy('date', 'desc'), startAfter(lastDoc), limit(pageSize));
    }
    let snap;
    try {
      snap = await getDocs(q);
    } catch (err) {
      console.warn('[OFFLINE_FALLBACK] getEntries: fetching from cache or fallback', err);
      try {
        snap = await getDocsFromCache(q);
      } catch {
        snap = await getDocs(entriesCol(groupId)).catch(() => ({ docs: [] }));
      }
    }

    const entries = snap.docs
      .map((d) => ({ _id: d.id, ...d.data() }))
      .filter((entry) => entry.status !== 'deleted')
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const lastVisible = snap.docs[snap.docs.length - 1] || null;
    const hasMore = snap.docs.length >= pageSize;

    return wrap({ entries, lastDoc: lastVisible, hasMore });
  },

  getActivity: async (groupId, options = {}) => {
    const isOptionsObj = typeof options === 'object' && options !== null;
    const cursor = isOptionsObj ? options.cursor : null;
    const pageSize = isOptionsObj
      ? options.limit || PAGE_SIZES.LOGS.initial
      : PAGE_SIZES.LOGS.initial;

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let snap;
    try {
      snap = await getDocs(query(activityCol(groupId), orderBy('createdAt', 'desc'), limit(100)));
    } catch (err) {
      console.warn('[OFFLINE_FALLBACK] getActivity: fetching from cache');
      snap = await getDocsFromCache(
        query(activityCol(groupId), orderBy('createdAt', 'desc'), limit(100))
      ).catch(() => ({ docs: [] }));
    }
    const elapsed = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
    );
    instrumentation.recordRead({
      count: snap?.docs?.length || 0,
      fromCache: Boolean(snap?.metadata?.fromCache),
      latencyMs: elapsed,
      signature: 'logGroups:groupId:activity',
    });

    const rawActivity = snap.docs.map((item) => ({ _id: item.id, ...item.data() }));
    const deduplicated = deduplicateById(rawActivity);
    deduplicated.sort(compareCursorRecords);

    let startIndex = 0;
    if (cursor) {
      const cursorId = typeof cursor === 'object' ? getItemId(cursor) : String(cursor);
      const idx = deduplicated.findIndex((a) => getItemId(a) === cursorId);
      if (idx !== -1) startIndex = idx + 1;
    }

    const activity = deduplicated.slice(startIndex, startIndex + pageSize);
    const lastItem = activity[activity.length - 1];
    const nextCursor = lastItem
      ? { id: getItemId(lastItem), createdAt: getCreatedAtMillis(lastItem) }
      : null;
    const hasMore = startIndex + pageSize < deduplicated.length;

    return wrap({ activity, nextCursor, hasMore });
  },

  /** Reads the current user's share across their real expense groups, for the transaction picker. */
  getMyExpenseShares: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return wrap({ shares: [] });

    const groupsSnap = await getDocs(
      query(collection(db, 'groups'), where('members', 'array-contains', uid))
    );
    const groups = groupsSnap.docs
      .map((d) => ({ _id: d.id, ...d.data() }))
      .filter((g) => g.status !== 'deleted')
      .sort((a, b) => {
        const time = (val) => val?.toMillis?.() || new Date(val || 0).getTime();
        return time(b.updatedAt || b.createdAt) - time(a.updatedAt || a.createdAt);
      })
      .slice(0, 10);

    const shares = [];

    await Promise.all(
      groups.map(async (group) => {
        const expSnap = await getDocs(
          query(
            collection(db, 'groups', group._id, 'expenses'),
            orderBy('createdAt', 'desc'),
            limit(25)
          )
        ).catch(() => getDocs(collection(db, 'groups', group._id, 'expenses')));
        expSnap.docs.forEach((expDoc) => {
          const exp = expDoc.data();
          if (exp.status === 'deleted' || exp.status === 'archived') return;

          const mySplit = exp.splits?.find((s) => {
            const sUid = s.user?._id || s.user?.uid || s.user || '';
            return sUid === uid;
          });
          const amount = parseFloat(mySplit?.amount || 0);
          if (!mySplit || amount <= 0) return;

          shares.push({
            sourceGroupId: group._id,
            sourceGroupName: group.name || group.title || 'Group',
            sourceExpenseId: expDoc.id,
            title: exp.title || 'Expense',
            amount,
            amountPaise: exp.amountPaise != null ? exp.amountPaise : undefined,
            currency: exp.currency || group.currency || 'INR',
            category: exp.category || 'Other',
            date: exp.date || exp.createdAt || new Date().toISOString(),
          });
        });
      })
    );

    shares.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return wrap({ shares });
  },

  /** Adds a picked expense share as a log entry. Idempotent — re-adding the same share overwrites. */
  addExpenseEntry: async (groupId, share) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required');

    const entryId = `exp_${uid}_${share.sourceGroupId}_${share.sourceExpenseId}`;
    const payload = {
      type: 'expense',
      title: share.title,
      ...transactionFields({ amount: share.amount, category: share.category }),
      category: share.category || 'Other',
      place: '',
      note: '',
      date: share.date,
      addedBy: uid,
      addedByName: myName(),
      sourceGroupId: share.sourceGroupId,
      sourceGroupName: share.sourceGroupName,
      sourceExpenseId: share.sourceExpenseId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    validationService.validate(LogEntrySchema, payload);

    await withRetry(() => {
      const batch = writeBatch(db);
      const eventRef = doc(activityCol(groupId));
      const stamp = serverTimestamp();
      batch.set(doc(db, 'logGroups', groupId, 'entries', entryId), {
        ...payload,
        status: 'active',
        lastMutationId: eventRef.id,
        lastMutationType: 'expense_entry_added',
        lastMutationAt: stamp,
        lastEditedBy: uid,
      });
      batch.set(
        eventRef,
        activityPayload(
          groupId,
          'expense_entry_added',
          `${myName()} added "${payload.title}" from ${payload.sourceGroupName}`,
          entryId
        )
      );
      batch.update(doc(db, 'logGroups', groupId), { updatedAt: stamp });
      return batch.commit();
    });
    return wrap({ entry: { _id: entryId, ...payload } }, 'Entry added');
  },
};

export default logService;
