const isFirestoreTimestamp = (value) =>
  value &&
  typeof value === 'object' &&
  typeof value.seconds === 'number' &&
  typeof value.nanoseconds === 'number' &&
  typeof value.toDate === 'function';

/**
 * Convert Firestore SDK values into plain JSON-compatible data before they
 * cross into Redux, React state, or offline persistence.
 */
export const serializeFirestoreData = (value, seen = new WeakSet()) => {
  if (value == null || typeof value !== 'object') return value;

  if (value instanceof Date) return value.toISOString();
  if (isFirestoreTimestamp(value)) return value.toDate().toISOString();

  // A locally-created serverTimestamp() sentinel can be returned by a write
  // helper before the snapshot containing the authoritative server time arrives.
  if (value._methodName === 'serverTimestamp') return new Date().toISOString();

  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => serializeFirestoreData(item, seen));
  }

  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries(), ([key, item]) => [key, serializeFirestoreData(item, seen)])
    );
  }

  if (value instanceof Set) {
    return Array.from(value, (item) => serializeFirestoreData(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, serializeFirestoreData(item, seen)])
  );
};

export default serializeFirestoreData;
