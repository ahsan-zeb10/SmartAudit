import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/pages/Dashboard';
import Devices from '@/pages/Devices';
import Vulnerabilities from '@/pages/Vulnerabilities';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import ScanEngine from '@/pages/ScanEngine';
import Login from '@/pages/Login';
import Register from '@/pages/Register'; // Naya page
import './App.css';

// Protected Route
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-cyan-400">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route (login/register only when not logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/scan-engine" element={<ProtectedRoute allowedRoles={['admin', 'analyst']}><ScanEngine /></ProtectedRoute>} />
          <Route path="/devices" element={<ProtectedRoute allowedRoles={['admin', 'analyst']}><Devices /></ProtectedRoute>} />
          <Route path="/vulnerabilities" element={<ProtectedRoute><Vulnerabilities /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'analyst']}><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;