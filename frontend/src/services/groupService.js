import { db, auth } from '../config/firebase.js';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, arrayUnion, arrayRemove 
} from 'firebase/firestore';

// Helper to mimic Axios response
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

// In-memory cache for user metadata to speed up repeated expansions offline
const userCache = {};

const groupService = {
  // Internal helper to expand UIDs to objects with user details
  expandGroupData: async (groupDoc) => {
    const data = groupDoc.data ? groupDoc.data() : groupDoc;
    const memberIds = data.members || [];
    
    const memberPromises = memberIds.map(async (item) => {
      // 1. Resolve UID (handle raw strings, objects {user:{_id}}, or legacy keys)
      let uid = (item && typeof item === 'object') ? (item.user?._id || item.uid || item._id) : item;
      
      // 2. Strict validation: Must be a non-empty string
      if (!uid || typeof uid !== 'string' || uid === 'undefined') {
        const groupId = groupDoc.id || data._id;
        console.warn(`[DATADOG] Skipping invalid member ID in group ${groupId}:`, uid);
        return null;
      }

      // 3. Check memory cache for performance
      if (userCache[uid]) {
        return { user: { ...userCache[uid], _id: uid }, role: 'member' };
      }
      
      try {
        // 4. Fetch from Firestore
        const uDoc = await getDoc(doc(db, 'users', uid));
        const uData = uDoc.exists() ? uDoc.data() : { name: 'Cohort Member', email: 'Member' };
        
        const resolvedUser = { ...uData, _id: uid, uid: uid };
        userCache[uid] = resolvedUser;
        return { user: resolvedUser, role: 'member' };
      } catch (err) {
        // Log specific error but don't crash — fallback to skeleton data
        console.warn(`Fallback for user ${uid} (likely permission or missing doc):`, err.code || err.message);
        return { user: { _id: uid, uid: uid, name: 'Member' }, role: 'member' };
      }
    });
    
    const expandedMembers = (await Promise.all(memberPromises)).filter(Boolean);
    return { 
      _id: groupDoc.id || data._id, 
      ...data, 
      members: expandedMembers,
      admin: data.admin || data.createdBy 
    };
  },

  getGroups: async (userId) => {
    if (!userId) throw new Error("Authentication session not found. Please refresh.");
    
    const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
    const querySnapshot = await getDocs(q);
    
    const groups = await Promise.all(querySnapshot.docs.map(doc => groupService.expandGroupData(doc)));
    return wrap({ groups });
  },

  getGroup: async (id) => {
    const docRef = doc(db, 'groups', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("Group not found");
    
    const group = await groupService.expandGroupData(docSnap);
    return wrap({ group });
  },

  createGroup: async (data, userId) => {
    if (!userId) throw new Error("Identifier missing. Please sign in again.");
    
    // Sanitize members: extract UIDs if they are objects and ensure they are strings
    const rawMembers = data.members || [];
    const sanitizedMemberIds = rawMembers
      .map(m => (m && typeof m === 'object') ? (m._id || m.user?._id || m.uid) : m)
      .filter(m => m && typeof m === 'string' && m !== 'undefined');

    const groupData = {
      ...data,
      members: Array.from(new Set([...sanitizedMemberIds, userId])).filter(id => id && typeof id === 'string' && id !== 'undefined'),
      admin: userId,
      inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(), // Generate short unique invite code
      createdAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, 'groups'), groupData);
    return wrap({ group: { _id: docRef.id, ...groupData } });
  },

  updateGroup: async (id, data) => {
    const docRef = doc(db, 'groups', id);
    await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    return wrap({ group: { _id: id, ...data } });
  },

  deleteGroup: async (id) => {
    await deleteDoc(doc(db, 'groups', id));
    return wrap({ message: 'Group deleted successfully' });
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
      members: arrayUnion(finalUid)
    });
    
    return wrap({ message: 'Member added successfully' });
  },

  removeMember: async (groupId, userId) => {
    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      members: arrayRemove(userId)
    });
    return wrap({ message: 'Member removed' });
  },

  leaveGroup: async (groupId, userId) => {
    if (!userId) throw new Error("Authentication required");
    
    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      members: arrayRemove(userId)
    });
    return wrap({ message: 'Left group successfully' });
  },

  joinGroupByCode: async (inviteCode, userId) => {
    if (!userId) throw new Error("Authentication session not found. Please log in.");
    if (!inviteCode) throw new Error("Invite code is missing.");

    // 1. Find group with this invite code
    const q = query(collection(db, 'groups'), where('inviteCode', '==', inviteCode.toUpperCase()));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Invalid or expired invite link.");
    }

    const groupDoc = snap.docs[0];
    const groupId = groupDoc.id;
    const groupData = groupDoc.data();

    // 2. Check if user is already a member
    if (groupData.members && groupData.members.includes(userId)) {
      return wrap({ groupId }, "You are already a member of this cohort.");
    }

    // 3. Add user to group members
    await updateDoc(doc(db, 'groups', groupId), {
      members: arrayUnion(userId)
    });

    return wrap({ groupId }, "Successfully joined the cohort!");
  },
};

export default groupService;
