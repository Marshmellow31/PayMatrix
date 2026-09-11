import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
export const saveLogCatalogItem = async (kind, item, changes) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to manage accounts and categories.');
  if (!['account', 'category'].includes(kind)) throw new Error('Invalid catalog type.');
  const name = (changes.name ?? item?.name ?? '').trim();
  if (!name || name.length > 50) throw new Error('Use a name between 1 and 50 characters.');
  const archived = changes.archived ?? item?.archived ?? false;
  if (item?.persisted && name === item.name && archived === item.archived) return;
  const id = item?.id || `${kind}_${crypto.randomUUID()}`;
  const reference = doc(db, 'users', uid, 'logCatalog', id);
  const payload = { name, archived, updatedAt: serverTimestamp() };
  if (item?.persisted) await updateDoc(reference, payload);
  else await setDoc(reference, { ...payload, kind, currency: 'INR', createdAt: serverTimestamp() });
};
