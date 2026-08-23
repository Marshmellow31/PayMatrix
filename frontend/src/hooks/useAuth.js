import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { googleLogin, logoutUser, getMe, updateProfile } from '../redux/authSlice.js';

const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);

  const handleGoogleLogin = async () => {
    const result = await dispatch(googleLogin());
    if (result.meta.requestStatus === 'fulfilled') {
      const intent = new URLSearchParams(window.location.search).get('intent');

      // Check for deferred deep-link: group invite
      const pendingCode = localStorage.getItem('pendingInviteCode');
      if (pendingCode) {
        localStorage.removeItem('pendingInviteCode');
        navigate(`/join/${pendingCode}`);
        return result;
      }

      if (intent === 'create-group') {
        navigate('/groups?add=true');
        return result;
      }

      const returnTo = new URLSearchParams(window.location.search).get('returnTo');
      if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) {
        navigate(returnTo);
        return result;
      }

      navigate('/dashboard');
    }
    return result;
  };

  const handleUpdateProfile = async (data) => {
    const result = await dispatch(updateProfile(data));
    return result;
  };

  const handleLogout = async () => {
    const result = await dispatch(logoutUser());
    if (result.meta.requestStatus === 'fulfilled') {
      window.location.replace('/login');
    }
    return result;
  };

  const refreshUser = () => {
    dispatch(getMe());
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    googleLogin: handleGoogleLogin,
    logout: handleLogout,
    updateProfile: handleUpdateProfile,
    refreshUser,
  };
};

export default useAuth;
