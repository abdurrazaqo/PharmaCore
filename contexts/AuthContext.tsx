import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  requireRole: (role: UserRole) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  isSuperAdmin: () => boolean;
  isTenantAdmin: () => boolean;
  isBranchAdmin: () => boolean;
  hasPermission: (permission: Permission) => boolean;
  canEdit: () => boolean;
  canDelete: () => boolean;
  canManageUsers: () => boolean;
  canVerifyOffline: () => boolean;
  canExport: () => boolean;
  refreshProfile: () => Promise<void>;
}

export enum Permission {
  // Inventory permissions
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_ADD = 'inventory:add',
  INVENTORY_EDIT = 'inventory:edit',
  INVENTORY_DELETE = 'inventory:delete',
  INVENTORY_EXPORT = 'inventory:export',
  
  // Sales permissions
  SALES_CREATE = 'sales:create',
  SALES_REFUND = 'sales:refund',
  SALES_VIEW_HISTORY = 'sales:view_history',
  
  // Customer permissions
  CUSTOMER_VIEW = 'customer:view',
  CUSTOMER_ADD = 'customer:add',
  CUSTOMER_EDIT = 'customer:edit',
  CUSTOMER_DELETE = 'customer:delete',
  
  // Reports permissions
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',
  
  // User management permissions
  USERS_VIEW = 'users:view',
  USERS_CREATE = 'users:create',
  USERS_ADD = 'users:add',
  USERS_EDIT = 'users:edit',
  USERS_DELETE = 'users:delete',
  
  // System permissions
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_EDIT = 'settings:edit',
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,
  logout: async () => {},
  signOut: async () => {},
  requireRole: () => false,
  hasRole: () => false,
  isSuperAdmin: () => false,
  isTenantAdmin: () => false,
  isBranchAdmin: () => false,
  hasPermission: () => false,
  canEdit: () => false,
  canDelete: () => false,
  canManageUsers: () => false,
  canViewReports: () => false,
  canExport: () => false,
  canVerifyOffline: () => false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = !!user;

  useEffect(() => {
    // Get initial session
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        refreshProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        refreshProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async (userId: string = user?.id || '') => {
    if (!userId) return;
    try {
      setError(null);
      setIsLoading(true);
      setProfile(null);
      if (!supabase) throw new Error('Supabase client not initialized');
      
      // console.log('🔍 Fetching profile for user:', userId);
      
      // Update last_sign_in_at timestamp
      await supabase
        .from('users')
        .update({ last_sign_in_at: new Date().toISOString() })
        .eq('id', userId);
      
      // Fetch user data first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // console.log('📦 User data:', userData);
      // console.log('❌ User error:', userError);

      if (userError) {
        console.error('Error fetching user profile:', userError);
        setError(`Database error: ${userError.message}`);
        return;
      }

      if (!userData) {
        console.error('No user data found');
        setError('No profile found for this account. Contact your administrator.');
        return;
      }

      // Check if user is suspended (only if column exists)
      if (userData.is_suspended === true) {
        console.error('User account is suspended');
        setError('Your account has been suspended. Please contact an administrator.');
        await supabase.auth.signOut();
        return;
      }

      // Fetch tenant data separately if tenant_id exists
      let tenantData = null;
      if (userData.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, name, subdomain, status, plan, billing_cycle, subscription_expires_at, trial_ends_at, onboarding_completed, logo_url, is_demo, is_gifted, gifted_until')
          .eq('id', userData.tenant_id)
          .single();
        tenantData = tenant;
        // console.log('🏢 Tenant data:', tenantData);
      }

      // Fetch branch data separately if branch_id exists
      let branchData = null;
      if (userData.branch_id) {
        const { data: branch } = await supabase
          .from('branches')
          .select('id, name, location')
          .eq('id', userData.branch_id)
          .single();
        branchData = branch;
        // console.log('🏪 Branch data:', branchData);
      }

      // Transform the data to match UserProfile interface
      const profile: UserProfile = {
        id: userData.id,
        tenant_id: userData.tenant_id,
        role: userData.role,
        branch_id: userData.branch_id,
        display_name: userData.display_name,
        is_suspended: userData.is_suspended,
        tenant: tenantData,
        branch: branchData,
      };
      
      // console.log('✅ Transformed profile:', profile);
      setProfile(profile);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase?.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const signOut = logout;

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const isSuperAdmin = (): boolean => profile?.role === UserRole.SUPERADMIN;
  const isTenantAdmin = (): boolean => profile?.role === UserRole.TENANT_ADMIN;
  const isBranchAdmin = (): boolean => profile?.role === UserRole.BRANCH_ADMIN;

  const requireRole = (role: UserRole): boolean => {
    if (!profile) return false;
    
    // Superadmin can access everything
    if (profile.role === UserRole.SUPERADMIN) return true;
    
    // Legacy support for STAFF role checking mappings
    if (role === 'staff' as any) {
        return profile.role === UserRole.TENANT_ADMIN || 
               profile.role === UserRole.BRANCH_ADMIN || 
               profile.role === UserRole.PHARMACIST || 
               profile.role === UserRole.PHARMACY_TECHNICIAN || 
               profile.role === UserRole.CASHIER;
    }
    
    return profile.role === role;
  };

  // Permission-based access control
  const hasPermission = (permission: Permission): boolean => {
    if (!profile) return false;
    
    const role = profile.role;
    
    // Superadmin has all permissions
    if (role === UserRole.SUPERADMIN) return true;
    
    // Define permissions for each role
    const rolePermissions: Record<UserRole, Permission[]> = {
      [UserRole.SUPERADMIN]: Object.values(Permission), // All permissions
      
      [UserRole.TENANT_ADMIN]: [
        // Inventory - full access
        Permission.INVENTORY_VIEW,
        Permission.INVENTORY_ADD,
        Permission.INVENTORY_EDIT,
        Permission.INVENTORY_DELETE,
        Permission.INVENTORY_EXPORT,
        
        // Sales - full access
        Permission.SALES_CREATE,
        Permission.SALES_REFUND,
        Permission.SALES_VIEW_HISTORY,
        
        // Customers - full access
        Permission.CUSTOMER_VIEW,
        Permission.CUSTOMER_ADD,
        Permission.CUSTOMER_EDIT,
        Permission.CUSTOMER_DELETE,
        
        // Reports - full access
        Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT,
        
        // Users - full access within tenant
        Permission.USERS_VIEW,
        Permission.USERS_CREATE,
        Permission.USERS_ADD,
        Permission.USERS_EDIT,
        Permission.USERS_DELETE,
        
        // Settings - full access
        Permission.SETTINGS_VIEW,
        Permission.SETTINGS_EDIT,
      ],
      
      [UserRole.BRANCH_ADMIN]: [
        Permission.INVENTORY_VIEW, Permission.INVENTORY_ADD, Permission.INVENTORY_EDIT, Permission.INVENTORY_DELETE, Permission.INVENTORY_EXPORT,
        Permission.SALES_CREATE, Permission.SALES_VIEW_HISTORY, Permission.SALES_REFUND,
        Permission.CUSTOMER_VIEW, Permission.CUSTOMER_ADD, Permission.CUSTOMER_EDIT, Permission.CUSTOMER_DELETE,
        Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
        Permission.USERS_VIEW, Permission.USERS_CREATE, Permission.USERS_ADD, Permission.USERS_EDIT, Permission.USERS_DELETE,
      ],
      
      [UserRole.PHARMACIST]: [
        Permission.INVENTORY_VIEW, Permission.INVENTORY_ADD, Permission.INVENTORY_EDIT, Permission.INVENTORY_DELETE,
        Permission.SALES_CREATE, Permission.SALES_VIEW_HISTORY, Permission.SALES_REFUND,
        Permission.CUSTOMER_VIEW, Permission.CUSTOMER_ADD, Permission.CUSTOMER_EDIT, Permission.CUSTOMER_DELETE,
        Permission.REPORTS_VIEW,
      ],
      
      [UserRole.PHARMACY_TECHNICIAN]: [
        Permission.INVENTORY_VIEW,
        Permission.SALES_CREATE, Permission.SALES_VIEW_HISTORY,
        Permission.CUSTOMER_VIEW, Permission.CUSTOMER_ADD,
      ],
      
      [UserRole.CASHIER]: [
        Permission.INVENTORY_VIEW,
        Permission.SALES_CREATE, Permission.SALES_VIEW_HISTORY,
        Permission.CUSTOMER_VIEW, Permission.CUSTOMER_ADD,
      ],
    };
    
    return rolePermissions[role]?.includes(permission) || false;
  };

  // Convenience methods for common permission checks
  const canEdit = (): boolean => {
    return profile?.role === UserRole.SUPERADMIN || profile?.role === UserRole.TENANT_ADMIN;
  };

  const canDelete = (): boolean => {
    return profile?.role === UserRole.SUPERADMIN || profile?.role === UserRole.TENANT_ADMIN;
  };

  const canManageUsers = (): boolean => {
    return hasPermission(Permission.USERS_VIEW);
  };

  const canViewReports = (): boolean => {
    return hasPermission(Permission.REPORTS_VIEW);
  };

  const canExport = (): boolean => {
    return hasPermission(Permission.REPORTS_EXPORT) || hasPermission(Permission.INVENTORY_EXPORT);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isLoading,
      error,
      isAuthenticated,
      logout,
      signOut,
      requireRole,
      hasRole,
      isSuperAdmin,
      isTenantAdmin,
      isBranchAdmin,
      hasPermission,
      canEdit,
      canDelete,
      canManageUsers,
      canViewReports,
      canExport,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
