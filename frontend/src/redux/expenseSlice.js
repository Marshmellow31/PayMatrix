import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import expenseService from '../services/expenseService.js';

const initialState = {
  expenses: [],
  currentExpense: null,
  pagination: null,
  loading: false,
  error: null,
  activeGroupId: null,
};

export const fetchExpenses = createAsyncThunk('expenses/fetchAll', async ({ groupId, page = 1 }, thunkAPI) => {
  try {
    const response = await expenseService.getExpenses(groupId, page);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to fetch expenses');
  }
});

export const addExpense = createAsyncThunk('expenses/add', async ({ groupId, data }, thunkAPI) => {
  try {
    const userId = thunkAPI.getState().auth.user?.uid || thunkAPI.getState().auth.user?._id;
    const response = await expenseService.addExpense(groupId, data, userId);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to add expense');
  }
});

export const deleteExpense = createAsyncThunk('expenses/delete', async ({ id, groupId }, thunkAPI) => {
  try {
    const userId = thunkAPI.getState().auth.user?.uid || thunkAPI.getState().auth.user?._id;
    await expenseService.deleteExpense(id, groupId, userId);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to delete expense');
  }
});

export const undoDeleteExpense = createAsyncThunk('expenses/restore', async ({ id, groupId }, thunkAPI) => {
  try {
    const userId = thunkAPI.getState().auth.user?.uid || thunkAPI.getState().auth.user?._id;
    await expenseService.restoreExpense(id, groupId, userId);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to restore expense');
  }
});

export const updateExpense = createAsyncThunk('expenses/update', async ({ id, data }, thunkAPI) => {
  try {
    const userId = thunkAPI.getState().auth.user?.uid || thunkAPI.getState().auth.user?._id;
    const response = await expenseService.updateExpense(id, { ...data, admin: userId });
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to update expense');
  }
});

export const deleteSettlement = createAsyncThunk('settlements/delete', async ({ id, groupId }, thunkAPI) => {
  try {
    const userId = thunkAPI.getState().auth.user?.uid || thunkAPI.getState().auth.user?._id;
    await expenseService.deleteSettlement(id, groupId, userId);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to delete settlement');
  }
});

export const undoDeleteSettlement = createAsyncThunk('settlements/restore', async ({ id, groupId }, thunkAPI) => {
  try {
    const userId = thunkAPI.getState().auth.user?.uid || thunkAPI.getState().auth.user?._id;
    await expenseService.restoreSettlement(id, groupId, userId);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to restore settlement');
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
    // New Reducer for Firebase onSnapshot sync
    setExpenses: (state, action) => {
      // Handle either raw array or object with nested expenses/groupId
      if (Array.isArray(action.payload)) {
        state.expenses = action.payload;
      } else {
        state.expenses = action.payload.expenses || [];
        state.activeGroupId = action.payload.groupId;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state, action) => {
        if (state.expenses.length === 0) state.loading = true;
        state.error = null;
        state.activeGroupId = action.meta.arg.groupId;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        if (action.meta.arg.groupId !== state.activeGroupId) return;
        // Correct path for Payload: action.payload.data
        state.expenses = action.payload.data.expenses || [];
      })
      .addCase(fetchExpenses.rejected, (state, action) => { 
        state.loading = false; 
        state.error = action.payload; 
      })

      // NOTE: addExpense and updateExpense are handled exclusively by the
      // onSnapshot listener in GroupDetail to prevent duplicate entries.
      // Only deleteExpense needs a manual reducer since deletion doesn't
      // fire the snapshot in a way that removes the item immediately.
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter(e => e._id !== action.payload);
      })
      .addCase(undoDeleteExpense.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearExpenses, clearExpenseError, setExpenses } = expenseSlice.actions;
export default expenseSlice.reducer;
