import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import groupService from '../services/groupService.js';
import { fetchWithCache } from '../utils/fetchWithCache.js';

const initialState = {
  groups: [],
  currentGroup: null,
  loading: false,
  error: null,
};

export const fetchGroups = createAsyncThunk('groups/fetchAll', async (_, thunkAPI) => {
  return fetchWithCache(
    '/groups', 
    thunkAPI, 
    () => groupService.getGroups()
  );
});

export const fetchGroup = createAsyncThunk('groups/fetchOne', async (id, thunkAPI) => {
  return fetchWithCache(
    `/groups/${id}`, 
    thunkAPI, 
    () => groupService.getGroup(id)
  );
});

export const createGroup = createAsyncThunk('groups/create', async (data, thunkAPI) => {
  try {
    const response = await groupService.createGroup(data);
    return response.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to create group');
  }
});

export const deleteGroup = createAsyncThunk('groups/delete', async (id, thunkAPI) => {
  try {
    await groupService.deleteGroup(id);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to delete group');
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchGroups.fulfilled, (state, action) => { state.loading = false; state.groups = action.payload.groups; })
      .addCase(fetchGroups.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchGroup.pending, (state) => { state.loading = true; })
      .addCase(fetchGroup.fulfilled, (state, action) => { state.loading = false; state.currentGroup = action.payload.group; })
      .addCase(fetchGroup.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createGroup.fulfilled, (state, action) => { state.groups.unshift(action.payload.group); })
      .addCase(deleteGroup.fulfilled, (state, action) => { state.groups = state.groups.filter((g) => g._id !== action.payload); });
  },
});

export const { clearCurrentGroup, clearGroupError } = groupSlice.actions;
export default groupSlice.reducer;
