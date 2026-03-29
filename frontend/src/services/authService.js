import api from './api.js';

const authService = {
  register: (data) => api.post('/v1/auth/register', data),
  login: (data) => api.post('/v1/auth/login', data),
  googleAuth: (data) => api.post('/v1/auth/google', data),
  getMe: () => api.get('/v1/auth/me'),
  updateProfile: (data) => api.put('/v1/auth/profile', data),
  forgotPassword: (data) => api.post('/v1/auth/forgot-password', data),
  resetPassword: (token, data) => api.put(`/v1/auth/reset-password/${token}`, data),
};

export default authService;
