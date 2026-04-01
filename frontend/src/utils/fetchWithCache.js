// Deprecated fetchWithCache since Firebase handles this natively via IndexedDB
export const fetchWithCache = async (url, thunkAPI, fetchFunction) => {
    try {
        const response = await fetchFunction();
        // Since Firebase SDK already returns the data natively from cache/network,
        // we just fulfill the promise.
        return thunkAPI.fulfillWithValue(response.data);
    } catch (error) {
        return thunkAPI.rejectWithValue(error.message || 'Fetch failed');
    }
};
