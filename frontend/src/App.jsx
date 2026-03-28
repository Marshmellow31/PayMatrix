import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthPage } from "./pages/AuthPage";
import { Dashboard } from "./pages/Dashboard";
import { Groups } from "./pages/Groups";
import { GroupDetail } from "./pages/GroupDetail";
import { AddExpense } from "./pages/AddExpense";
import { Activity } from "./pages/Activity";
import { Profile } from "./pages/Profile";
import "./index.css";

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen bg-background text-on-background selection:bg-primary/20 font-inter">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Private Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
            <Route path="/groups/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
            <Route path="/add-expense" element={<ProtectedRoute><AddExpense /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            <Route path="/" element={<Navigate to="/auth" replace />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
};

export default App;
