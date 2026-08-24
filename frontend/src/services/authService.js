import { auth, db } from '../config/firebase.js';
import {
  signInWithPopup,
  signInWithCredential,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import loggingService from './loggingService.js';
import { isNativeRuntime, signInWithGoogleNative, signOutNative } from '#paymatrix-runtime';
import { serializeFirestoreData } from '../utils/firestoreSerialization.js';

const googleProvider = new GoogleAuthProvider();

const isAllowedProfileAvatar = (value) =>
  !value ||
  /^https:\/\/(firebasestorage\.googleapis\.com|lh3\.googleusercontent\.com)\//.test(value);

export const ensurePublicProfile = async (firebaseUser, storedProfile = {}) => {
  if (!firebaseUser?.uid) return;
  const isAnonymized = storedProfile.deletionStatus === 'anonymized';
  await setDoc(
    doc(db, 'publicProfiles', firebaseUser.uid),
    {
      name: isAnonymized
        ? 'Deleted user'
        : storedProfile.name || storedProfile.displayName || firebaseUser.displayName || 'Member',
      avatar: isAnonymized
        ? ''
        : [storedProfile.avatar, storedProfile.photoURL, firebaseUser.photoURL].find(
            (candidate) => candidate && isAllowedProfileAvatar(candidate)
          ) || '',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
};

const authService = {
  googleAuth: async () => {
    try {
      let userCredential;

      if (isNativeRuntime()) {
        const nativeResult = await signInWithGoogleNative();
        const nativeCredential = nativeResult.credential;
        if (!nativeCredential?.idToken) {
          throw new Error(
            'Google did not return an identity token. Check the Android Firebase configuration.'
          );
        }

        const credential = GoogleAuthProvider.credential(
          nativeCredential.idToken,
          nativeCredential.accessToken || null
        );
        userCredential = await signInWithCredential(auth, credential);
      } else {
        userCredential = await signInWithPopup(auth, googleProvider);
      }

      let user = userCredential.user;

      // Force-reload to get the absolute latest Google profile data
      // (photoURL can be null on the initial token until refreshed)
      await user.reload().catch(() => {});
      user = auth.currentUser; // Re-read after reload

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      // Log successful authentication
      await loggingService.logSecurityEvent('auth/login-success', { email: user.email });

      let userData = {
        _id: user.uid,
        uid: user.uid,
        email: user.email,
        name: user.displayName || 'Member',
        displayName: user.displayName || '',
        nameLowerCase: user.displayName?.toLowerCase(),
        photoURL: user.photoURL || '',
        avatar: user.photoURL || '',
        friends: [],
      };

      if (!userDoc.exists()) {
        userData.createdAt = new Date().toISOString();
        await setDoc(userDocRef, userData);
      } else {
        const existingData = serializeFirestoreData(userDoc.data());

        // Always write avatar + photoURL on every login — this ensures
        // that users whose avatar was never stored (or was null due to
        // a stale Google token at first login) get fixed automatically.
        const updates = {
          updatedAt: new Date().toISOString(),
        };
        if (user.photoURL) {
          updates.avatar = user.photoURL;
          updates.photoURL = user.photoURL;
        }
        if (user.displayName) {
          updates.name = user.displayName;
          updates.nameLowerCase = user.displayName.toLowerCase();
        }

        // Profile refresh is maintenance, not authentication. Legacy accounts
        // may contain values rejected by newer validation rules, and a flaky
        // refresh must never turn a valid Firebase session into "login failed".
        await updateDoc(userDocRef, updates).catch((refreshError) => {
          if (import.meta.env.DEV) console.warn('Profile refresh skipped:', refreshError);
        });
        userData = { ...existingData, ...updates };

        // Ensure friends array exists
        if (!userData.friends) {
          userData.friends = [];
          await updateDoc(userDocRef, { friends: [] }).catch(() => {});
        }
      }

      await ensurePublicProfile(user, userData).catch((profileError) => {
        if (import.meta.env.DEV) console.warn('Public profile refresh skipped:', profileError);
      });

      return { user: userData, token: user.accessToken };
    } catch (error) {
      // Log authentication failure
      await loggingService.logSecurityEvent('auth/login-failure', {
        code: error.code,
        message: error.message,
      });
      throw error;
    }
  },

  signOut: async () => {
    if (isNativeRuntime()) {
      await signOutNative().catch(() => {});
    }
    await firebaseSignOut(auth);
  },

  getMe: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication session expired. Please sign in again.');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User document not found');
    const userData = serializeFirestoreData(userDoc.data());
    if (userData.photoURL && !userData.avatar) userData.avatar = userData.photoURL;
    return { data: { data: { user: userData } } };
  },

  updateProfile: async (data) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required to update profile.');

    // Sanitize data: remove core fields that shouldn't be updated via profile update
    const { uid: _uid, email: _email, createdAt: _createdAt, ...sanitizedData } = data;

    if (sanitizedData.name) {
      await updateFirebaseProfile(user, { displayName: sanitizedData.name });
    }

    const updateData = { ...sanitizedData, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'users', user.uid), updateData);
    if ('name' in sanitizedData || 'avatar' in sanitizedData || 'photoURL' in sanitizedData) {
      await setDoc(
        doc(db, 'publicProfiles', user.uid),
        {
          name: sanitizedData.name || user.displayName || 'Member',
          avatar: sanitizedData.avatar || sanitizedData.photoURL || user.photoURL || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    const updatedDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = serializeFirestoreData(updatedDoc.data());
    if (userData.photoURL && !userData.avatar) userData.avatar = userData.photoURL;
    return { data: { data: { user: userData } } };
  },
};

export default authService;
