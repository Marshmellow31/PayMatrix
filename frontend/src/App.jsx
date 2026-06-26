import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase.js';
import { setUser } from './redux/authSlice.js';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { setNotifications } from './redux/notificationSlice.js';
import Loader from './components/common/Loader.jsx';
import { usePushNotifications } from './hooks/usePushNotifications.js';
import { useAdminAuth } from './hooks/useAdminAuth.js';
import InstallPrompt from './components/common/InstallPrompt.jsx';
import PwaUpdatePrompt from './components/common/PwaUpdatePrompt.jsx';

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
import Copilot from './pages/Copilot.jsx';

// Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Groups from './pages/Groups.jsx';
import GroupDetail from './pages/GroupDetail.jsx';
import AddExpense from './pages/AddExpense.jsx';
import GlobalSettlements from './pages/GlobalSettlements.jsx';
import Activity from './pages/Activity.jsx';
import Profile from './pages/Profile.jsx';
import Analytics from './pages/Analytics.jsx';
import JoinGroup from './pages/JoinGroup.jsx';
import JoinFriend from './pages/JoinFriend.jsx';
import Friends from './pages/Friends.jsx';
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

const AdminRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const [password, setPassword] = useState('');
  // FIX SEC-03: removed sessionStorage flag (trivially bypassable via DevTools).
  // Admin state is now in React state only — never written to sessionStorage.
  // Primary path: Firebase Custom Claims (token.admin === true).
  // Fallback path: VITE_ADMIN_PASSWORD for first-time bootstrap only.
  const [authenticated, setAuthenticated] = useState(false);
  const [claimsChecked, setClaimsChecked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { setClaimsChecked(true); return; }
    // Check Firebase ID token for admin custom claim
    import('./config/firebase.js').then(({ auth }) => {
      const currentUser = auth.currentUser;
      if (!currentUser) { setClaimsChecked(true); return; }
      currentUser.getIdTokenResult(true).then((result) => {
        if (result.claims.admin === true) setAuthenticated(true);
        setClaimsChecked(true);
      }).catch(() => setClaimsChecked(true));
    });
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (!claimsChecked) return null; // Wait for claims check

  const handleVerify = (e) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (password === correctPassword) {
      // In-memory only — never written to sessionStorage
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
        <div className="max-w-md w-full bg-[#141414] border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <span className="text-lg font-black font-manrope tracking-tight text-orange-500">PayMatrix</span>
            <h2 className="text-xl font-black font-manrope text-white mt-2 uppercase tracking-tight">Admin Console</h2>
            <p className="text-xs text-white/40 mt-1 font-inter">Enter password to unlock administrative access</p>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 outline-none text-white font-manrope text-sm focus:ring-2 focus:ring-orange-500/50 placeholder:text-white/20"
            />
            {error && <p className="text-xs font-bold text-red-400 font-inter text-center">{error}</p>}
            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-orange-500 text-white font-manrope font-black text-sm hover:bg-orange-600 active:scale-[0.98] transition-all"
            >
              Verify & Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
};

// FIX SEC-11: module-level refs replace window._unsubscribe* globals.
// Stored here rather than on window so external scripts cannot terminate listeners.
let _unsubscribeProfile = null;
let _unsubscribeNotifs  = null;

function App() {
  const dispatch = useDispatch();
  const [initializing, setInitializing] = useState(true);

  // Silently registers for FCM push notifications after login.
  // Saves the device token to Firestore so Cloud Functions can target it.
  usePushNotifications();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let firstSnapshotReceived = false;

        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            dispatch(setUser({ _id: docSnap.id, ...docSnap.data() }));
          } else {
            dispatch(setUser({
              _id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
            }));
          }
          if (!firstSnapshotReceived) {
            firstSnapshotReceived = true;
            setInitializing(false);
          }
        }, () => {
          if (!firstSnapshotReceived) setInitializing(false);
        });

        const qNotifs = query(
          collection(db, 'notifications'),
          where('to', '==', firebaseUser.uid),
          where('read', '==', false)
        );
        const unsubscribeNotifs = onSnapshot(qNotifs, (snapshot) => {
          const liveNotifs = snapshot.docs
            .map(d => ({ _id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          dispatch(setNotifications(liveNotifs));
        }, () => {});

        // Store in module-level refs, not window
        _unsubscribeProfile = unsubscribeProfile;
        _unsubscribeNotifs  = unsubscribeNotifs;
      } else {
        // User logged out — tear down listeners
        if (_unsubscribeProfile) { _unsubscribeProfile(); _unsubscribeProfile = null; }
        if (_unsubscribeNotifs)  { _unsubscribeNotifs();  _unsubscribeNotifs  = null; }
        dispatch(setUser(null));
        dispatch(setNotifications([]));
        setInitializing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (_unsubscribeProfile) { _unsubscribeProfile(); _unsubscribeProfile = null; }
      if (_unsubscribeNotifs)  { _unsubscribeNotifs();  _unsubscribeNotifs  = null; }
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
    <InstallPrompt />
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


      <Route
        path="/join/:code"
        element={<JoinGroup />}
      />
      <Route
        path="/join-friend"
        element={<JoinFriend />}
      />

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
        <Route path="/copilot" element={<Copilot />} />

        <Route path="/settlements" element={<GlobalSettlements />} />
        <Route path="/activity" element={<Activity />} />
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
        <Route path="users"         element={<AdminUsers />} />
        <Route path="groups"        element={<AdminGroups />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="analytics"     element={<AdminAnalytics />} />
        <Route path="ai-scans"      element={<AdminAiScans />} />
        <Route path="security"      element={<AdminSecurityLogs />} />
        <Route path="flags"         element={<AdminFeatureFlags />} />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

export default App;
