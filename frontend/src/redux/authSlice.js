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
  pendingVerificationEmail: null,
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

export const registerWithEmail = createAsyncThunk(
  'auth/registerWithEmail',
  async (details, thunkAPI) => {
    try {
      return await authService.registerWithEmail(details);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Account creation failed');
    }
  }
);

export const emailLogin = createAsyncThunk('auth/emailLogin', async (details, thunkAPI) => {
  try {
    const result = await authService.signInWithEmail(details);
    if (result.user) localStorage.setItem('paymatrix_user', JSON.stringify(result.user));
    return result;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Email sign-in failed');
  }
});

export const confirmEmailVerification = createAsyncThunk(
  'auth/confirmEmailVerification',
  async (_, thunkAPI) => {
    try {
      const result = await authService.refreshEmailVerification();
      if (result.user) localStorage.setItem('paymatrix_user', JSON.stringify(result.user));
      return result;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Could not confirm email verification');
    }
  }
);

export const resendEmailVerification = createAsyncThunk(
  'auth/resendEmailVerification',
  async (_, thunkAPI) => {
    try {
      return await authService.resendEmailVerification();
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Could not resend verification email');
    }
  }
);

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email, thunkAPI) => {
    try {
      await authService.sendPasswordReset(email);
      return true;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Could not send password reset email');
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
      if (userData) state.pendingVerificationEmail = null;
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
        state.pendingVerificationEmail = null;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerWithEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerWithEmail.fulfilled, (state, action) => {
        state.loading = false;
        state.user = null;
        state.pendingVerificationEmail = action.payload.email;
      })
      .addCase(registerWithEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(emailLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(emailLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user || null;
        state.pendingVerificationEmail = action.payload.verificationRequired
          ? action.payload.email
          : null;
      })
      .addCase(emailLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(confirmEmailVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmEmailVerification.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user || null;
        state.pendingVerificationEmail = action.payload.verificationRequired
          ? action.payload.email
          : null;
      })
      .addCase(confirmEmailVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(resendEmailVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendEmailVerification.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingVerificationEmail = action.payload.email;
      })
      .addCase(resendEmailVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(requestPasswordReset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
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
