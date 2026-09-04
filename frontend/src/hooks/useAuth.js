import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  googleLogin,
  logoutUser,
  getMe,
  updateProfile,
  registerWithEmail,
  emailLogin,
  confirmEmailVerification,
  resendEmailVerification,
  requestPasswordReset,
} from '../redux/authSlice.js';

const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error, pendingVerificationEmail } = useSelector((state) => state.auth);

  const navigateAfterAuth = (result) => {
    if (result.meta.requestStatus !== 'fulfilled' || !result.payload?.user) return result;
    const params = new URLSearchParams(window.location.search);
    const intent = params.get('intent');
    const pendingCode = localStorage.getItem('pendingInviteCode');
    if (pendingCode) {
      localStorage.removeItem('pendingInviteCode');
      navigate(`/join/${pendingCode}`);
    } else if (intent === 'create-group') {
      navigate('/groups?add=true');
    } else {
      const returnTo = params.get('returnTo');
      navigate(returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard');
    }
    return result;
  };

  const handleGoogleLogin = async () => {
    const result = await dispatch(googleLogin());
    return navigateAfterAuth(result);
  };

  const handleEmailRegistration = (details) => dispatch(registerWithEmail(details));
  const handleEmailLogin = async (details) =>
    navigateAfterAuth(await dispatch(emailLogin(details)));
  const handleVerificationCheck = async () =>
    navigateAfterAuth(await dispatch(confirmEmailVerification()));
  const handleVerificationResend = () => dispatch(resendEmailVerification());
  const handlePasswordReset = (email) => dispatch(requestPasswordReset(email));

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
    registerWithEmail: handleEmailRegistration,
    emailLogin: handleEmailLogin,
    confirmEmailVerification: handleVerificationCheck,
    resendEmailVerification: handleVerificationResend,
    requestPasswordReset: handlePasswordReset,
    pendingVerificationEmail,
    logout: handleLogout,
    updateProfile: handleUpdateProfile,
    refreshUser,
  };
};

export default useAuth;
