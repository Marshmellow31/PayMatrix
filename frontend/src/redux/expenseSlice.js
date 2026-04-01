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
    const response = await expenseService.addExpense(groupId, data);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to add expense');
  }
});

export const deleteExpense = createAsyncThunk('expenses/delete', async ({ id, groupId }, thunkAPI) => {
  try {
    await expenseService.deleteExpense(id, groupId);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to delete expense');
  }
});

export const updateExpense = createAsyncThunk('expenses/update', async ({ id, data }, thunkAPI) => {
  try {
    const response = await expenseService.updateExpense(id, data);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to update expense');
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
      state.expenses = action.payload.expenses;
      state.activeGroupId = action.payload.groupId;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.activeGroupId = action.meta.arg.groupId;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        if (action.meta.arg.groupId !== state.activeGroupId) return;
        state.expenses = action.payload.data.expenses || [];
      })
      .addCase(fetchExpenses.rejected, (state, action) => { 
        state.loading = false; 
        state.error = action.payload; 
      })

      .addCase(addExpense.fulfilled, (state, action) => { 
        // We often don't need this if onSnapshot is active, but harmless to update locally
        // state.expenses.unshift(action.payload.expense); 
      })
      .addCase(updateExpense.fulfilled, (state, action) => {
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
      });
  },
});

export const { clearExpenses, clearExpenseError, setExpenses } = expenseSlice.actions;
export default expenseSlice.reducer;
