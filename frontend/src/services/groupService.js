import { db, auth } from '../config/firebase.js';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, arrayUnion, arrayRemove 
} from 'firebase/firestore';

// Helper to mimic Axios response
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

const groupService = {
  // Internal helper to expand UIDs to objects with user details
  expandGroupData: async (groupDoc) => {
    const data = groupDoc.data ? groupDoc.data() : groupDoc;
    const memberIds = data.members || [];
    
    const memberPromises = memberIds.map(async (item) => {
      // Handle both raw UIDs and object structures { user: { _id }, role }
      const uid = (item && typeof item === 'object') ? (item.user?._id || item.uid || item._id) : item;
      
      if (!uid || typeof uid !== 'string') {
        const groupId = groupDoc.id || data._id;
        console.warn(`[DATADOG] Invalid UID found in group members (Group ID: ${groupId}):`, uid);
        return null;
      }

      const uDoc = await getDoc(doc(db, 'users', uid));
      const uData = uDoc.exists() ? uDoc.data() : { _id: uid, uid: uid, name: 'Unknown User' };
      return { user: { ...uData, _id: uid }, role: 'member' };
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
      .filter(m => m && typeof m === 'string');

    const groupData = {
      ...data,
      members: Array.from(new Set([...sanitizedMemberIds, userId])).filter(Boolean), // Ensure creator is member and filter leftovers
      admin: userId,
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

    // Ensure we only store the UID string
    const finalUid = (userIdToAdd && typeof userIdToAdd === 'object') ? (userIdToAdd._id || userIdToAdd.uid) : userIdToAdd;

    if (!finalUid || typeof finalUid !== 'string') throw new Error("Invalid member data provided.");

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
};

export default groupService;
