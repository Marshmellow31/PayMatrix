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
  register: async (data) => {
    const { email, password, name } = data;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateFirebaseProfile(user, { displayName: name });
    
    // Save to Firestore 'users' collection
    const userData = {
      _id: user.uid, // Alias for legacy compatibility
      uid: user.uid,
      name: name,
      nameLowerCase: name?.toLowerCase(),
      email: email,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', user.uid), userData);
    
    return { user: userData, token: user.accessToken };
  },
  
  login: async (data) => {
    const { email, password } = data;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : { _id: user.uid, uid: user.uid, email, name: user.displayName };
    if (!userData._id) userData._id = user.uid; // Migration check
    
    return { user: userData, token: user.accessToken };
  },
  
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
      photoURL: user.photoURL 
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
  },
  
  forgotPassword: async (data) => {
    await sendPasswordResetEmail(auth, data.email);
    return { data: { status: "success" } };
  }
};

export default authService;
