import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const { user, profile, isLoading, requireRole } = useAuth();

  // Show a loading spinner while Supabase checks the session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If a role is required but user doesn't have it -> Redirect to dashboard or unauthorized
  // We wait until profile is loaded to check role
  if (requiredRole && profile && !requireRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  // If we require a role but profile isn't loaded yet, show loading
  if (requiredRole && !profile) {
     return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading profile...</p>
          </div>
        </div>
      );
  }

  // Render children or nested routes via Outlet if valid
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
