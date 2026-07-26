import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase.js';
import { setUser } from './redux/authSlice.js';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { setNotifications } from './redux/notificationSlice.js';
import Loader from './components/common/Loader.jsx';
import { usePushNotifications } from './hooks/usePushNotifications.js';
import InstallPrompt from './components/common/InstallPrompt.jsx';
import PwaUpdatePrompt from './components/common/PwaUpdatePrompt.jsx';
import Onboarding from './pages/Onboarding.jsx';
import { hasSeenOnboarding } from './hooks/useOnboardingState.js';

// Layout
import AppLayout from './components/layout/AppLayout.jsx';

// Admin
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminGroups from './pages/admin/AdminGroups.jsx';
import AdminNotifications from './pages/admin/AdminNotifications.jsx';
import AdminAnalytics from './pages/admin/AdminAnalytics.jsx';
import AdminSecurityLogs from './pages/admin/AdminSecurityLogs.jsx';
import AdminFeatureFlags from './pages/admin/AdminFeatureFlags.jsx';
import AdminAiScans from './pages/admin/AdminAiScans.jsx';

// Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Groups from './pages/Groups.jsx';
import GroupDetail from './pages/GroupDetail.jsx';
import AddExpense from './pages/AddExpense.jsx';
import Activity from './pages/Activity.jsx';
import Profile from './pages/Profile.jsx';
import Analytics from './pages/Analytics.jsx';
import JoinGroup from './pages/JoinGroup.jsx';
import Friends from './pages/Friends.jsx';
import LogGroups from './pages/LogGroups.jsx';
import LogGroupDetail from './pages/LogGroupDetail.jsx';
import NotFound from './pages/NotFound.jsx';

const ProtectedRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const RootRoute = () => {
  const { user } = useSelector((state) => state.auth);

  // Authenticated users and existing persisted sessions always bypass the
  // marketing journey and land in the product they already know.
  if (user) return <Navigate to="/dashboard" replace />;
  if (hasSeenOnboarding()) return <Navigate to="/login" replace />;
  return <Onboarding />;
};

const AdminRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  // Admin access is gated SOLELY by the Firebase `admin` custom claim (verified
  // again server-side by Firestore rules and every admin Cloud Function). The
  // previous VITE_ADMIN_PASSWORD fallback was removed — a bundled password is
  // public and offered no real protection.
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
        .catch(() => setClaimsChecked(true));
    });
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (!claimsChecked) return null; // Wait for claims check
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
};

// FIX SEC-11: module-level refs replace window._unsubscribe* globals.
// Stored here rather than on window so external scripts cannot terminate listeners.
let _unsubscribeProfile = null;
let _unsubscribeNotifs = null;

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [initializing, setInitializing] = useState(true);

  // Silently registers for FCM push notifications after login.
  // Saves the device token to Firestore so Cloud Functions can target it.
  usePushNotifications();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let firstSnapshotReceived = false;

        const unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              dispatch(setUser({ _id: docSnap.id, ...docSnap.data() }));
              if (!docSnap.data().friendCode) {
                import('./services/friendCodeService.js').then(({ default: friendCodeService }) =>
                  friendCodeService.ensureFriendCode({ uid: firebaseUser.uid, ...docSnap.data() })
                );
              }
            } else {
              dispatch(
                setUser({
                  _id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: firebaseUser.displayName,
                })
              );
            }
            if (!firstSnapshotReceived) {
              firstSnapshotReceived = true;
              setInitializing(false);
            }
          },
          () => {
            if (!firstSnapshotReceived) setInitializing(false);
          }
        );

        const qNotifs = query(
          collection(db, 'notifications'),
          where('to', '==', firebaseUser.uid),
          where('read', '==', false)
        );
        const unsubscribeNotifs = onSnapshot(
          qNotifs,
          (snapshot) => {
            const liveNotifs = snapshot.docs
              .map((d) => ({ _id: d.id, ...d.data() }))
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            dispatch(setNotifications(liveNotifs));
          },
          () => {}
        );

        // Store in module-level refs, not window
        _unsubscribeProfile = unsubscribeProfile;
        _unsubscribeNotifs = unsubscribeNotifs;
      } else {
        // User logged out — tear down listeners
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
      {/* Let the first-run journey earn attention before offering installation. */}
      {location.pathname !== '/' && <InstallPrompt />}
      <PwaUpdatePrompt />
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

        {/* New visitors see onboarding; returning/authenticated users bypass it. */}
        <Route path="/" element={<RootRoute />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
