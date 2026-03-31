import { db } from '../services/db.js';

/**
 * Executes a Stale-While-Revalidate pattern for Redux Async Thunks.
 * - If OFFLINE: serve from IndexedDB cache only → single dispatch, no animation stutter.
 * - If ONLINE: serve cache instantly, then silently revalidate in background.
 *
 * @param {string} cacheKey - The unique URL to cache (e.g., '/groups').
 * @param {object} thunkAPI - The thunkAPI object provided by createAsyncThunk.
 * @param {function} apiCall - A function returning a Promise from Axios.
 * @returns {Promise<any>} The payload, triggering the /fulfilled reducer.
 */
export const fetchWithCache = async (cacheKey, thunkAPI, apiCall) => {
    // 1. Read from IndexedDB Cache
    let cached = null;
    try {
        cached = await db.apiCache.get(cacheKey);
    } catch (e) {
        console.error('[SWR] Error reading cache', e);
    }

    // 2. OFFLINE MODE: serve cache once and stop. No second dispatch = no animation stutter.
    if (!navigator.onLine) {
        if (cached) {
            console.log(`[SWR Offline]: Serving "${cacheKey}" from cache.`);
            return cached.data; // ← single clean return, triggers fulfilled once
        }
        return thunkAPI.rejectWithValue('Offline and no cached data available');
    }

    // 3. ONLINE MODE: dispatch cache hit immediately for instant UI, then revalidate.
    if (cached) {
        console.log(`[SWR Cache Hit]: "${cacheKey}" — rendering instantly.`);
        thunkAPI.dispatch({ type: thunkAPI.type + '/fulfilled', payload: cached.data });
    }

    // 4. Network Fetch (Revalidate)
    try {
        const response = await apiCall();
        const payload = response.data?.data || response.data;

        // 5. Update IndexedDB Cache with fresh data
        await db.apiCache.put({ url: cacheKey, data: payload, timestamp: Date.now() });
        return payload;
    } catch (e) {
        return thunkAPI.rejectWithValue(e.response?.data?.message || e.message || 'Fetch failed');
    }
};
