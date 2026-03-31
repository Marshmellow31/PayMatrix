import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import expenseService from '../services/expenseService.js';
import { fetchWithCache } from '../utils/fetchWithCache.js';

const initialState = {
  expenses: [],
  currentExpense: null,
  pagination: null,
  loading: false,
  error: null,
};

export const fetchExpenses = createAsyncThunk('expenses/fetchAll', async ({ groupId, page = 1 }, thunkAPI) => {
  return fetchWithCache(
    `/groups/${groupId}/expenses?page=${page}`,
    thunkAPI,
    () => expenseService.getExpenses(groupId, page)
  );
});

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
      .addCase(fetchExpenses.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        // Replace state with server data, stripping any offline placeholders (offline: true)
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
