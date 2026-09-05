import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { lazy, Suspense, useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, db } from './config/firebase.js';
import { setUser } from './redux/authSlice.js';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { setNotifications } from './redux/notificationSlice.js';
import Loader from './components/common/Loader.jsx';
import { usePushNotifications } from './hooks/usePushNotifications.js';
import InstallPrompt from './components/common/InstallPrompt.jsx';
import PwaUpdatePrompt from './components/common/PwaUpdatePrompt.jsx';
import { hasSeenOnboarding } from './hooks/useOnboardingState.js';
import { isNativeRuntime } from '#paymatrix-runtime';
import { useNativeAppBridge } from './platform/useNativeAppBridge.js';
import { serializeFirestoreData } from './utils/firestoreSerialization.js';
import { needsEmailVerification } from './services/authService.js';

// Layout & Pages
const AppLayout = lazy(() => import('./components/layout/AppLayout.jsx'));
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminGroups = lazy(() => import('./pages/admin/AdminGroups.jsx'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications.jsx'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics.jsx'));
const AdminSecurityLogs = lazy(() => import('./pages/admin/AdminSecurityLogs.jsx'));
const AdminFeatureFlags = lazy(() => import('./pages/admin/AdminFeatureFlags.jsx'));
const AdminAiScans = lazy(() => import('./pages/admin/AdminAiScans.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Groups = lazy(() => import('./pages/Groups.jsx'));
const GroupDetail = lazy(() => import('./pages/GroupDetail.jsx'));
const AddExpense = lazy(() => import('./pages/AddExpense.jsx'));
const Activity = lazy(() => import('./pages/Activity.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const JoinGroup = lazy(() => import('./pages/JoinGroup.jsx'));
const Friends = lazy(() => import('./pages/Friends.jsx'));
const LogGroups = lazy(() => import('./pages/LogGroups.jsx'));
const LogGroupDetail = lazy(() => import('./pages/LogGroupDetail.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const DeleteAccount = lazy(() => import('./pages/DeleteAccount.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));

const ProtectedRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  if (!user) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const RootRoute = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (user) return <Navigate to="/dashboard" replace />;
  if (isNativeRuntime()) return <Navigate to="/login" replace />;
  if (new URLSearchParams(location.search).get('preview') === '1') return <Onboarding />;
  if (hasSeenOnboarding()) return <Navigate to="/login" replace />;
  return <Onboarding />;
};

const AdminRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [claimsChecked, setClaimsChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setClaimsChecked(true);
      return;
    }
    import('./config/firebase.js').then(({ auth }) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setClaimsChecked(true);
        return;
      }
      currentUser
        .getIdTokenResult(true)
        .then((result) => {
          setIsAdmin(result.claims.admin === true);
          setClaimsChecked(true);
        })
        .catch(() => {
          setIsAdmin(false);
          setClaimsChecked(true);
        });
    });
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (!claimsChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader size="lg" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [initializing, setInitializing] = useState(true);
  const nativeRuntime = isNativeRuntime();

  usePushNotifications();
  useNativeAppBridge();

  useEffect(() => {
    let _unsubscribeProfile = null;
    let _unsubscribeNotifs = null;

    const unsubscribeAuth = onIdTokenChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        if (needsEmailVerification(firebaseUser)) {
          if (_unsubscribeProfile) _unsubscribeProfile();
          if (_unsubscribeNotifs) _unsubscribeNotifs();
          _unsubscribeProfile = null;
          _unsubscribeNotifs = null;
          dispatch(setUser(null));
          dispatch(setNotifications([]));
          setInitializing(false);
          return;
        }
        _unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = serializeFirestoreData({
              _id: docSnap.id,
              uid: docSnap.id,
              ...docSnap.data(),
            });
            dispatch(setUser(userData));
          } else {
            dispatch(
              setUser({
                _id: firebaseUser.uid,
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Anonymous',
                email: firebaseUser.email,
                avatar: firebaseUser.photoURL,
              })
            );
          }
          setInitializing(false);
        });

        const qNotifs = query(
          collection(db, 'notifications'),
          where('recipient', '==', firebaseUser.uid)
        );
        _unsubscribeNotifs = onSnapshot(
          qNotifs,
          (snapshot) => {
            const liveNotifs = snapshot.docs
              .map((docSnap) =>
                serializeFirestoreData({
                  _id: docSnap.id,
                  ...docSnap.data(),
                })
              )
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            dispatch(setNotifications(liveNotifs));
          },
          (err) => console.error('Notification snapshot error:', err)
        );
      } else {
        if (_unsubscribeProfile) {
          _unsubscribeProfile();
          _unsubscribeProfile = null;
        }
        if (_unsubscribeNotifs) {
          _unsubscribeNotifs();
          _unsubscribeNotifs = null;
        }
        dispatch(setUser(null));
        dispatch(setNotifications([]));
        setInitializing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (_unsubscribeProfile) {
        _unsubscribeProfile();
        _unsubscribeProfile = null;
      }
      if (_unsubscribeNotifs) {
        _unsubscribeNotifs();
        _unsubscribeNotifs = null;
      }
    };
  }, [dispatch]);

  if (initializing) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <>
      {!nativeRuntime && !['/', '/login', '/register'].includes(location.pathname) && (
        <InstallPrompt />
      )}
      {!nativeRuntime && <PwaUpdatePrompt />}
      <Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-background">
            <Loader size="lg" />
          </div>
        }
      >
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          <Route path="/join/:code" element={<JoinGroup />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/delete-account" element={<DeleteAccount />} />

          {/* Protected Routes — inside AppLayout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:id" element={<GroupDetail />} />
            <Route path="/groups/:id/add-expense" element={<AddExpense />} />
            <Route path="/add-expense" element={<AddExpense />} />
            <Route path="/analytics" element={<Analytics />} />

            <Route path="/settlements" element={<Navigate to="/dashboard" replace />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/logs" element={<LogGroups />} />
            <Route path="/logs/:groupId" element={<LogGroupDetail />} />
            <Route path="/friends/:id" element={<Profile />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Admin Panel */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="groups" element={<AdminGroups />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="ai-scans" element={<AdminAiScans />} />
            <Route path="security" element={<AdminSecurityLogs />} />
            <Route path="flags" element={<AdminFeatureFlags />} />
          </Route>

          {/* Root Route */}
          <Route path="/" element={<RootRoute />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
