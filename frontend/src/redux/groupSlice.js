import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import groupService from '../services/groupService.js';

const initialState = {
  groups: [],
  currentGroup: null,
  loading: false,
  error: null,
};

export const fetchGroups = createAsyncThunk('groups/fetchAll', async (_, thunkAPI) => {
  try {
    const userId = thunkAPI.getState().auth.user?.uid || thunkAPI.getState().auth.user?._id;
    const response = await groupService.getGroups(userId);
    return response.data; // This is { data: { groups: [...] } } from the wrap() helper
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to fetch groups');
  }
});

export const fetchGroup = createAsyncThunk('groups/fetchOne', async (id, thunkAPI) => {
  try {
    const response = await groupService.getGroup(id);
    return response.data; // This is { data: { group: {...} } }
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to fetch group');
  }
});

export const createGroup = createAsyncThunk('groups/create', async (data, thunkAPI) => {
  try {
    const userId = thunkAPI.getState().auth.user?.uid || thunkAPI.getState().auth.user?._id;
    const response = await groupService.createGroup(data, userId);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to create group');
  }
});

export const deleteGroup = createAsyncThunk('groups/delete', async (id, thunkAPI) => {
  try {
    await groupService.deleteGroup(id);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to delete group');
  }
});

const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    clearCurrentGroup: (state) => {
      state.currentGroup = null;
    },
    clearGroupError: (state) => {
      state.error = null;
    },
    setGroups: (state, action) => {
      state.groups = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => { 
        if (state.groups.length === 0) state.loading = true; 
        state.error = null; 
      })
      .addCase(fetchGroups.fulfilled, (state, action) => { 
        state.loading = false; 
        // Correct path for Payload: action.payload.data
        state.groups = action.payload.data.groups || []; 
      })
      .addCase(fetchGroups.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchGroup.pending, (state) => { 
        if (!state.currentGroup) state.loading = true; 
      })
      .addCase(fetchGroup.fulfilled, (state, action) => { 
        state.loading = false; 
        state.currentGroup = action.payload.data.group; 
      })
      .addCase(fetchGroup.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createGroup.fulfilled, (state, action) => { state.groups.unshift(action.payload.group); })
      .addCase(deleteGroup.fulfilled, (state, action) => { state.groups = state.groups.filter((g) => g._id !== action.payload); });
  },
});

export const { clearCurrentGroup, clearGroupError, setGroups } = groupSlice.actions;
export default groupSlice.reducer;
