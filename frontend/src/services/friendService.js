import { db, auth } from '../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  getDocFromCache,
} from 'firebase/firestore';
import { createNotification } from '../utils/notificationHelper.js';
import validationService, { FriendRequestSchema } from './validationService.js';

// Helper to mimic Axios response
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

const _normalize = (userData) => {
  if (!userData) return userData;
  return {
    ...userData,
    name: userData.name || userData.displayName || 'Member',
    avatar: userData.avatar || userData.photoURL,
  };
};

const friendService = {
  searchUsers: (_searchTerm) => {
    // Feature disabled for enhanced privacy.
    // Users can only be added via common groups or shared links.
    return wrap({ users: [] });
  },

  getUser: async (userId) => {
    if (!userId) throw new Error('User ID required');
    const uSnap = await getDoc(doc(db, 'users', userId));
    if (!uSnap.exists()) throw new Error('User not found');
    return wrap({ _id: uSnap.id, ...uSnap.data() });
  },

  sendRequest: async (receiverId) => {
    const senderId = auth.currentUser?.uid;
    if (!senderId) throw new Error('Auth required');

    const requestId = `${senderId}_${receiverId}`;
    const requestRef = doc(db, 'friendRequests', requestId);
    const existing = await getDoc(requestRef);
    if (existing.exists() && existing.data()?.status === 'pending') {
      throw new Error('Request already pending');
    }

    const requestPayload = {
      from: senderId,
      to: receiverId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Validate
    validationService.validate(FriendRequestSchema, requestPayload);

    await setDoc(requestRef, requestPayload);

    // Notify the receiver
    createNotification(
      receiverId,
      `${auth.currentUser?.displayName || 'Someone'} sent you a friend request`,
      'friend_request'
    );

    return wrap({ message: 'Friend request sent' });
  },

  getRequests: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return wrap({ incoming: [], outgoing: [] });

    const incomingQ = query(
      collection(db, 'friendRequests'),
      where('to', '==', userId),
      where('status', '==', 'pending')
    );
    const outgoingQ = query(
      collection(db, 'friendRequests'),
      where('from', '==', userId),
      where('status', '==', 'pending')
    );

    const [incomingSnap, outgoingSnap] = await Promise.all([
      getDocs(incomingQ),
      getDocs(outgoingQ),
    ]);

    const incoming = await Promise.all(
      incomingSnap.docs.map(async (d) => {
        const data = d.data();
        let uSnap = await getDocFromCache(doc(db, 'publicProfiles', data.from)).catch(() => null);
        if (!uSnap) uSnap = await getDoc(doc(db, 'publicProfiles', data.from)).catch(() => null);
        return { _id: d.id, ...data, from: { _id: data.from, ..._normalize(uSnap?.data()) } };
      })
    );

    const outgoing = await Promise.all(
      outgoingSnap.docs.map(async (d) => {
        const data = d.data();
        let uSnap = await getDocFromCache(doc(db, 'publicProfiles', data.to)).catch(() => null);
        if (!uSnap) uSnap = await getDoc(doc(db, 'publicProfiles', data.to)).catch(() => null);
        return { _id: d.id, ...data, to: { _id: data.to, ..._normalize(uSnap?.data()) } };
      })
    );

    return wrap({ incoming, outgoing });
  },

  respondToRequest: async (requestId, status) => {
    const reqRef = doc(db, 'friendRequests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) throw new Error('Request not found');
    const reqData = reqSnap.data();
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || reqData.to !== currentUid)
      throw new Error('Only the recipient can respond.');
    if (reqData.status !== 'pending') throw new Error('This request has already been handled.');

    if (status === 'accepted') {
      const fromRef = doc(db, 'users', reqData.from);
      const toRef = doc(db, 'users', reqData.to);
      const batch = writeBatch(db);
      batch.update(reqRef, { status: 'accepted', respondedAt: new Date().toISOString() });
      batch.update(fromRef, { friends: arrayUnion(reqData.to) });
      batch.update(toRef, { friends: arrayUnion(reqData.from) });
      await batch.commit();

      // Notify the requester
      createNotification(
        reqData.from,
        `${auth.currentUser?.displayName || 'Someone'} accepted your friend request`,
        'friend_accepted'
      );
    } else {
      await updateDoc(reqRef, { status: 'rejected', respondedAt: new Date().toISOString() });
    }

    return wrap({ message: `Request ${status}` });
  },

  getFriends: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return wrap({ friends: [] });

    const uDoc = await getDoc(doc(db, 'users', userId));
    const friendIds = uDoc.data()?.friends || [];

    const friends = await Promise.all(
      friendIds.map(async (id) => {
        let d = await getDocFromCache(doc(db, 'users', id)).catch(() => null);
        if (!d) d = await getDoc(doc(db, 'users', id)).catch(() => null);
        return { _id: id, ..._normalize(d?.data()) };
      })
    );

    return wrap({ friends });
  },

  getNetworkAnalytics: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return wrap({ networkAnalytics: [] });

    try {
      const { computeGroupBalances, simplifyDebts } = await import('../utils/balanceEngine.js');
      // 1. Get current user's friend list
      const uDoc = await getDoc(doc(db, 'users', userId));
      const friendIds = uDoc.data()?.friends || [];
      if (friendIds.length === 0) return wrap({ networkAnalytics: [] });

      // 2. Get all groups user is in
      const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
      const groupSnap = await getDocs(q);
      const myGroups = groupSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((g) => g.status !== 'deleted');

      // 3. Pre-fetch all group data to avoid redundant calls in the friend loop
      const groupDataCache = {};
      await Promise.all(
        myGroups.map(async (group) => {
          const [expSnap, stlSnap] = await Promise.all([
            getDocs(collection(db, 'groups', group.id, 'expenses')),
            getDocs(collection(db, 'groups', group.id, 'settlements')),
          ]);
          groupDataCache[group.id] = {
            expenses: expSnap.docs
              .map((d) => ({ _id: d.id, ...d.data() }))
              .filter((e) => e.status !== 'deleted'),
            settlements: stlSnap.docs
              .map((d) => ({ _id: d.id, ...d.data() }))
              .filter((s) => s.status !== 'deleted'),
            members: group.members || [],
          };
        })
      );

      const networkAnalytics = await Promise.all(
        friendIds.map(async (fId) => {
          // Cache-first: avoids redundant network reads for recently-fetched profiles
          let fDoc = await getDocFromCache(doc(db, 'users', fId)).catch(() => null);
          if (!fDoc || !fDoc.exists()) fDoc = await getDoc(doc(db, 'users', fId)).catch(() => null);
          const fData = { _id: fId, ..._normalize(fDoc?.exists() ? fDoc.data() : null) };

          const mutualGroups = myGroups.filter((g) => g.members?.includes(fId));

          let netBalance = 0;
          let totalTurnover = 0;
          const mutualGroupsEx = [];

          for (const group of mutualGroups) {
            const { expenses, settlements, members } = groupDataCache[group.id];

            let groupSpecificBalance = 0;

            // 1. Calculate totalTurnover raw from expenses
            expenses.forEach((exp) => {
              const paidByUid = exp.paidBy?._id || exp.paidBy?.uid || exp.paidBy || '';
              const isParticipant =
                paidByUid === userId ||
                paidByUid === fId ||
                (Array.isArray(exp.participants) &&
                  (exp.participants.includes(userId) || exp.participants.includes(fId)));
              if (isParticipant) {
                totalTurnover += parseFloat(exp.amount || 0);
              }
            });

            // 2. Compute group balances and simplify debts to get actual pairwise balance
            const groupBalances = computeGroupBalances(
              expenses,
              settlements,
              members.map((uid) => ({ uid }))
            );
            const simplifiedTx = simplifyDebts(groupBalances);

            simplifiedTx.forEach((tx) => {
              if (tx.from === userId && tx.to === fId) {
                groupSpecificBalance -= tx.amount;
              }
              if (tx.from === fId && tx.to === userId) {
                groupSpecificBalance += tx.amount;
              }
            });

            netBalance += groupSpecificBalance;

            mutualGroupsEx.push({
              id: group.id,
              title: group.name || group.title,
              balance: Math.round(groupSpecificBalance * 100) / 100,
            });
          }

          return {
            friend: fData,
            netBalance: Math.round(netBalance * 100) / 100,
            totalTurnover: Math.round(totalTurnover * 100) / 100,
            mutualGroups: mutualGroupsEx,
            mutualGroupsCount: mutualGroups.length,
          };
        })
      );

      return wrap({
        networkAnalytics: networkAnalytics.sort(
          (a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance)
        ),
        totalSharedBalance: networkAnalytics.reduce((acc, curr) => acc + curr.netBalance, 0),
      });
    } catch (error) {
      console.error('Network analytics error:', error);
      return wrap({ networkAnalytics: [] });
    }
  },

  checkRelationship: async (targetUserId) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !targetUserId) return wrap({ status: 'unknown' });

    try {
      // Check YOUR friends array
      const uDoc = await getDoc(doc(db, 'users', userId));
      const myFriends = uDoc.data()?.friends || [];
      if (myFriends.includes(targetUserId)) return wrap({ status: 'friend' });

      // Relationship documents use deterministic IDs. Exact reads are both
      // cheaper and allowed by the privacy rules; pre-friend reads of the
      // target's private `users/{uid}` document are intentionally forbidden.
      const [incomingSnap, outgoingSnap] = await Promise.all([
        getDoc(doc(db, 'friendRequests', `${targetUserId}_${userId}`)),
        getDoc(doc(db, 'friendRequests', `${userId}_${targetUserId}`)),
      ]);

      if (incomingSnap.exists() && incomingSnap.data()?.status === 'pending') {
        return wrap({ status: 'pending_incoming' });
      }
      if (outgoingSnap.exists() && outgoingSnap.data()?.status === 'pending') {
        return wrap({ status: 'pending_outgoing' });
      }

      return wrap({ status: 'none' });
    } catch (error) {
      return wrap({ status: 'none' });
    }
  },

  getFriendAnalytics: (_friendId) => {
    return wrap({ analytics: {} });
  },

  removeFriend: async (friendId) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !friendId) throw new Error('IDs required');

    try {
      const userRef = doc(db, 'users', userId);
      const friendRef = doc(db, 'users', friendId);

      // 1. Remove from both friends arrays
      const batch = writeBatch(db);
      batch.update(userRef, { friends: arrayRemove(friendId) });
      batch.update(friendRef, { friends: arrayRemove(userId) });
      await batch.commit();

      // 2. Clean up any pending requests between these two
      const qIn = query(
        collection(db, 'friendRequests'),
        where('from', '==', friendId),
        where('to', '==', userId),
        where('status', '==', 'pending')
      );
      const qOut = query(
        collection(db, 'friendRequests'),
        where('from', '==', userId),
        where('to', '==', friendId),
        where('status', '==', 'pending')
      );

      const [inSnap, outSnap] = await Promise.all([getDocs(qIn), getDocs(qOut)]);

      const deletePromises = [];
      inSnap.docs.forEach((d) => deletePromises.push(deleteDoc(d.ref)));
      outSnap.docs.forEach((d) => deletePromises.push(deleteDoc(d.ref)));

      await Promise.all(deletePromises);

      return wrap({ message: 'Friend removed' });
    } catch (error) {
      console.error('Remove friend error:', error);
      throw error;
    }
  },
};

export default friendService;
