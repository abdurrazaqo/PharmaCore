# RBAC Quick Reference Card

## 🎯 Quick Start

### 1. Check Permission in Code
```typescript
import { usePermissions, Permission } from './hooks/usePermissions';

const { hasPermission } = usePermissions();

if (hasPermission(Permission.EDIT_PRODUCTS)) {
  // User can edit products
}
```

### 2. Hide/Show UI Elements
```typescript
import PermissionGate from './components/PermissionGate';
import { Permission } from './hooks/usePermissions';

<PermissionGate permission={Permission.DELETE_PRODUCTS}>
  <button>Delete</button>
</PermissionGate>
```

### 3. Log User Actions
```typescript
import { auditLog, AuditAction } from './services/auditLog';

await auditLog.log({
  tenantId: profile.tenant_id,
  action: AuditAction.PRODUCT_CREATED,
  resourceType: 'product',
  resourceId: product.id,
  newValues: product,
});
```

### 4. Protect Routes
```typescript
import RoleBasedRoute from './components/RoleBasedRoute';
import { UserRole } from './types';

<Route path="/admin" element={
  <RoleBasedRoute allowedRoles={[UserRole.TENANT_ADMIN]}>
    <AdminPanel />
  </RoleBasedRoute>
} />
```

## 📋 Available Permissions

### User Management
- `Permission.VIEW_USERS`
- `Permission.CREATE_USERS`
- `Permission.EDIT_USERS`
- `Permission.DELETE_USERS`

### Product/Inventory
- `Permission.VIEW_INVENTORY`
- `Permission.CREATE_PRODUCTS`
- `Permission.EDIT_PRODUCTS`
- `Permission.DELETE_PRODUCTS`
- `Permission.ADJUST_STOCK`

### Sales/POS
- `Permission.VIEW_POS`
- `Permission.PROCESS_SALES`
- `Permission.PROCESS_RETURNS`
- `Permission.APPLY_DISCOUNTS`

### Customers
- `Permission.VIEW_CUSTOMERS`
- `Permission.CREATE_CUSTOMERS`
- `Permission.EDIT_CUSTOMERS`
- `Permission.DELETE_CUSTOMERS`
- `Permission.VIEW_CUSTOMER_HISTORY`

### Reports
- `Permission.VIEW_REPORTS`
- `Permission.EXPORT_REPORTS`
- `Permission.VIEW_FINANCIAL_REPORTS`

### Settings
- `Permission.VIEW_SETTINGS`
- `Permission.EDIT_SETTINGS`
- `Permission.MANAGE_BRANCHES`

### Tenant Management (Superadmin)
- `Permission.VIEW_ALL_TENANTS`
- `Permission.CREATE_TENANTS`
- `Permission.EDIT_TENANTS`
- `Permission.DELETE_TENANTS`

## 🔐 User Roles

### STAFF
Basic operational access:
- View inventory
- Process sales
- View/create customers
- Cannot edit products
- Cannot manage users

### TENANT_ADMIN
Full tenant management:
- All STAFF permissions
- Manage products
- Manage users
- View reports
- Manage settings
- Cannot access other tenants

### SUPERADMIN
Platform-wide access:
- All permissions
- Access all tenants
- Manage tenants
- System configuration

## 🎨 Common Patterns

### Pattern: Multiple Permissions (Any)
```typescript
<PermissionGate permissions={[
  Permission.EDIT_PRODUCTS,
  Permission.DELETE_PRODUCTS
]}>
  <AdminPanel />
</PermissionGate>
```

### Pattern: Multiple Permissions (All Required)
```typescript
<PermissionGate 
  permissions={[
    Permission.EDIT_PRODUCTS,
    Permission.ADJUST_STOCK
  ]}
  requireAll
>
  <AdvancedEditor />
</PermissionGate>
```

### Pattern: With Fallback
```typescript
<PermissionGate 
  permission={Permission.VIEW_REPORTS}
  fallback={<p>Access denied</p>}
>
  <Reports />
</PermissionGate>
```

### Pattern: Conditional Rendering
```typescript
const { hasPermission } = usePermissions();

{hasPermission(Permission.EDIT_PRODUCTS) && (
  <EditButton />
)}
```

### Pattern: Check Multiple
```typescript
const { hasAnyPermission, hasAllPermissions } = usePermissions();

// User has at least one permission
if (hasAnyPermission([Permission.EDIT_PRODUCTS, Permission.DELETE_PRODUCTS])) {
  // Show admin panel
}

// User has all permissions
if (hasAllPermissions([Permission.EDIT_PRODUCTS, Permission.ADJUST_STOCK])) {
  // Show advanced features
}
```

## 📝 Audit Actions

### User Actions
- `AuditAction.USER_LOGIN`
- `AuditAction.USER_LOGOUT`
- `AuditAction.USER_CREATED`
- `AuditAction.USER_UPDATED`
- `AuditAction.USER_DELETED`

### Product Actions
- `AuditAction.PRODUCT_CREATED`
- `AuditAction.PRODUCT_UPDATED`
- `AuditAction.PRODUCT_DELETED`
- `AuditAction.STOCK_ADJUSTED`

### Sales Actions
- `AuditAction.SALE_COMPLETED`
- `AuditAction.SALE_REFUNDED`
- `AuditAction.DISCOUNT_APPLIED`

### Customer Actions
- `AuditAction.CUSTOMER_CREATED`
- `AuditAction.CUSTOMER_UPDATED`
- `AuditAction.CUSTOMER_DELETED`

## 🔍 Audit Log Queries

### Get Tenant Logs
```typescript
const logs = await auditLog.getTenantLogs(tenantId, 100);
```

### Get User Logs
```typescript
const logs = await auditLog.getUserLogs(userId, 50);
```

### Get Resource Logs
```typescript
const logs = await auditLog.getResourceLogs('product', productId);
```

### Search Logs
```typescript
const logs = await auditLog.searchLogs({
  tenantId: 'xxx',
  action: 'product.deleted',
  startDate: new Date('2026-01-01'),
  limit: 100,
});
```

## ⚡ Quick Tips

1. **Always check permissions** before sensitive operations
2. **Log all CRUD operations** for audit trail
3. **Use PermissionGate** for cleaner UI code
4. **Test with all roles** before deploying
5. **Never trust frontend** - verify with RLS policies
6. **Keep audit logs** for compliance and debugging

## 🐛 Common Issues

### Permission not working?
- Check user's role in database
- Verify permission is in `rolePermissions` map
- Check RLS policies in Supabase

### Audit log not created?
- Verify `supabase-audit-logs.sql` was run
- Check user is authenticated
- Look for errors in console

### User can't access route?
- Verify user's role matches `allowedRoles`
- Check `ProtectedRoute` is wrapping the route
- Ensure user profile is loaded

## 📚 Documentation

- `AUTHENTICATION_COMPLETE.md` - Full overview
- `RBAC_IMPLEMENTATION.md` - Detailed guide
- `SUPABASE_SETUP_GUIDE.md` - Database setup
- `examples/` - Code examples

---

**Keep this handy while implementing RBAC in your components!**
