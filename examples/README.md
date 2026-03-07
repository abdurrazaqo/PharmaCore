# RBAC Implementation Examples

This folder contains practical examples showing how to integrate Role-Based Access Control (RBAC) into your PharmaCore components.

## Files

### InventoryWithRBAC.example.tsx
Complete example showing:
- Permission checking before operations
- Using PermissionGate for conditional rendering
- Audit logging for all CRUD operations
- Proper error handling
- User feedback

## How to Use These Examples

1. **Study the patterns** - See how permissions and audit logs are used
2. **Copy the approach** - Apply similar patterns to your components
3. **Adapt as needed** - Modify for your specific use cases

## Key Patterns

### Pattern 1: Permission Check Before Action
```typescript
if (!hasPermission(Permission.CREATE_PRODUCTS)) {
  alert('You do not have permission');
  return;
}
// Proceed with action
```

### Pattern 2: Conditional UI Rendering
```typescript
<PermissionGate permission={Permission.EDIT_PRODUCTS}>
  <button>Edit</button>
</PermissionGate>
```

### Pattern 3: Audit Logging
```typescript
await auditLog.log({
  tenantId: profile.tenant_id,
  action: AuditAction.PRODUCT_CREATED,
  resourceType: 'product',
  resourceId: product.id,
  newValues: product,
});
```

### Pattern 4: Multiple Permissions
```typescript
<PermissionGate 
  permissions={[Permission.EDIT_PRODUCTS, Permission.DELETE_PRODUCTS]}
>
  <AdminPanel />
</PermissionGate>
```

## Integration Checklist

When adding RBAC to a component:

- [ ] Import usePermissions hook
- [ ] Import PermissionGate component
- [ ] Import auditLog service
- [ ] Add permission checks before sensitive operations
- [ ] Wrap UI elements with PermissionGate
- [ ] Add audit logging for all CRUD operations
- [ ] Test with different user roles
- [ ] Verify RLS policies protect backend

## Testing

Test each component with:
1. STAFF role - Should have limited access
2. TENANT_ADMIN role - Should have full access
3. SUPERADMIN role - Should have all access

## Need Help?

Refer to:
- `RBAC_IMPLEMENTATION.md` - Complete RBAC guide
- `SUPABASE_SETUP_GUIDE.md` - Database setup
- `AUTHENTICATION_COMPLETE.md` - Overview
