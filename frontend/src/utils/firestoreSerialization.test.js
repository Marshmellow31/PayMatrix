import { describe, expect, it } from 'vitest';
import { serializeFirestoreData } from './firestoreSerialization.js';

const timestamp = (iso) => {
  const date = new Date(iso);
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date,
  };
};

describe('serializeFirestoreData', () => {
  it('recursively converts Firestore timestamps and dates to ISO strings', () => {
    const input = {
      updatedAt: timestamp('2026-08-23T12:00:00.000Z'),
      members: [{ user: { createdAt: new Date('2026-08-22T08:30:00.000Z') } }],
    };

    expect(serializeFirestoreData(input)).toEqual({
      updatedAt: '2026-08-23T12:00:00.000Z',
      members: [{ user: { createdAt: '2026-08-22T08:30:00.000Z' } }],
    });
  });

  it('returns new plain containers without mutating the source', () => {
    const input = { nested: { values: [timestamp('2026-08-23T12:00:00.000Z')] } };
    const result = serializeFirestoreData(input);

    expect(result).not.toBe(input);
    expect(result.nested).not.toBe(input.nested);
    expect(typeof input.nested.values[0].toDate).toBe('function');
  });
});
