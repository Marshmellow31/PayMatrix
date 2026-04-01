import { db, auth } from '../config/firebase.js';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, arrayUnion, arrayRemove 
} from 'firebase/firestore';

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
      // 1. Get friends
      const uDoc = await getDoc(doc(db, 'users', userId));
      const friendIds = uDoc.data()?.friends || [];
      if (friendIds.length === 0) return wrap({ networkAnalytics: [] });

      // 2. Get all groups user is in
      const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
      const groupSnap = await getDocs(q);
      const myGroups = groupSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const { computeGroupBalances } = await import('../utils/balanceEngine.js');
      
      const networkAnalytics = await Promise.all(friendIds.map(async fId => {
        const fDoc = await getDoc(doc(db, 'users', fId));
        const fData = { _id: fId, ...(fDoc.exists() ? fDoc.data() : { name: 'Unknown' }) };

        // Find mutual groups
        const mutualGroups = myGroups.filter(g => g.members?.includes(fId));
        
        let netBalance = 0;
        let totalTurnover = 0;

        for (const group of mutualGroups) {
          const [expSnap, stlSnap] = await Promise.all([
            getDocs(collection(db, 'groups', group.id, 'expenses')),
            getDocs(collection(db, 'groups', group.id, 'settlements'))
          ]);

          const expenses = expSnap.docs.map(d => d.data());
          const settlements = stlSnap.docs.map(d => d.data());
          
          // Calculate net balance between me and this friend in this group
          // This requires a more specific calculation from balanceEngine if available,
          // but for now we can approximate by seeing how much I owe/am owed globally in this group 
          // and attributing it if it's a 1-on-1 interaction.
          // Better: Calculate mutual debt specifically.
          
          expenses.forEach(exp => {
            const myShare = exp.splits?.[userId] || 0;
            const friendShare = exp.splits?.[fId] || 0;
            
            if (exp.paidBy === userId) netBalance += friendShare;
            if (exp.paidBy === fId) netBalance -= myShare;
            
            if (exp.paidBy === userId || exp.paidBy === fId || exp.participants?.includes(userId) || exp.participants?.includes(fId)) {
                totalTurnover += parseFloat(exp.amount || 0);
            }
          });

          settlements.forEach(stl => {
            if (stl.from === userId && stl.to === fId) netBalance -= parseFloat(stl.amount || 0);
            if (stl.from === fId && stl.to === userId) netBalance += parseFloat(stl.amount || 0);
          });
        }

        return {
          friend: fData,
          netBalance,
          totalTurnover,
          mutualGroupsCount: mutualGroups.length
        };
      }));

      return wrap({ networkAnalytics: networkAnalytics.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance)) });
    } catch (error) {
      console.error("Network analytics error:", error);
      return wrap({ networkAnalytics: [] });
    }
  },
  
  getFriendAnalytics: async (friendId) => {
    return wrap({ analytics: {} });
  },
};

export default friendService;
