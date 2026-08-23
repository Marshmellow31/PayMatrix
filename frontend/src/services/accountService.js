import {
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import { isNativeRuntime, signInWithGoogleNative } from '#paymatrix-runtime';
import fcmService from './fcmService.js';

const reauthenticate = async (user) => {
  if (isNativeRuntime()) {
    const result = await signInWithGoogleNative();
    const credential = GoogleAuthProvider.credential(
      result.credential?.idToken,
      result.credential?.accessToken || null
    );
    await reauthenticateWithCredential(user, credential);
    return;
  }
  await reauthenticateWithPopup(user, new GoogleAuthProvider());
};

const downloadJson = (data, filename) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const accountService = {
  exportMyData: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in before exporting your data.');

    const [profile, publicProfile, groupsSnapshot] = await Promise.all([
      getDoc(doc(db, 'users', user.uid)),
      getDoc(doc(db, 'publicProfiles', user.uid)),
      getDocs(
        query(collection(db, 'groups'), where('historicalMembers', 'array-contains', user.uid))
      ),
    ]);

    const groups = await Promise.all(
      groupsSnapshot.docs.map(async (groupDocument) => {
        const groupId = groupDocument.id;
        const [expenses, settlements, logs] = await Promise.all([
          getDocs(collection(db, 'groups', groupId, 'expenses')),
          getDocs(collection(db, 'groups', groupId, 'settlements')),
          getDocs(collection(db, 'groups', groupId, 'logs')),
        ]);
        return {
          id: groupId,
          ...groupDocument.data(),
          expenses: expenses.docs.map((item) => ({ id: item.id, ...item.data() })),
          settlements: settlements.docs.map((item) => ({ id: item.id, ...item.data() })),
          auditLog: logs.docs.map((item) => ({ id: item.id, ...item.data() })),
        };
      })
    );

    downloadJson(
      {
        exportedAt: new Date().toISOString(),
        profile: profile.exists() ? profile.data() : null,
        publicProfile: publicProfile.exists() ? publicProfile.data() : null,
        groups,
      },
      `paymatrix-data-${new Date().toISOString().slice(0, 10)}.json`
    );
  },

  deleteMyAccount: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in before deleting your account.');
    await reauthenticate(user);
    await fcmService.deleteToken();

    const userRef = doc(db, 'users', user.uid);
    const deletionRef = doc(db, 'accountDeletionRequests', user.uid);
    const existingDeletion = await getDoc(deletionRef);

    if (!existingDeletion.exists()) {
      const profile = await getDoc(userRef);
      const batch = writeBatch(db);
      batch.set(userRef, {
        uid: user.uid,
        name: 'Deleted user',
        displayName: 'Deleted user',
        nameLowerCase: 'deleted user',
        avatar: '',
        photoURL: '',
        friends: [],
        deletedAt: serverTimestamp(),
        deletionStatus: 'anonymized',
      });
      batch.set(doc(db, 'publicProfiles', user.uid), {
        name: 'Deleted user',
        avatar: '',
        updatedAt: serverTimestamp(),
        deleted: true,
      });
      batch.set(deletionRef, {
        uidHashVersion: 1,
        status: 'anonymized',
        requestedAt: serverTimestamp(),
        deleteAfter: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      const friendCode = profile.data()?.friendCode;
      if (friendCode) batch.delete(doc(db, 'friendCodes', friendCode));
      await batch.commit();
    }

    await deleteUser(user);
  },
};

export default accountService;
