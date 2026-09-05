import { auth, db } from '../config/firebase.js';
import {
  signInWithPopup,
  signInWithCredential,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  updateProfile as updateFirebaseProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  EmailAuthProvider,
  linkWithCredential,
  reload,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import loggingService from './loggingService.js';
import { isNativeRuntime, signInWithGoogleNative, signOutNative } from '#paymatrix-runtime';
import { serializeFirestoreData } from '../utils/firestoreSerialization.js';

const googleProvider = new GoogleAuthProvider();
const authContinueUrl =
  import.meta.env.VITE_AUTH_CONTINUE_URL || 'https://pay-matrix.vercel.app/login?verified=1';

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

export const needsEmailVerification = (user) => {
  if (!user) return false;
  if (user.emailVerified) return false;
  const providers = Array.isArray(user.providerData) ? user.providerData : [];
  if (
    providers.some(
      (provider) =>
        provider?.providerId === GoogleAuthProvider.PROVIDER_ID ||
        provider?.providerId === 'google.com'
    )
  ) {
    return false;
  }
  return Boolean(
    providers.some(
      (provider) =>
        provider?.providerId === EmailAuthProvider.PROVIDER_ID ||
        provider?.providerId === 'password'
    )
  );
};

export const ensureUserProfile = async (firebaseUser, preferredName = '') => {
  if (!firebaseUser?.uid) throw new Error('Firebase authentication did not return a user.');
  if (needsEmailVerification(firebaseUser)) {
    throw new Error('Verify your email before opening shared data.');
  }
  await firebaseUser.getIdToken(true);

  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const userDoc = await getDoc(userDocRef);
  const resolvedName =
    preferredName.trim() || firebaseUser.displayName?.trim() || userDoc.data()?.name || 'Member';
  const now = new Date().toISOString();
  let userData = {
    _id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: resolvedName,
    displayName: resolvedName,
    nameLowerCase: resolvedName.toLowerCase(),
    photoURL: firebaseUser.photoURL || '',
    avatar: firebaseUser.photoURL || '',
    friends: [],
  };

  if (!userDoc.exists()) {
    userData.createdAt = now;
    await setDoc(userDocRef, userData);
  } else {
    const existingData = serializeFirestoreData(userDoc.data());
    const existingAvatar = existingData.avatar || existingData.photoURL || '';
    const isCustomUpload = existingAvatar.startsWith('https://firebasestorage.googleapis.com/');
    const googlePhoto = firebaseUser.photoURL || '';
    const resolvedAvatar = isCustomUpload ? existingAvatar : googlePhoto || existingAvatar;

    const updates = { updatedAt: now, email: firebaseUser.email || existingData.email || '' };
    if (resolvedAvatar) {
      updates.avatar = resolvedAvatar;
      updates.photoURL = resolvedAvatar;
    }
    if (preferredName.trim() || firebaseUser.displayName) {
      updates.name = resolvedName;
      updates.displayName = resolvedName;
      updates.nameLowerCase = resolvedName.toLowerCase();
    }
    await updateDoc(userDocRef, updates).catch((refreshError) => {
      if (import.meta.env.DEV) console.warn('Profile refresh skipped:', refreshError);
    });
    userData = { ...existingData, ...updates };
    if (!userData.friends) {
      userData.friends = [];
      await updateDoc(userDocRef, { friends: [] }).catch(() => {});
    }
  }

  await ensurePublicProfile(firebaseUser, userData).catch((profileError) => {
    if (import.meta.env.DEV) console.warn('Public profile refresh skipped:', profileError);
  });
  return userData;
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

      // Log successful authentication
      await loggingService.logSecurityEvent('auth/login-success', { email: user.email });
      const userData = await ensureUserProfile(user);

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

  registerWithEmail: async ({ name, email, password }) => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 50) throw new Error('Enter your name (1–50 characters).');
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );
    await updateFirebaseProfile(credential.user, { displayName: cleanName });
    await sendEmailVerification(credential.user, { url: authContinueUrl });
    return { email: credential.user.email, verificationRequired: true };
  },

  signInWithEmail: async ({ email, password }) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await reload(credential.user);
    const user = auth.currentUser;
    if (needsEmailVerification(user)) {
      return { email: user.email, verificationRequired: true };
    }
    const userData = await ensureUserProfile(user);
    await loggingService.logSecurityEvent('auth/login-success', { email: user.email });
    return { user: userData, token: user.accessToken, verificationRequired: false };
  },

  refreshEmailVerification: async () => {
    const user = auth.currentUser;
    if (!user) return { signedOut: true };
    await reload(user);
    const refreshed = auth.currentUser;
    if (needsEmailVerification(refreshed)) {
      return { email: refreshed.email, verificationRequired: true };
    }
    const userData = await ensureUserProfile(refreshed);
    return { user: userData, token: refreshed.accessToken, verificationRequired: false };
  },

  resendEmailVerification: async () => {
    const user = auth.currentUser;
    if (!user || !needsEmailVerification(user)) {
      throw new Error('Sign in with your email and password to request another verification link.');
    }
    await sendEmailVerification(user, { url: authContinueUrl });
    return { email: user.email };
  },

  sendPasswordReset: async (email) => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase(), { url: authContinueUrl });
  },

  linkEmailPassword: async (password) => {
    const user = auth.currentUser;
    if (!user?.email) throw new Error('Sign in before adding an email password.');
    if (
      user.providerData.some((provider) => provider.providerId === EmailAuthProvider.PROVIDER_ID)
    ) {
      throw new Error('Email password is already enabled for this account.');
    }
    await linkWithCredential(user, EmailAuthProvider.credential(user.email, password));
    return true;
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
