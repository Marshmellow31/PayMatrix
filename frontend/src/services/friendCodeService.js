import { db, auth } from '../config/firebase.js';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import friendService from './friendService.js';

// Helper to mimic Axios response
const wrap = (data, message = 'Success') => ({ data: { data, message, status: 'success' } });

// Unambiguous alphabet — no 0/O/1/I to avoid transcription mistakes.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const CODE_REGEX = /^[A-HJ-NP-Z2-9]{8}$/;
const PENDING_KEY = 'pendingFriendCode';

let _ensuring = false;

export const generateCode = () => {
  const bytes = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
};

export const formatFriendCode = (code) => (code ? `${code.slice(0, 4)}-${code.slice(4, 8)}` : '');

export const normalizeCode = (input) => {
  if (!input) return '';
  return input
    .toUpperCase()
    .replace(/^PM-?/, '')
    .replace(/[\s-]/g, '');
};

const friendCodeService = {
  generateCode,
  formatFriendCode,
  normalizeCode,

  /** Lazily backfills a friendCode for the current user. Safe to call on every app load. */
  ensureFriendCode: async (userData) => {
    const uid = auth.currentUser?.uid;
    if (!uid || _ensuring) return;

    _ensuring = true;
    try {
      if (userData?.friendCode) {
        // Best-effort refresh of the mapping's display fields (name/avatar may have changed).
        try {
          await updateDoc(doc(db, 'friendCodes', userData.friendCode), {
            name: (userData.name || userData.displayName || '').slice(0, 50),
            avatar: userData.avatar || userData.photoURL || '',
          });
        } catch (_) {
          // Non-critical — ignore.
        }
        return;
      }

      if (!navigator.onLine) return;

      const name = (userData?.name || userData?.displayName || '').slice(0, 50);
      const avatar = userData?.avatar || userData?.photoURL || '';

      // Recover from a partial failure (mapping written, user doc write failed).
      const pending = localStorage.getItem(PENDING_KEY);
      if (pending) {
        try {
          const pendingSnap = await getDoc(doc(db, 'friendCodes', pending));
          if (pendingSnap.exists() && pendingSnap.data().uid === uid) {
            await updateDoc(doc(db, 'users', uid), { friendCode: pending });
            localStorage.removeItem(PENDING_KEY);
            return;
          }
        } catch (_) {
          // Fall through to generating a fresh code.
        }
        localStorage.removeItem(PENDING_KEY);
      }

      for (let attempt = 0; attempt < 3; attempt++) {
        const code = generateCode();
        try {
          localStorage.setItem(PENDING_KEY, code);
          // eslint-disable-next-line no-await-in-loop
          await setDoc(doc(db, 'friendCodes', code), {
            uid,
            name,
            avatar,
            createdAt: new Date().toISOString(),
          });
          // eslint-disable-next-line no-await-in-loop
          await updateDoc(doc(db, 'users', uid), { friendCode: code });
          localStorage.removeItem(PENDING_KEY);
          return;
        } catch (err) {
          // Collision (doc already exists under another uid) — retry with a new code.
          if (attempt === 2) {
            console.warn('[friendCodeService] Failed to generate a unique friend code:', err);
          }
        }
      }
    } finally {
      _ensuring = false;
    }
  },

  /** Resolves a user-entered code to a profile + relationship status. */
  lookupFriendCode: async (rawInput) => {
    const code = normalizeCode(rawInput);
    if (!CODE_REGEX.test(code)) {
      throw new Error('Invalid code format');
    }

    const mappingSnap = await getDoc(doc(db, 'friendCodes', code));
    if (!mappingSnap.exists()) {
      throw new Error('Code not found');
    }

    const { uid, name, avatar } = mappingSnap.data();
    const myUid = auth.currentUser?.uid;

    if (uid === myUid) {
      return wrap({ uid, name, avatar, status: 'self' });
    }

    const relRes = await friendService.checkRelationship(uid);
    return wrap({ uid, name, avatar, status: relRes.data.data.status });
  },
};

export default friendCodeService;
