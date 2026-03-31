import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

export enum Permission {
  // User Management
  VIEW_USERS = 'view_users',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  
  // Product/Inventory Management
  VIEW_INVENTORY = 'view_inventory',
  CREATE_PRODUCTS = 'create_products',
  EDIT_PRODUCTS = 'edit_products',
  DELETE_PRODUCTS = 'delete_products',
  ADJUST_STOCK = 'adjust_stock',
  
  // Sales/POS
  VIEW_POS = 'view_pos',
  PROCESS_SALES = 'process_sales',
  PROCESS_RETURNS = 'process_returns',
  APPLY_DISCOUNTS = 'apply_discounts',
  
  // Customer Management
  VIEW_CUSTOMERS = 'view_customers',
  CREATE_CUSTOMERS = 'create_customers',
  EDIT_CUSTOMERS = 'edit_customers',
  DELETE_CUSTOMERS = 'delete_customers',
  VIEW_CUSTOMER_HISTORY = 'view_customer_history',
  
  // Reports & Analytics
  VIEW_REPORTS = 'view_reports',
  EXPORT_REPORTS = 'export_reports',
  VIEW_FINANCIAL_REPORTS = 'view_financial_reports',
  
  // Settings & Configuration
  VIEW_SETTINGS = 'view_settings',
  EDIT_SETTINGS = 'edit_settings',
  MANAGE_BRANCHES = 'manage_branches',
  
  // Tenant Management (Superadmin only)
  VIEW_ALL_TENANTS = 'view_all_tenants',
  CREATE_TENANTS = 'create_tenants',
  EDIT_TENANTS = 'edit_tenants',
  DELETE_TENANTS = 'delete_tenants',
}

// Define permissions for each role
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.CASHIER]: [
    Permission.VIEW_INVENTORY,
    Permission.VIEW_POS,
    Permission.PROCESS_SALES,
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMERS,
    Permission.VIEW_CUSTOMER_HISTORY,
  ],
  [UserRole.PHARMACY_TECHNICIAN]: [
    Permission.VIEW_INVENTORY,
    Permission.VIEW_POS,
    Permission.PROCESS_SALES,
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMERS,
    Permission.VIEW_CUSTOMER_HISTORY,
  ],
  [UserRole.PHARMACIST]: [
    Permission.VIEW_INVENTORY,
    Permission.VIEW_POS,
    Permission.PROCESS_SALES,
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMERS,
    Permission.VIEW_CUSTOMER_HISTORY,
    Permission.CREATE_PRODUCTS,
    Permission.EDIT_PRODUCTS,
  ],
  [UserRole.BRANCH_ADMIN]: [
    Permission.VIEW_INVENTORY,
    Permission.VIEW_POS,
    Permission.PROCESS_SALES,
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMERS,
    Permission.VIEW_CUSTOMER_HISTORY,
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.CREATE_PRODUCTS,
    Permission.EDIT_PRODUCTS,
    Permission.DELETE_PRODUCTS,
    Permission.ADJUST_STOCK,
    Permission.PROCESS_RETURNS,
    Permission.APPLY_DISCOUNTS,
    Permission.EDIT_CUSTOMERS,
    Permission.DELETE_CUSTOMERS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_FINANCIAL_REPORTS,
  ],
  [UserRole.TENANT_ADMIN]: [
    Permission.VIEW_INVENTORY,
    Permission.VIEW_POS,
    Permission.PROCESS_SALES,
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMERS,
    Permission.VIEW_CUSTOMER_HISTORY,
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.CREATE_PRODUCTS,
    Permission.EDIT_PRODUCTS,
    Permission.DELETE_PRODUCTS,
    Permission.ADJUST_STOCK,
    Permission.PROCESS_RETURNS,
    Permission.APPLY_DISCOUNTS,
    Permission.EDIT_CUSTOMERS,
    Permission.DELETE_CUSTOMERS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_FINANCIAL_REPORTS,
    Permission.VIEW_SETTINGS,
    Permission.EDIT_SETTINGS,
    Permission.MANAGE_BRANCHES,
  ],
  [UserRole.SUPERADMIN]: [
    ...Object.values(Permission),
  ],
};

export const usePermissions = () => {
  const { profile, hasRole } = useAuth();

  const isSuperadmin = hasRole(UserRole.SUPERADMIN);
  const isTenantAdmin = hasRole(UserRole.TENANT_ADMIN);
  const isBranchAdmin = hasRole(UserRole.BRANCH_ADMIN);
  const isPharmacist = hasRole(UserRole.PHARMACIST);

  // Legacy Permission checks
  const hasPermission = (permission: Permission): boolean => {
    if (!profile) return false;
    const userPermissions = rolePermissions[profile.role] || [];
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  // New RBAC Flags
  return {
    canViewAllBranches: isSuperadmin || isTenantAdmin,
    canManageInventory: isSuperadmin || isTenantAdmin || isBranchAdmin || isPharmacist,
    canViewInventory: !!profile,
    canProcessSales: !!profile && !isSuperadmin,
    canManageCustomers: isSuperadmin || isTenantAdmin || isBranchAdmin || isPharmacist,
    canViewReports: isSuperadmin || isTenantAdmin || isBranchAdmin || isPharmacist,
    canAccessAIConsult: isSuperadmin || isTenantAdmin || isBranchAdmin || isPharmacist,
    canManageUsers: isSuperadmin || isTenantAdmin || isBranchAdmin,
    canCreateBranchAdmin: isSuperadmin || isTenantAdmin,
    canManageSubscription: isSuperadmin || isTenantAdmin,
    canAccessSuperadminDashboard: isSuperadmin,
    canViewAuditLogs: isSuperadmin || isTenantAdmin || isBranchAdmin,

    // Legacy exports
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: profile ? rolePermissions[profile.role] : [],
  };
};
