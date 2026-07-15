import { db, auth } from '../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  getDocsFromCache,
} from 'firebase/firestore';
import { withRetry } from '../utils/retryOperation.js';
import validationService, { LogEntrySchema } from './validationService.js';

// Helper to mimic Axios response
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

const entriesCol = (groupId) => collection(db, 'logGroups', groupId, 'entries');

const myName = () => auth.currentUser?.displayName || auth.currentUser?.email || 'Member';

const logService = {
  createLogGroup: async (name, memberUids = []) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required');
    if (!name?.trim()) throw new Error('Group name is required');

    const payload = {
      name: name.trim().slice(0, 100),
      ownerId: uid,
      members: Array.from(new Set([uid, ...memberUids])),
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
    await withRetry(() => deleteDoc(doc(db, 'logGroups', groupId)));
    return wrap({ message: 'Group deleted' });
  },

  addManualEntry: async (groupId, data) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required');

    const payload = {
      type: 'manual',
      title: data.title,
      amount: parseFloat(data.amount),
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

    const docRef = await withRetry(() => addDoc(entriesCol(groupId), payload));
    return wrap({ entry: { _id: docRef.id, ...payload } }, 'Entry added');
  },

  updateManualEntry: async (groupId, entryId, data) => {
    const payload = {
      title: data.title,
      amount: parseFloat(data.amount),
      category: data.category || 'Other',
      place: data.place || '',
      note: data.note || '',
      date: data.date,
      updatedAt: new Date().toISOString(),
    };

    await withRetry(() => updateDoc(doc(db, 'logGroups', groupId, 'entries', entryId), payload));
    return wrap({ message: 'Entry updated' });
  },

  deleteEntry: async (groupId, entryId) => {
    await withRetry(() => deleteDoc(doc(db, 'logGroups', groupId, 'entries', entryId)));
    return wrap({ message: 'Entry deleted' });
  },

  getEntries: async (groupId) => {
    let snap;
    try {
      snap = await getDocs(entriesCol(groupId));
    } catch (err) {
      console.warn('[OFFLINE_FALLBACK] getEntries: fetching from cache');
      snap = await getDocsFromCache(entriesCol(groupId)).catch(() => ({ docs: [] }));
    }

    const entries = snap.docs
      .map((d) => ({ _id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return wrap({ entries });
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
      .filter((g) => g.status !== 'deleted');

    const shares = [];

    await Promise.all(
      groups.map(async (group) => {
        const expSnap = await getDocs(collection(db, 'groups', group._id, 'expenses'));
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
      amount: share.amount,
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

    await withRetry(() => setDoc(doc(db, 'logGroups', groupId, 'entries', entryId), payload));
    return wrap({ entry: { _id: entryId, ...payload } }, 'Entry added');
  },
};

export default logService;
