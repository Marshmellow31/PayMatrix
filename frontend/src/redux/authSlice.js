import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/authService.js';
import { auth } from '../config/firebase.js';
import { signOut } from 'firebase/auth';

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
export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (_, thunkAPI) => {
    try {
      const { user } = await authService.googleAuth();
      localStorage.setItem('paymatrix_user', JSON.stringify(user));
      return { user };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Google Auth failed');
    }
  }
);

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

// Sync Profile with Google
export const syncProfile = createAsyncThunk(
  'auth/syncProfile',
  async (_, thunkAPI) => {
    try {
      const response = await authService.syncProfileWithGoogle();
      if (response.success) {
        // Redux will also be updated by the listener in App.jsx, but we update locally for immediate feedback
        const state = thunkAPI.getState();
        const updatedUser = { ...state.auth.user, ...response.userData };
        localStorage.setItem('paymatrix_user', JSON.stringify(updatedUser));
        return { user: updatedUser };
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Identity sync failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('paymatrix_user');
      signOut(auth).catch(console.error); // Fire-and-forget sign out
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      const userData = action.payload;
      if (userData && userData.uid && !userData._id) userData._id = userData.uid;
      state.user = userData;
      localStorage.setItem('paymatrix_user', JSON.stringify(userData));
    }
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
      // Sync Profile
      .addCase(syncProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
      });
  },
});

export const { logout, clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
