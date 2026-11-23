import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sand-600 text-sm font-sans">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If hospital is not verified and trying to access verified-only sections
    if (user.role === 'hospital' && !user.is_verified) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-sand-50 p-6">
          <div className="bg-white border border-sand-200 rounded-lg max-w-md w-full p-6 text-center shadow-card">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 font-mono font-bold text-lg">
              !
            </div>
            <h2 className="text-xl font-serif font-bold text-sand-900 mb-2">Hospital Verification Pending</h2>
            <p className="text-sand-600 text-sm mb-6 font-sans">
              Your hospital registration is currently under review by our administration team. Once your medical licence has been verified, full access will be enabled.
            </p>
            <div className="flex justify-center gap-3">
              <a href="/hospital/profile" className="btn-secondary text-sm">View Profile</a>
            </div>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
