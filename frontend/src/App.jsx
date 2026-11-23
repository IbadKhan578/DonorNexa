import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public pages
import LandingPage from './pages/public/LandingPage';
import EmergenciesBoard from './pages/public/EmergenciesBoard';
import LoginPage from './pages/auth/LoginPage';
import DonorRegisterPage from './pages/auth/DonorRegisterPage';
import HospitalRegisterPage from './pages/auth/HospitalRegisterPage';

// Donor pages
import DonorDashboard from './pages/donor/DonorDashboard';
import MatchedRequestsPage from './pages/donor/MatchedRequestsPage';
import DonationHistoryPage from './pages/donor/DonationHistoryPage';
import DonorProfilePage from './pages/donor/DonorProfilePage';

// Hospital pages
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import CreateRequestPage from './pages/hospital/CreateRequestPage';
import RequestDetailPage from './pages/hospital/RequestDetailPage';
import HospitalInventoryPage from './pages/hospital/HospitalInventoryPage';
import HospitalProfilePage from './pages/hospital/HospitalProfilePage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import HospitalVerificationPage from './pages/admin/HospitalVerificationPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import SystemSettingsPage from './pages/admin/SystemSettingsPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import AllRequestsPage from './pages/admin/AllRequestsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/emergencies" element={<EmergenciesBoard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/donor" element={<DonorRegisterPage />} />
          <Route path="/register/hospital" element={<HospitalRegisterPage />} />

          {/* Donor Routes */}
          <Route
            path="/donor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <DonorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donor/matches"
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <MatchedRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donor/history"
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <DonationHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donor/badges"
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <DonationHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donor/profile"
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <DonorProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Hospital Routes */}
          <Route
            path="/hospital/dashboard"
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/requests/new"
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <CreateRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/requests/:id"
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <RequestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/inventory"
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalInventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/profile"
            element={
              <ProtectedRoute allowedRoles={['hospital']}>
                <HospitalProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/verification"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <HospitalVerificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuditLogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SystemSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/requests"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AllRequestsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
