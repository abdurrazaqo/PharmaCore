import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenantGuard } from '../hooks/useTenantGuard';
import { UserRole, TenantStatus } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, requiredRoles, children }) => {
  const { user, profile, isLoading, hasRole, error, logout } = useAuth();
  const { isBlocked, isExpiredGifted } = useTenantGuard();
  const location = window.location.pathname;

  // Show an error state if fetching profile failed
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-red-100 dark:border-red-900/30">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
            <span className="material-symbols-outlined text-red-600 dark:text-red-500 text-3xl">error</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Login Error</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 whitespace-pre-wrap">{error}</p>
          <button 
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Show a loading spinner while Supabase checks the session or fetches profile
  if (isLoading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center font-inter">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#006C75] border-t-transparent"></div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User-level suspension -> Redirect to suspended page
  if (profile?.is_suspended) {
    return <Navigate to="/suspended" replace />;
  }

  // Expired Beta -> Force to Subscription
  if (isExpiredGifted && location !== '/subscription') {
    return <Navigate to="/subscription" replace />;
  }

  // Tenant-level blocking -> Render full-screen blocking page
  if (isBlocked && profile?.tenant) {
    const isPending = profile.tenant.status === TenantStatus.PENDING;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm max-w-md w-full border border-slate-200 dark:border-slate-700">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-500 text-2xl">
              {isPending ? 'hourglass_empty' : 'domain_disabled'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            {isPending ? 'Account Pending Approval' : 'Account Deactivated'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {isPending 
              ? 'Your pharmacy account is currently under review by our team. You will receive an email once approved.'
              : 'This account has been deactivated. Please contact support for assistance.'}
          </p>
        </div>
      </div>
    );
  }

  // Check role requirements
  let hasRequiredRole = true;
  if (requiredRole && !hasRole(requiredRole)) {
    hasRequiredRole = false;
  }
  if (requiredRoles && requiredRoles.length > 0) {
    const userRoleMatches = requiredRoles.some(role => hasRole(role));
    if (!userRoleMatches) {
      hasRequiredRole = false;
    }
  }

  if (!hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Render children or nested routes via Outlet if valid
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
