import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { googleLogin, logout, getMe, updateProfile } from '../redux/authSlice.js';

const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);

  const handleGoogleLogin = async () => {
    const result = await dispatch(googleLogin());
    if (result.meta.requestStatus === 'fulfilled') {
      // Check for deferred deep-link: group invite
      const pendingCode = localStorage.getItem('pendingInviteCode');
      if (pendingCode) {
        localStorage.removeItem('pendingInviteCode');
        navigate(`/join/${pendingCode}`);
        return result;
      }

      // Check for deferred deep-link: friend invite
      const pendingFriend = localStorage.getItem('pendingFriendInvite');
      if (pendingFriend) {
        localStorage.removeItem('pendingFriendInvite');
        navigate(`/join-friend?uid=${pendingFriend}`);
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

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
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
