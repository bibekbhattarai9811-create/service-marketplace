import React from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import PostJob from './pages/PostJob';
import Dashboard from './pages/Dashboard';
import CustomerDashboard from './pages/CustomerDashboardV2';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import AdminAnalytics from './pages/AdminAnalytics';
import Notifications from './pages/Notifications';
import Workers from './pages/Workers';
import WorkerProfilePublic from './pages/WorkerProfilePublic';
import Onboarding from './pages/Onboarding';

function getDefaultRoute() {
  const role = localStorage.getItem('role');
  if (role === 'worker') return '/dashboard';
  if (role === 'admin') return '/admin';
  return '/customer-dashboard';
}

function needsOnboarding() {
  return localStorage.getItem('onboarding_complete') !== 'true';
}

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRoute()} replace />;
  }

  if (needsOnboarding() && window.location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return children;
  }

  return <Navigate to={getDefaultRoute()} replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
        <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/welcome" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/workers" element={<ProtectedRoute><Workers /></ProtectedRoute>} />
        <Route path="/workers/:workerId" element={<ProtectedRoute><WorkerProfilePublic /></ProtectedRoute>} />
        <Route
          path="/post-job"
          element={<ProtectedRoute allowedRoles={['customer']}><PostJob /></ProtectedRoute>}
        />
        <Route
          path="/dashboard"
          element={<ProtectedRoute allowedRoles={['worker']}><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/customer-dashboard"
          element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>}
        />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route
          path="/admin"
          element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>}
        />
      </Routes>
    </Router>
  );
}

export default App;
