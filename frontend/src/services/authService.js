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
import loggingService from './loggingService.js';
import rateLimitService from './rateLimitService.js';

const googleProvider = new GoogleAuthProvider();

const authService = {
  googleAuth: async () => {
    try {
      // Rate limit removed by user request

      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      // Log successful authentication
      await loggingService.logSecurityEvent('auth/login-success', { email: user.email });
    
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
    } catch (error) {
      // Log authentication failure
      await loggingService.logSecurityEvent('auth/login-failure', { 
        code: error.code, 
        message: error.message 
      });
      throw error;
    }
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
    
    // Sanitize data: remove core fields that shouldn't be updated via profile update
    const { uid, email, createdAt, ...sanitizedData } = data;
    
    if (sanitizedData.name) {
      await updateFirebaseProfile(user, { displayName: sanitizedData.name });
    }
    
    const updateData = { ...sanitizedData, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'users', user.uid), updateData);
    
    const updatedDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = updatedDoc.data();
    if (userData.photoURL && !userData.avatar) userData.avatar = userData.photoURL;
    return { data: { data: { user: userData } } };
  }
};

export default authService;
