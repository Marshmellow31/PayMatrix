import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/authService.js';

// Safe localStorage parser
const safeParse = (key) => {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === 'undefined') return null;
    return JSON.parse(val);
  } catch {
    return null;
  }
};

const token = localStorage.getItem('paymatrix_token');
const user = safeParse('paymatrix_user');

const initialState = {
  user: user,
  token: token,
  loading: false,
  error: null,
};

// Register
export const register = createAsyncThunk(
  'auth/register',
  async (userData, thunkAPI) => {
    try {
      const response = await authService.register(userData);
      const { user, token } = response.data.data;
      localStorage.setItem('paymatrix_token', token);
      localStorage.setItem('paymatrix_user', JSON.stringify(user));
      return { user, token };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Login
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, thunkAPI) => {
    try {
      const response = await authService.login(credentials);
      const { user, token } = response.data.data;
      localStorage.setItem('paymatrix_token', token);
      localStorage.setItem('paymatrix_user', JSON.stringify(user));
      return { user, token };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

import { fetchWithCache } from '../utils/fetchWithCache.js';

// Get current user
export const getMe = createAsyncThunk('auth/getMe', async (_, thunkAPI) => {
  return fetchWithCache(
    '/users/me',
    thunkAPI,
    () => authService.getMe()
  );
});

// Update profile
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, thunkAPI) => {
    try {
      const response = await authService.updateProfile(profileData);
      const { user } = response.data.data;
      localStorage.setItem('paymatrix_user', JSON.stringify(user));
      return { user };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('paymatrix_token');
      localStorage.removeItem('paymatrix_user');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
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
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
