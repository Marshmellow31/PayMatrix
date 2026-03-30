import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, register, logout, getMe, updateProfile } from '../redux/authSlice.js';

const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, loading, error } = useSelector((state) => state.auth);

  const handleLogin = async (credentials) => {
    const result = await dispatch(login(credentials));
    if (result.meta.requestStatus === 'fulfilled') {
      const pendingCode = localStorage.getItem('pendingInviteCode');
      if (pendingCode) {
        localStorage.removeItem('pendingInviteCode');
        navigate(`/groups/join/${pendingCode}`);
      } else {
        navigate('/dashboard');
      }
    }
    return result;
  };

  const handleRegister = async (userData) => {
    const result = await dispatch(register(userData));
    if (result.meta.requestStatus === 'fulfilled') {
      const pendingCode = localStorage.getItem('pendingInviteCode');
      if (pendingCode) {
        localStorage.removeItem('pendingInviteCode');
        navigate(`/groups/join/${pendingCode}`);
      } else {
        navigate('/dashboard');
      }
    }
    return result;
  };

  const handleUpdateProfile = async (data) => {
    const result = await dispatch(updateProfile(data));
    return result;
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const refreshUser = () => {
    dispatch(getMe());
  };

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    updateProfile: handleUpdateProfile,
    refreshUser,
  };
};

export default useAuth;
