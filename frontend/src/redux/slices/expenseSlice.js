import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Get balances for a specific group
export const getGroupBalances = createAsyncThunk(
  'expenses/getGroupBalances',
  async (groupId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await fetch(`http://localhost:5000/api/expenses/group/${groupId}/balances`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const initialState = {
  expenses: [],
  groupExpenses: [],
  balances: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Add expense
export const addExpense = createAsyncThunk(
  'expenses/add',
  async (expenseData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(expenseData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Get user's recent expenses
export const getUserExpenses = createAsyncThunk(
  'expenses/getUserExpenses',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await fetch('http://localhost:5000/api/expenses/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Get expenses for a specific group
export const getGroupExpenses = createAsyncThunk(
  'expenses/getGroupExpenses',
  async (groupId, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await fetch(`http://localhost:5000/api/expenses/group/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addExpense.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.expenses.unshift(action.payload);
      })
      .addCase(addExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getUserExpenses.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getUserExpenses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.expenses = action.payload;
      })
      .addCase(getUserExpenses.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getGroupExpenses.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getGroupExpenses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.groupExpenses = action.payload;
      })
      .addCase(getGroupExpenses.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getGroupBalances.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getGroupBalances.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.balances = action.payload;
      })
      .addCase(getGroupBalances.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = expenseSlice.actions;
export default expenseSlice.reducer;
