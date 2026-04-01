import { db, auth } from '../config/firebase.js';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, arrayUnion, arrayRemove 
} from 'firebase/firestore';

// Helper to mimic Axios response
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

const groupService = {
  getGroups: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    
    // In Firebase, we query groups where the current user is in the members array
    // Assuming members is an array of UIDs for simplicity here.
    const q = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
    const querySnapshot = await getDocs(q);
    
    const groups = querySnapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    return wrap({ groups });
  },

  getGroup: async (id) => {
    const docRef = doc(db, 'groups', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("Group not found");
    return wrap({ group: { _id: docSnap.id, ...docSnap.data() } });
  },

  createGroup: async (data) => {
    const user = auth.currentUser;
    const groupData = {
      ...data,
      members: Array.from(new Set([...(data.members || []), user.uid])), // Ensure creator is memeber
      createdBy: user.uid,
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
    // data.identifier might be an email or UID depending on the new simplified architecture
    // We assume data is the user ID for now
    await updateDoc(docRef, {
      members: arrayUnion(data.userId || data)
    });
    return wrap({ message: 'Member added' });
  },

  removeMember: async (groupId, userId) => {
    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      members: arrayRemove(userId)
    });
    return wrap({ message: 'Member removed' });
  },

  leaveGroup: async (groupId) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    
    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      members: arrayRemove(user.uid)
    });
    return wrap({ message: 'Left group successfully' });
  },
};

export default groupService;
