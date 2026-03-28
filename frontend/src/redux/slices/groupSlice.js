import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
  groups: [],
  activeGroup: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Create a new group
export const createGroup = createAsyncThunk(
  'groups/create',
  async (groupData, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await fetch('http://localhost:5000/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(groupData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Get user's groups
export const getGroups = createAsyncThunk(
  'groups/getAll',
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.user.token;
      const response = await fetch('http://localhost:5000/api/groups', {
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

export const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    setActiveGroup: (state, action) => {
      state.activeGroup = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createGroup.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.groups.push(action.payload);
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getGroups.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getGroups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.groups = action.payload;
      })
      .addCase(getGroups.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset, setActiveGroup } = groupSlice.actions;
export default groupSlice.reducer;
