import { db, auth } from '../config/firebase.js';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, arrayUnion, arrayRemove, limit, getDocFromCache, getDocsFromCache
} from 'firebase/firestore';
import { createNotification } from '../utils/notificationHelper.js';

// Helper to mimic Axios response
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

const friendService = {
  searchUsers: async (searchTerm) => {
    // Feature disabled for enhanced privacy. 
    // Users can only be added via common groups or shared links.
    return wrap({ users: [] });
  },

  getUser: async (userId) => {
    if (!userId) throw new Error("User ID required");
    const uSnap = await getDoc(doc(db, 'users', userId));
    if (!uSnap.exists()) throw new Error("User not found");
    return wrap({ _id: uSnap.id, ...uSnap.data() });
  },
  
  sendRequest: async (receiverId) => {
    const senderId = auth.currentUser?.uid;
    if (!senderId) throw new Error("Auth required");
    
    // Check if request already exists
    const q = query(
      collection(db, 'friendRequests'), 
      where('from', '==', senderId),
      where('to', '==', receiverId),
      where('status', '==', 'pending')
    );
    const existing = await getDocs(q);
    if (!existing.empty) throw new Error("Request already pending");

    await addDoc(collection(db, 'friendRequests'), {
      from: senderId,
      to: receiverId,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

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

    const incomingQ = query(collection(db, 'friendRequests'), where('to', '==', userId), where('status', '==', 'pending'));
    const outgoingQ = query(collection(db, 'friendRequests'), where('from', '==', userId), where('status', '==', 'pending'));

    const [incomingSnap, outgoingSnap] = await Promise.all([getDocs(incomingQ), getDocs(outgoingQ)]);

    const incoming = await Promise.all(incomingSnap.docs.map(async d => {
      const data = d.data();
      let uSnap = await getDocFromCache(doc(db, 'users', data.from)).catch(() => null);
      if (!uSnap) uSnap = await getDoc(doc(db, 'users', data.from)).catch(() => null);
      return { _id: d.id, ...data, from: { _id: data.from, ...(uSnap?.data() || { name: 'Member' }) } };
    }));

    const outgoing = await Promise.all(outgoingSnap.docs.map(async d => {
      const data = d.data();
      let uSnap = await getDocFromCache(doc(db, 'users', data.to)).catch(() => null);
      if (!uSnap) uSnap = await getDoc(doc(db, 'users', data.to)).catch(() => null);
      return { _id: d.id, ...data, to: { _id: data.to, ...(uSnap?.data() || { name: 'Member' }) } };
    }));

    return wrap({ incoming, outgoing });
  },

  respondToRequest: async (requestId, status) => {
    const reqRef = doc(db, 'friendRequests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) throw new Error("Request not found");
    const reqData = reqSnap.data();

    if (status === 'accepted') {
      // Add to each other's friends list
      const fromRef = doc(db, 'users', reqData.from);
      const toRef = doc(db, 'users', reqData.to);

      await Promise.all([
        updateDoc(fromRef, { friends: arrayUnion(reqData.to) }),
        updateDoc(toRef, { friends: arrayUnion(reqData.from) }),
        updateDoc(reqRef, { status: 'accepted' })
      ]);

      // Notify the requester
      createNotification(
        reqData.from,
        `${auth.currentUser?.displayName || 'Someone'} accepted your friend request`,
        'friend_accepted'
      );
    } else {
      await updateDoc(reqRef, { status: 'rejected' });
    }

    return wrap({ message: `Request ${status}` });
  },

  getFriends: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return wrap({ friends: [] });

    const uDoc = await getDoc(doc(db, 'users', userId));
    const friendIds = uDoc.data()?.friends || [];

    const friends = await Promise.all(friendIds.map(async id => {
      let d = await getDocFromCache(doc(db, 'users', id)).catch(() => null);
      if (!d) d = await getDoc(doc(db, 'users', id)).catch(() => null);
      return { _id: id, ...(d?.data() || { name: 'Member' }) };
    }));

    return wrap({ friends });
  },
  
  getNetworkAnalytics: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return wrap({ networkAnalytics: [] });

    try {
      // 1. Get current user's friend list
      const uDoc = await getDoc(doc(db, 'users', userId));
      const friendIds = uDoc.data()?.friends || [];
      if (friendIds.length === 0) return wrap({ networkAnalytics: [] });

      // 2. Get all groups user is in
      const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
      const groupSnap = await getDocs(q);
      const myGroups = groupSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Pre-fetch all group data to avoid redundant calls in the friend loop
      const groupDataCache = {};
      await Promise.all(myGroups.map(async (group) => {
        const [expSnap, stlSnap] = await Promise.all([
          getDocs(collection(db, 'groups', group.id, 'expenses')),
          getDocs(collection(db, 'groups', group.id, 'settlements'))
        ]);
        groupDataCache[group.id] = {
          expenses: expSnap.docs.map(d => d.data()),
          settlements: stlSnap.docs.map(d => d.data())
        };
      }));

      const networkAnalytics = await Promise.all(friendIds.map(async fId => {
        const fDoc = await getDoc(doc(db, 'users', fId));
        const fData = { _id: fId, ...(fDoc.exists() ? fDoc.data() : { name: 'Unknown' }) };

        const mutualGroups = myGroups.filter(g => g.members?.includes(fId));
        
        let netBalance = 0;
        let totalTurnover = 0;
        const mutualGroupsEx = [];

        for (const group of mutualGroups) {
          const { expenses, settlements } = groupDataCache[group.id];
          
          let groupSpecificBalance = 0;

          expenses.forEach(exp => {
            if (exp.status === 'deleted') return;
            const rawSplits = exp.splits || [];
            
            // In Firestore, splits are [ { user: uid, amount: x }, ... ]
            // We need to find our share and the friend's share
            let myShare = 0;
            let friendShare = 0;

            if (Array.isArray(rawSplits)) {
              rawSplits.forEach(s => {
                const sUid = s.user?._id || s.user?.uid || s.user || '';
                if (sUid === userId) myShare = parseFloat(s.amount || 0);
                if (sUid === fId) friendShare = parseFloat(s.amount || 0);
              });
            } else {
              // Fallback for legacy object-based splits (if any exist)
              myShare = parseFloat(rawSplits[userId] || 0);
              friendShare = parseFloat(rawSplits[fId] || 0);
            }

            const paidByUid = exp.paidBy?._id || exp.paidBy?.uid || exp.paidBy || '';
            
            if (paidByUid === userId) {
              netBalance += friendShare;
              groupSpecificBalance += friendShare;
            }
            if (paidByUid === fId) {
              netBalance -= myShare;
              groupSpecificBalance -= myShare;
            }
            
            const isParticipant = paidByUid === userId || paidByUid === fId || 
                                (Array.isArray(exp.participants) && (exp.participants.includes(userId) || exp.participants.includes(fId)));
                             
            if (isParticipant) {
                totalTurnover += parseFloat(exp.amount || 0);
            }
          });

          settlements.forEach(stl => {
            if (stl.status === 'deleted') return;
            const amt = parseFloat(stl.amount || 0);
            const payerUid = stl.payer?._id || stl.payer?.uid || stl.payer || stl.from || '';
            const payeeUid = stl.payee?._id || stl.payee?.uid || stl.payee || stl.to || '';

            if (payerUid === userId && payeeUid === fId) {
              netBalance -= amt;
              groupSpecificBalance -= amt;
            }
            if (payerUid === fId && payeeUid === userId) {
              netBalance += amt;
              groupSpecificBalance += amt;
            }
          });

          mutualGroupsEx.push({
            id: group.id,
            title: group.title,
            balance: Math.round(groupSpecificBalance * 100) / 100
          });
        }

        return {
          friend: fData,
          netBalance: Math.round(netBalance * 100) / 100,
          totalTurnover: Math.round(totalTurnover * 100) / 100,
          mutualGroups: mutualGroupsEx,
          mutualGroupsCount: mutualGroups.length
        };
      }));

      return wrap({ 
        networkAnalytics: networkAnalytics.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance)),
        totalSharedBalance: networkAnalytics.reduce((acc, curr) => acc + curr.netBalance, 0)
      });
    } catch (error) {
      console.error("Network analytics error:", error);
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

      // ALSO check their friends array (handles one-sided data corruption / race conditions)
      const theirDoc = await getDoc(doc(db, 'users', targetUserId));
      const theirFriends = theirDoc.data()?.friends || [];
      if (theirFriends.includes(userId)) {
        // Self-heal: make the link bidirectional so future checks pass without this extra read
        updateDoc(doc(db, 'users', userId), { friends: arrayUnion(targetUserId) }).catch(() => {});
        return wrap({ status: 'friend' });
      }

      // Check for pending requests (both directions)
      const qIncoming = query(
        collection(db, 'friendRequests'), 
        where('from', '==', targetUserId), 
        where('to', '==', userId),
        where('status', '==', 'pending')
      );
      const qOutgoing = query(
        collection(db, 'friendRequests'), 
        where('from', '==', userId), 
        where('to', '==', targetUserId),
        where('status', '==', 'pending')
      );

      const [inSnap, outSnap] = await Promise.all([getDocs(qIncoming), getDocs(qOutgoing)]);
      
      if (!inSnap.empty) return wrap({ status: 'pending_incoming' });
      if (!outSnap.empty) return wrap({ status: 'pending_outgoing' });

      return wrap({ status: 'none' });
    } catch (error) {
      return wrap({ status: 'none' });
    }
  },

  getFriendAnalytics: async (friendId) => {
    return wrap({ analytics: {} });
  },

  removeFriend: async (friendId) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !friendId) throw new Error("IDs required");

    try {
      const userRef = doc(db, 'users', userId);
      const friendRef = doc(db, 'users', friendId);

      // 1. Remove from both friends arrays
      await Promise.all([
        updateDoc(userRef, { friends: arrayRemove(friendId) }),
        updateDoc(friendRef, { friends: arrayRemove(userId) })
      ]);

      // 2. Clean up any pending requests between these two
      const qIn = query(collection(db, 'friendRequests'), where('from', '==', friendId), where('to', '==', userId), where('status', '==', 'pending'));
      const qOut = query(collection(db, 'friendRequests'), where('from', '==', userId), where('to', '==', friendId), where('status', '==', 'pending'));
      
      const [inSnap, outSnap] = await Promise.all([getDocs(qIn), getDocs(qOut)]);
      
      const deletePromises = [];
      inSnap.docs.forEach(d => deletePromises.push(deleteDoc(d.ref)));
      outSnap.docs.forEach(d => deletePromises.push(deleteDoc(d.ref)));
      
      await Promise.all(deletePromises);

      return wrap({ message: 'Friend removed' });
    } catch (error) {
      console.error("Remove friend error:", error);
      throw error;
    }
  },
};

export default friendService;
