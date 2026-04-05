import { db, auth } from '../config/firebase.js';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, arrayUnion, arrayRemove, limit, getDocFromCache, getDocsFromCache
} from 'firebase/firestore';
import loggingService from './loggingService.js';
import rateLimitService from './rateLimitService.js';
import validationService, { GroupSchema } from './validationService.js';
import sanitizationService from './sanitizationService.js';

// Helper to mimic Axios response
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

// In-memory cache for user metadata to speed up repeated expansions offline
const userCache = {};

// Initialize cache from session storage if available
if (typeof window !== 'undefined' && window.sessionStorage) {
  try {
    const storedCache = window.sessionStorage.getItem('paymatrix_user_cache');
    if (storedCache) {
      Object.assign(userCache, JSON.parse(storedCache));
    }
  } catch (err) {
    console.warn("Failed to load user cache from session storage:", err);
  }
}

// Helper to update both in-memory and session storage cache
const updateCache = (uid, userData) => {
  userCache[uid] = userData;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem('paymatrix_user_cache', JSON.stringify(userCache));
    } catch (err) {
      console.warn("Failed to save user cache to session storage:", err);
    }
  }
};

const groupService = {
  // 1. Initial Instant Extraction (Extracts raw IDs and basic document fields)
  getBasicGroup: (groupDoc) => {
    const data = groupDoc.data ? groupDoc.data() : groupDoc;
    return {
      _id: groupDoc.id || data._id,
      ...data,
      members: data.members || [], // Keep as raw UIDs for now
      admin: data.admin || data.createdBy,
      isBasic: true // Flag to indicate profiles aren't resolved yet
    };
  },

  // 2. Profile Resolution (Asynchronously resolves UIDs to user metadata)
  resolveMemberProfiles: async (groupId, memberIds, skipRateLimit = false) => {
    try {
      // Limit profile resolution frequency to prevent address book scraping
      // skipRateLimit is used when called from a bulk operation like getGroups() that already performed the check
      // Rate limit removed by user request

      if (!memberIds || memberIds.length === 0) return [];
      
      const memberPromises = memberIds.map(async (item) => {
        let uid = (item && typeof item === 'object') ? (item.user?._id || item.uid || item._id) : item;
        if (!uid || typeof uid !== 'string' || uid === 'undefined') return null;

        if (userCache[uid]) {
          return { user: { ...userCache[uid], _id: uid }, role: 'member' };
        }
        
        try {
          let uSnap = await getDocFromCache(doc(db, 'users', uid)).catch(() => null);
          if (!uSnap) {
            uSnap = await getDoc(doc(db, 'users', uid)).catch(() => null);
          }

          const uData = uSnap?.exists() ? uSnap.data() : { name: 'Member', email: 'Member' };
          
          // Synthesize standard attributes
          const resolvedUser = { 
            ...uData, 
            _id: uid, 
            uid: uid,
            name: uData.name || uData.displayName || 'Member',
            avatar: uData.avatar || uData.photoURL
          };
          
          updateCache(uid, resolvedUser);
          return { user: resolvedUser, role: 'member' };
        } catch (err) {
          return { user: { _id: uid, uid: uid, name: 'Member' }, role: 'member' };
        }
      });
      
      return (await Promise.all(memberPromises)).filter(Boolean);
    } catch (err) {
      loggingService.logError('groupService', 'resolveMemberProfiles', err);
      throw err;
    }
  },

  // (Legacy support/Direct use)
  expandGroupData: async (groupDoc) => {
    const basic = groupService.getBasicGroup(groupDoc);
    // When expanding individually, we skip the rate limit check here because it's usually 
    // called as part of a bulk operation that already did it, or we want the individual 
    // caller to handle the limit if needed.
    const profiles = await groupService.resolveMemberProfiles(basic._id, basic.members, true);
    return { ...basic, members: profiles, isBasic: false };
  },

  getGroups: async (userId) => {
    if (!userId) throw new Error("Authentication session not found. Please refresh.");
    
    const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
    let querySnapshot;
    try {
      // Fast path: Try cache first ONLY IF online but connection is slow, or offline
      // BUT for high-level group lists, we usually want live data.
      // So we'll try network with a "soft" timeout or fallback.
      querySnapshot = await getDocs(q);
    } catch (err) {
      console.warn("[OFFLINE_FALLBACK] getGroups: fetching from cache");
      querySnapshot = await getDocsFromCache(q).catch(() => ({ docs: [] }));
    }
    
    const allGroups = await Promise.all(querySnapshot.docs.map(doc => groupService.expandGroupData(doc)));
    // Filter out soft-deleted groups from the main dashboard
    const activeGroups = allGroups.filter(g => g.status !== 'deleted');
    return wrap({ groups: activeGroups });
  },

  getPastGroups: async (userId) => {
    if (!userId) throw new Error("Authentication required");
    
    // Fetch from both arrays to handle legacy groups without historicalMembers
    const q1 = query(collection(db, 'groups'), where('historicalMembers', 'array-contains', userId), limit(50));
    const q2 = query(collection(db, 'groups'), where('members', 'array-contains', userId));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    // Deduplicate docs by ID
    const docMap = new Map();
    snap1.docs.forEach(doc => docMap.set(doc.id, doc));
    snap2.docs.forEach(doc => docMap.set(doc.id, doc));
    
    const allDocs = Array.from(docMap.values());
    const allGroups = await Promise.all(allDocs.map(doc => groupService.expandGroupData(doc)));
    
    // A group is "past" if:
    // 1. It is soft-deleted
    // 2. The user is no longer in the active members list (left/removed)
    const pastGroups = allGroups.filter(g => {
      const isActuallyMember = g.members && g.members.some(m => {
        const mid = (m.user?._id || m.uid || m.user || '').toString();
        return mid === userId;
      });
      return g.status === 'deleted' || !isActuallyMember;
    });
    
    return wrap({ groups: pastGroups });
  },

  getMutualGroups: async (userId1, userId2) => {
    if (!userId1 || !userId2) throw new Error("Missing identifiers for shared cohort check");
    
    // Fetch active groups for the first user
    const q = query(
      collection(db, 'groups'), 
      where('members', 'array-contains', userId1),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    const allGroups = await Promise.all(querySnapshot.docs.map(doc => groupService.expandGroupData(doc)));
    
    // Filter for groups where the second user is also a member
    const mutualGroups = allGroups.filter(g => {
      return g.members && g.members.some(m => {
        const mid = (m.user?._id || m.uid || m.user || '').toString();
        return mid === userId2;
      });
    });
    
    return wrap({ groups: mutualGroups });
  },

  getGroup: async (id) => {
    const docRef = doc(db, 'groups', id);
    let docSnap;
    try {
      docSnap = await getDoc(docRef);
    } catch (err) {
      console.warn("[OFFLINE_FALLBACK] getGroup: fetching from cache");
      docSnap = await getDocFromCache(docRef).catch(() => null);
    }

    if (!docSnap || !docSnap.exists()) throw new Error("Group not found");
    
    const group = await groupService.expandGroupData(docSnap);
    return wrap({ group });
  },

  createGroup: async (data, creatorId) => {
    try {
      if (!creatorId) throw new Error("User identifier is required.");
      
      // Rate limit removed by user request

      // 2. Sanitize and Validate
      const cleanData = sanitizationService.sanitizeObject(data);
      // Map title to name if name is missing for Zod and Firestore rules
      if (!cleanData.name && cleanData.title) {
        cleanData.name = cleanData.title;
      }
      const validData = validationService.validate(GroupSchema, cleanData);

      // Extract UIDs if members are passed as objects (compatibility)
      const rawMembers = validData.members || [];
      const sanitizedMemberIds = rawMembers
        .map(m => (m && typeof m === 'object') ? (m._id || m.user?._id || m.uid) : m)
        .filter(m => m && typeof m === 'string' && m !== 'undefined');

      const groupData = {
        ...validData,
        name: validData.name || validData.title, // Standardize to 'name' for Firestore rules
        members: Array.from(new Set([...sanitizedMemberIds, creatorId])).filter(id => id && typeof id === 'string' && id !== 'undefined'),
        historicalMembers: Array.from(new Set([...sanitizedMemberIds, creatorId])).filter(id => id && typeof id === 'string' && id !== 'undefined'),
        admin: creatorId,
        status: 'active',
        inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'groups'), groupData);
      return wrap({ group: { _id: docRef.id, ...groupData } });
    } catch (err) {
      loggingService.logError('createGroup', err);
      throw err;
    }
  },

  updateGroup: async (id, data) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) throw new Error("Auth required");
    
    // Sanitize and Validate
    const cleanData = sanitizationService.sanitizeObject(data);
    if (!cleanData.name && cleanData.title) {
        cleanData.name = cleanData.title;
    }
    const validData = validationService.validate(GroupSchema.partial(), cleanData);

    const docRef = doc(db, 'groups', id);
    await updateDoc(docRef, { ...validData, updatedAt: new Date().toISOString() });
    return wrap({ group: { _id: id, ...validData } });
  },

  deleteGroup: async (id, userId) => {
    try {
      // 1. Balance Safeguard: Prevent deletion if any net balance is non-zero
      const { default: expenseService } = await import('./expenseService.js');
      const balanceRes = await expenseService.getBalances(id);
      const balances = balanceRes.data.data.balances;
      
      const hasPending = Object.values(balances).some(val => Math.abs(val) > 0.01);
      if (hasPending) {
        throw new Error("Cannot delete group with pending settle-ups. Please reconcile all accounts first.");
      }

      // 2. Soft Delete: Update status instead of removing records
      // This allows members to export historical data.
      const docRef = doc(db, 'groups', id);
      await updateDoc(docRef, { 
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return wrap({ message: 'Group archived successfully. Members can still export data from Settings.' });
    } catch (err) {
      console.error("[DELETION_BLOCKED]", err);
      throw err;
    }
  },

  addMember: async (groupId, data) => {
    const docRef = doc(db, 'groups', groupId);
    let userIdToAdd = data.userId;

    // If only email is provided, resolve it to a UID
    if (!userIdToAdd && data.email) {
      const q = query(collection(db, 'users'), where('email', '==', data.email.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("User not found in PayMatrix system. They must sign up first.");
      userIdToAdd = snap.docs[0].id;
    }

    const finalUid = (userIdToAdd && typeof userIdToAdd === 'object') ? (userIdToAdd._id || userIdToAdd.uid) : userIdToAdd;

    if (!finalUid || typeof finalUid !== 'string' || finalUid === 'undefined') throw new Error("Invalid member data provided.");

    await updateDoc(docRef, {
      members: arrayUnion(finalUid),
      historicalMembers: arrayUnion(finalUid)
    });
    
    return wrap({ message: 'Member added successfully' });
  },

  removeMember: async (groupId, userId) => {
    // 1. Balance check
    const { default: expenseService } = await import('./expenseService.js');
    const balanceRes = await expenseService.getBalances(groupId);
    const balance = balanceRes.data.data.balances[userId] || 0;
    
    if (Math.abs(balance) > 0.01) {
      throw new Error("Cannot remove member with a pending balance. Please settle up first.");
    }

    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      members: arrayRemove(userId)
    });
    return wrap({ message: 'Member removed' });
  },

  leaveGroup: async (groupId, userId) => {
    if (!userId) throw new Error("Authentication required");
    
    // 1. Balance check
    const { default: expenseService } = await import('./expenseService.js');
    const balanceRes = await expenseService.getBalances(groupId);
    const balance = balanceRes.data.data.balances[userId] || 0;
    
    if (Math.abs(balance) > 0.01) {
      throw new Error("Cannot leave group with a pending balance. Please settle up first.");
    }

    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      members: arrayRemove(userId)
    });
    return wrap({ message: 'Left group successfully' });
  },

  joinGroupByCode: async (inviteCode, userId) => {
    if (!userId) throw new Error("Authentication session not found. Please log in.");
    if (!inviteCode) throw new Error("Invite code is missing.");

    const normalizedCode = inviteCode.trim().toUpperCase();

    // 1. Find group with this invite code
    const q = query(collection(db, 'groups'), where('inviteCode', '==', normalizedCode), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Invalid or expired invite link. Please ask the group admin for a new link.");
    }

    const groupDoc = snap.docs[0];
    const groupId = groupDoc.id;
    const groupData = groupDoc.data();

    // 2. Check if user is already a member
    if (groupData.members && groupData.members.includes(userId)) {
      return wrap({ groupId }, "You are already a member of this cohort.");
    }

    // 3. Add user to group members and historical members
    await updateDoc(doc(db, 'groups', groupId), {
      members: arrayUnion(userId),
      historicalMembers: arrayUnion(userId)
    });

    return wrap({ groupId }, "Successfully joined the cohort!");
  },
};

export default groupService;
