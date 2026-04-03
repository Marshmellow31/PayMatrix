import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase.js';
import { setUser } from './redux/authSlice.js';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { setNotifications } from './redux/notificationSlice.js';
import Loader from './components/common/Loader.jsx';

// Layout
import AppLayout from './components/layout/AppLayout.jsx';

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


/**
 * Protected route wrapper
 */
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

function App() {
  const dispatch = useDispatch();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is logged in, set up real-time listener for their profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        let firstSnapshotReceived = false;

        // Listen for document changes
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            // Ensure legacy _id remains for backward compatibility in slices
            dispatch(setUser({ _id: docSnap.id, ...userData }));
          } else {
            // User exists in Auth but not Firestore? (Shouldn't happen often)
            dispatch(setUser({ 
              _id: firebaseUser.uid, 
              uid: firebaseUser.uid, 
              email: firebaseUser.email, 
              name: firebaseUser.displayName 
            }));
          }

          if (!firstSnapshotReceived) {
            firstSnapshotReceived = true;
            setInitializing(false);
          }
        }, (error) => {
          console.error("Profile snapshot error:", error);
          if (!firstSnapshotReceived) setInitializing(false);
        });

        // 2. Real-time listener for notifications (Unread only for efficiency)
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
        }, (error) => {
          console.error("Notification snapshot error:", error);
        });

        // Store unsubscribers to clean up when auth state changes again
        window._unsubscribeProfile = unsubscribeProfile;
        window._unsubscribeNotifs = unsubscribeNotifs;
      } else {
        // User logged out
        if (window._unsubscribeProfile) {
          window._unsubscribeProfile();
          window._unsubscribeProfile = null;
        }
        if (window._unsubscribeNotifs) {
          window._unsubscribeNotifs();
          window._unsubscribeNotifs = null;
        }
        dispatch(setUser(null));
        dispatch(setNotifications([])); // Clear notifications on logout
        setInitializing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (window._unsubscribeProfile) window._unsubscribeProfile();
      if (window._unsubscribeNotifs) window._unsubscribeNotifs();
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

        <Route path="/settlements" element={<GlobalSettlements />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/friends/:id" element={<Profile />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
