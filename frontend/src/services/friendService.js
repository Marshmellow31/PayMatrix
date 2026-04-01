import { db, auth } from '../config/firebase.js';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, arrayUnion, arrayRemove, limit 
} from 'firebase/firestore';
import { createNotification } from '../utils/notificationHelper.js';

// Helper to mimic Axios response
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

const friendService = {
  searchUsers: async (searchTerm) => {
    if (!searchTerm) return wrap({ users: [] });
    const term = searchTerm.toLowerCase();
    
    // First, try exact email match
    const emailQ = query(collection(db, 'users'), where('email', '==', term));
    
    // Also try prefix match on nameLowerCase
    const nameQ = query(
      collection(db, 'users'), 
      where('nameLowerCase', '>=', term),
      where('nameLowerCase', '<=', term + '\uf8ff'),
      limit(10)
    );
    
    const [emailSnap, nameSnap] = await Promise.all([getDocs(emailQ), getDocs(nameQ)]);
    
    // Combine and de-duplicate results by UID
    const results = new Map();
    emailSnap.docs.forEach(doc => results.set(doc.id, { _id: doc.id, ...doc.data() }));
    nameSnap.docs.forEach(doc => results.set(doc.id, { _id: doc.id, ...doc.data() }));
    
    // Filter out current user if necessary, but UI usually handles this. 
    // Let's return the unique list.
    return wrap({ users: Array.from(results.values()) });
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
      const uDoc = await getDoc(doc(db, 'users', data.from));
      return { _id: d.id, ...data, from: { _id: data.from, ...uDoc.data() } };
    }));

    const outgoing = await Promise.all(outgoingSnap.docs.map(async d => {
      const data = d.data();
      const uDoc = await getDoc(doc(db, 'users', data.to));
      return { _id: d.id, ...data, to: { _id: data.to, ...uDoc.data() } };
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
      const d = await getDoc(doc(db, 'users', id));
      return { _id: id, ...d.data() };
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
            const splits = exp.splits || {};
            const myShare = parseFloat(splits[userId] || 0);
            const friendShare = parseFloat(splits[fId] || 0);
            
            if (exp.paidBy === userId) {
              netBalance += friendShare;
              groupSpecificBalance += friendShare;
            }
            if (exp.paidBy === fId) {
              netBalance -= myShare;
              groupSpecificBalance -= myShare;
            }
            
            const isRelevant = exp.paidBy === userId || exp.paidBy === fId || 
                             (exp.participants || []).includes(userId) || 
                             (exp.participants || []).includes(fId);
                             
            if (isRelevant) {
                totalTurnover += parseFloat(exp.amount || 0);
            }
          });

          settlements.forEach(stl => {
            const amt = parseFloat(stl.amount || 0);
            if (stl.from === userId && stl.to === fId) {
              netBalance -= amt;
              groupSpecificBalance -= amt;
            }
            if (stl.from === fId && stl.to === userId) {
              netBalance += amt;
              groupSpecificBalance += amt;
            }
          });

          mutualGroupsEx.push({
            id: group.id,
            title: group.title,
            balance: groupSpecificBalance
          });
        }

        return {
          friend: fData,
          netBalance,
          totalTurnover,
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
      // Check if friends
      const uDoc = await getDoc(doc(db, 'users', userId));
      const friends = uDoc.data()?.friends || [];
      if (friends.includes(targetUserId)) return wrap({ status: 'friend' });

      // Check for pending requests
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
};

export default friendService;
