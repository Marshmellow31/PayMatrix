import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('firebase/firestore', () => ({ getDocs: vi.fn(), getDocsFromCache: vi.fn() }));
import { getDocs, getDocsFromCache } from 'firebase/firestore';
import { getDisplayDocs } from './displayReads.js';

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
describe('display reads', () => {
  it('reads disk without waiting for the network for cached startup', async () => {
    const saved = { docs: [{ id: 'saved' }], empty: false };
    getDocsFromCache.mockResolvedValue(saved);
    expect(await getDisplayDocs('query', { cachedOnly: true })).toBe(saved);
    expect(getDocs).not.toHaveBeenCalled();
  });
  it('returns saved data after the bounded slow-network wait', async () => {
    vi.useFakeTimers();
    getDocs.mockReturnValue(new Promise(() => {}));
    const saved = { docs: [{ id: 'saved' }], empty: false };
    getDocsFromCache.mockResolvedValue(saved);
    const pending = getDisplayDocs('query');
    await vi.advanceTimersByTimeAsync(1500);
    expect(await pending).toBe(saved);
  });
  it('does not invent an empty result when no local data exists', async () => {
    vi.useFakeTimers();
    let complete;
    getDocs.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      })
    );
    getDocsFromCache.mockResolvedValue({ docs: [], empty: true });
    let settled = false;
    const pending = getDisplayDocs('query').then((value) => {
      settled = true;
      return value;
    });
    await vi.advanceTimersByTimeAsync(1500);
    expect(settled).toBe(false);
    const fresh = { docs: [{ id: 'fresh' }] };
    complete(fresh);
    expect(await pending).toBe(fresh);
  });
  it('does not hide permission errors with cached financial data', async () => {
    getDocs.mockRejectedValue(new Error('permission-denied'));
    await expect(getDisplayDocs('query')).rejects.toThrow('permission-denied');
    expect(getDocsFromCache).not.toHaveBeenCalled();
  });
});
