import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/authService.js';
import { clearSummaryCache } from '../services/expenseService.js';
import { clearUserCache } from '../services/groupService.js';
import fcmService from '../services/fcmService.js';
import { db } from '../config/firebase.js';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import syncTracker from '../services/syncTracker.js';

// Safe localStorage parser
const safeParse = (key) => {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === 'undefined') return null;
    const data = JSON.parse(val);
    if (data && data.uid && !data._id) data._id = data.uid;
    return data;
  } catch {
    return null;
  }
};

const user = safeParse('paymatrix_user');

const initialState = {
  user: user,
  loading: false,
  error: null,
};

// Google Auth
export const googleLogin = createAsyncThunk('auth/googleLogin', async (_, thunkAPI) => {
  try {
    const { user } = await authService.googleAuth();
    localStorage.setItem('paymatrix_user', JSON.stringify(user));
    return { user };
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Google Auth failed');
  }
});

// Get current user (sync with firestore)
export const getMe = createAsyncThunk('auth/getMe', async (_, thunkAPI) => {
  try {
    const response = await authService.getMe();
    const user = response.data.data.user;
    localStorage.setItem('paymatrix_user', JSON.stringify(user));
    return { user };
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to fetch user');
  }
});

// Update profile
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, thunkAPI) => {
    try {
      const response = await authService.updateProfile(profileData);
      const user = response.data.data.user;
      localStorage.setItem('paymatrix_user', JSON.stringify(user));
      return { user };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Profile update failed');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, thunkAPI) => {
  try {
    await fcmService.deleteToken();
    await authService.signOut();
    clearSummaryCache();
    clearUserCache();
    syncTracker.clear();

    localStorage.removeItem('paymatrix_user');
    localStorage.removeItem('persist:root');
    localStorage.removeItem('lastGroupId');
    Object.keys(localStorage)
      .filter((key) => key.startsWith('paymatrix_outbox_') || key.startsWith('paymatrix_account_'))
      .forEach((key) => localStorage.removeItem(key));

    // Firestore's web cache is shared by the installation, not by Firebase UID.
    // Terminate and clear it before another account can be used.
    await terminate(db);
    await clearIndexedDbPersistence(db);
    return true;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Secure logout could not be completed.');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      const userData = action.payload;
      if (userData && userData.uid && !userData._id) userData._id = userData.uid;
      state.user = userData;
      localStorage.setItem('paymatrix_user', JSON.stringify(userData));
    },
  },
  extraReducers: (builder) => {
    builder
      // Google Login
      .addCase(googleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Me
      .addCase(getMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })
      // Update Profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
