import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import expenseService from '../services/expenseService.js';
import { fetchWithCache } from '../utils/fetchWithCache.js';
import { getPendingOperations } from '../services/db.js';

const initialState = {
  expenses: [],
  currentExpense: null,
  pagination: null,
  loading: false,
  error: null,
  activeGroupId: null, // Guard against cross-group SWR cache bleed
};

export const fetchExpenses = createAsyncThunk('expenses/fetchAll', async ({ groupId, page = 1 }, thunkAPI) => {
  return fetchWithCache(
    `/groups/${groupId}/expenses?page=${page}`,
    thunkAPI,
    () => expenseService.getExpenses(groupId, page)
  );
});

/**
 * On PWA restart, Redux is empty. This thunk reads the persisted
 * operationQueue from IndexedDB and re-injects any pending offline
 * create-expense operations as placeholder items so they're visible
 * before the sync completes.
 */
export const hydrateOfflineExpenses = createAsyncThunk(
  'expenses/hydrateOffline',
  async (groupId) => {
    const pending = await getPendingOperations();
    const offlineExpenses = pending
      .filter(op => op.type === 'create' && op.entity === 'expense' && op.status !== 'failed')
      .filter(op => !groupId || op.payload?.groupId === groupId)
      .map(op => ({
        ...op.payload,
        _id: op.operation_id,
        offline: true,
      }));
    return { offlineExpenses };
  }
);

export const addExpense = createAsyncThunk('expenses/add', async ({ groupId, data }, thunkAPI) => {
  try {
    const response = await expenseService.addExpense(groupId, data);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to add expense');
  }
});

export const deleteExpense = createAsyncThunk('expenses/delete', async (id, thunkAPI) => {
  try {
    await expenseService.deleteExpense(id);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to delete expense');
  }
});

export const restoreExpense = createAsyncThunk('expenses/restore', async (id, thunkAPI) => {
  try {
    const response = await expenseService.restoreExpense(id);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to restore expense');
  }
});

export const updateExpense = createAsyncThunk('expenses/update', async ({ id, data }, thunkAPI) => {
  try {
    const response = await expenseService.updateExpense(id, data);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to update expense');
  }
});

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    clearExpenses: (state) => {
      state.expenses = [];
      state.pagination = null;
      state.activeGroupId = null;
    },
    clearExpenseError: (state) => {
      state.error = null;
    },
    // Called by SyncManager after a successful sync to remove the offline placeholder
    removeOfflineExpense: (state, action) => {
      const operationId = action.payload;
      state.expenses = state.expenses.filter(e => e._id !== operationId);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Track the group being fetched so we can reject stale SWR dispatches
        state.activeGroupId = action.meta.arg.groupId;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        // Guard: ignore this fulfillment if we've since navigated to a different group.
        // fetchWithCache dispatches fulfilled twice (cache + network), both for the same
        // group — so this guard only fires if a stale cross-group dispatch somehow arrives.
        if (action.meta.arg.groupId !== state.activeGroupId) return;

        // Replace state with server/cache data, stripping any offline placeholders
        const serverExpenses = (action.payload.expenses || []).filter(e => !e.offline);
        // Preserve any pending offline placeholders that haven't synced yet
        const offlinePlaceholders = state.expenses.filter(e => e.offline);
        // Merge: offline placeholders go to top, then real server data (deduped by _id)
        const serverIds = new Set(serverExpenses.map(e => e._id));
        const uniqueOffline = offlinePlaceholders.filter(e => !serverIds.has(e._id));
        state.expenses = [...uniqueOffline, ...serverExpenses];
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchExpenses.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      // Hydrate offline expenses on PWA restart
      .addCase(hydrateOfflineExpenses.fulfilled, (state, action) => {
        const { offlineExpenses } = action.payload;
        if (!offlineExpenses?.length) return;
        // Deduplicate: only add if not already present
        const existingIds = new Set(state.expenses.map(e => e._id));
        const newOffline = offlineExpenses.filter(e => !existingIds.has(e._id));
        if (newOffline.length > 0) {
          state.expenses = [...newOffline, ...state.expenses];
        }
      })

      .addCase(addExpense.fulfilled, (state, action) => { state.expenses.unshift(action.payload.expense); })
      .addCase(updateExpense.fulfilled, (state, action) => {
        const index = state.expenses.findIndex(e => e._id === action.payload.expense._id);
        if (index !== -1) {
          state.expenses[index] = action.payload.expense;
        }
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter((e) => e._id !== action.payload);
      })
      .addCase(restoreExpense.fulfilled, (state, action) => {
        state.expenses.unshift(action.payload.expense);
      });
  },
});

export const { clearExpenses, clearExpenseError, removeOfflineExpense } = expenseSlice.actions;
export default expenseSlice.reducer;
