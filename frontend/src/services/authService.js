import { auth, db } from '../config/firebase.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

const authService = {
  googleAuth: async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    let userData = { 
      _id: user.uid, 
      uid: user.uid, 
      email: user.email, 
      name: user.displayName, 
      nameLowerCase: user.displayName?.toLowerCase(),
      photoURL: user.photoURL,
      avatar: user.photoURL,
      friends: []
    };
    
    if (!userDoc.exists()) {
      userData.createdAt = new Date().toISOString();
      await setDoc(userDocRef, userData);
    } else {
      const existingData = userDoc.data();
      // Update with latest Google Profile data if it changed
      const updates = {};
      if (user.photoURL && existingData.avatar !== user.photoURL) {
        updates.avatar = user.photoURL;
        updates.photoURL = user.photoURL;
      }
      if (user.displayName && existingData.name !== user.displayName) {
        updates.name = user.displayName;
        updates.nameLowerCase = user.displayName.toLowerCase();
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(userDocRef, updates);
        userData = { ...existingData, ...updates };
      } else {
        userData = existingData;
      }

      // Ensure friends array exists
      if (!userData.friends) {
        userData.friends = [];
        await updateDoc(userDocRef, { friends: [] });
      }
    }
    
    return { user: userData, token: user.accessToken };
  },
  
  getMe: async () => {
     const user = auth.currentUser;
     if (!user) throw new Error("Authentication session expired. Please sign in again.");
     const userDoc = await getDoc(doc(db, 'users', user.uid));
     if (!userDoc.exists()) throw new Error("User document not found");
     const userData = userDoc.data();
     if (userData.photoURL && !userData.avatar) userData.avatar = userData.photoURL;
     return { data: { data: { user: userData } } }; 
  },
  
  updateProfile: async (data) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required to update profile.");
    
    if (data.name) {
      await updateFirebaseProfile(user, { displayName: data.name });
    }
    
    const updateData = { ...data, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'users', user.uid), updateData);
    
    const updatedDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = updatedDoc.data();
    if (userData.photoURL && !userData.avatar) userData.avatar = userData.photoURL;
    return { data: { data: { user: userData } } };
  }
};

export default authService;
