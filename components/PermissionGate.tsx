import React from 'react';
import { Permission, usePermissions } from '../hooks/usePermissions';

interface PermissionGateProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * @example
 * // Single permission
 * <PermissionGate permission={Permission.EDIT_PRODUCTS}>
 *   <button>Edit Product</button>
 * </PermissionGate>
 * 
 * @example
 * // Multiple permissions (any)
 * <PermissionGate permissions={[Permission.EDIT_PRODUCTS, Permission.DELETE_PRODUCTS]}>
 *   <button>Manage Products</button>
 * </PermissionGate>
 * 
 * @example
 * // Multiple permissions (all required)
 * <PermissionGate 
 *   permissions={[Permission.EDIT_PRODUCTS, Permission.ADJUST_STOCK]} 
 *   requireAll
 * >
 *   <button>Advanced Edit</button>
 * </PermissionGate>
 * 
 * @example
 * // With fallback
 * <PermissionGate 
 *   permission={Permission.VIEW_REPORTS}
 *   fallback={<p>You don't have access to reports</p>}
 * >
 *   <ReportsComponent />
 * </PermissionGate>
 */
const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
