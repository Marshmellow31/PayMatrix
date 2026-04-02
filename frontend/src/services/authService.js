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
      friends: []
    };
    
    if (!userDoc.exists()) {
      userData.createdAt = new Date().toISOString();
      await setDoc(userDocRef, userData);
    } else {
      userData = userDoc.data();
      if (!userData._id) userData._id = user.uid;
      // Auto-backfill nameLowerCase if missing on login
      if (!userData.nameLowerCase && userData.name) {
        userData.nameLowerCase = userData.name.toLowerCase();
        await updateDoc(userDocRef, { nameLowerCase: userData.nameLowerCase });
      }
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
     return { data: { data: { user: userDoc.data() } } }; 
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
    return { data: { data: { user: updatedDoc.data() } } };
  }
};

export default authService;
