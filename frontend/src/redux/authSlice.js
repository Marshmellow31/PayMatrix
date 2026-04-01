import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/authService.js';
import { auth } from '../config/firebase.js';
import { signOut } from 'firebase/auth';

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

const user = safeParse('paymatrix_user');

const initialState = {
  user: user,
  loading: false,
  error: null,
};

// Register
export const register = createAsyncThunk(
  'auth/register',
  async (userData, thunkAPI) => {
    try {
      const { user } = await authService.register(userData);
      localStorage.setItem('paymatrix_user', JSON.stringify(user));
      return { user };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Registration failed');
    }
  }
);

// Login
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, thunkAPI) => {
    try {
      const { user } = await authService.login(credentials);
      localStorage.setItem('paymatrix_user', JSON.stringify(user));
      return { user };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Login failed');
    }
  }
);

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
      return thunkAPI.rejectWithValue(error.message);
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
      state.user = action.payload;
      localStorage.setItem('paymatrix_user', JSON.stringify(action.payload));
    }
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
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
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
      });
  },
});

export const { logout, clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
