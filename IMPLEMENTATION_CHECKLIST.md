# PharmaCore RBAC Implementation Checklist

Use this checklist to track your implementation progress.

## Phase 1: Database Setup ⏱️ 15 minutes

### Supabase Configuration
- [ ] Open Supabase project dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy contents of `supabase-setup.sql`
- [ ] Execute SQL script
- [ ] Verify no errors in output
- [ ] Copy contents of `supabase-audit-logs.sql`
- [ ] Execute SQL script
- [ ] Verify no errors in output

### Verify Tables Created
- [ ] Check `public.users` table exists
- [ ] Check `public.tenants` table exists
- [ ] Check `public.branches` table exists
- [ ] Check `public.audit_logs` table exists
- [ ] Verify RLS is enabled on all tables

## Phase 2: Test User Creation ⏱️ 10 minutes

### Create Test Tenant & Branch
- [ ] Run tenant creation SQL from `create-test-user.sql`
- [ ] Run branch creation SQL from `create-test-user.sql`
- [ ] Verify tenant exists: `SELECT * FROM public.tenants;`
- [ ] Verify branch exists: `SELECT * FROM public.branches;`

### Create Test Users via Dashboard

#### TENANT_ADMIN User
- [ ] Go to Authentication → Users
- [ ] Click "Add User"
- [ ] Email: `tenant_admin@pharmacore.local`
- [ ] Password: `TestAdmin123!`
- [ ] Check "Auto Confirm User"
- [ ] Click "Create user"
- [ ] Copy User ID
- [ ] Run INSERT to link profile (replace USER_ID)
- [ ] Verify profile: `SELECT * FROM public.users WHERE id = 'USER_ID';`

#### STAFF User (Optional)
- [ ] Create user: `staff@pharmacore.local`
- [ ] Password: `TestStaff123!`
- [ ] Auto-confirm user
- [ ] Copy User ID
- [ ] Link profile with role='staff'
- [ ] Verify profile created

#### SUPERADMIN User (Optional)
- [ ] Create user: `superadmin@pharmacore.local`
- [ ] Password: `SuperAdmin123!`
- [ ] Auto-confirm user
- [ ] Copy User ID
- [ ] Link profile with role='superadmin'
- [ ] Verify profile created

## Phase 3: Test Authentication ⏱️ 5 minutes

### Login Testing
- [ ] Start your application
- [ ] Navigate to `/login`
- [ ] Enter username: `tenant_admin`
- [ ] Enter password: `TestAdmin123!`
- [ ] Click "Sign in"
- [ ] Verify redirect to dashboard
- [ ] Check browser console for errors
- [ ] Verify user info in AuthContext (React DevTools)

### Session Testing
- [ ] Refresh page
- [ ] Verify user stays logged in
- [ ] Click logout
- [ ] Verify redirect to login page
- [ ] Verify cannot access protected routes

## Phase 4: Apply RBAC to Components ⏱️ 2-4 hours

### Inventory Component
- [ ] Import `usePermissions` hook
- [ ] Import `PermissionGate` component
- [ ] Wrap "Add Product" button with PermissionGate
- [ ] Add permission check to edit function
- [ ] Add permission check to delete function
- [ ] Test with STAFF user (should see limited UI)
- [ ] Test with TENANT_ADMIN (should see full UI)

### POS Component
- [ ] Add PermissionGate for discount button
- [ ] Add PermissionGate for return button
- [ ] Check Permission.PROCESS_SALES before sale
- [ ] Test with different roles

### Customers Component
- [ ] Wrap edit button with PermissionGate
- [ ] Wrap delete button with PermissionGate
- [ ] Add permission checks to handlers
- [ ] Test with different roles

### Reports Component
- [ ] Add PermissionGate for financial reports
- [ ] Add PermissionGate for export button
- [ ] Check Permission.VIEW_REPORTS
- [ ] Test with STAFF (should not see)
- [ ] Test with TENANT_ADMIN (should see)

### User Management (if exists)
- [ ] Wrap entire component with PermissionGate
- [ ] Require Permission.VIEW_USERS
- [ ] Add checks for create/edit/delete
- [ ] Test only TENANT_ADMIN can access

## Phase 5: Add Audit Logging ⏱️ 1-2 hours

### Product Operations
- [ ] Import `auditLog` service
- [ ] Import `AuditAction` enum
- [ ] Add log to product creation
- [ ] Add log to product update (with old/new values)
- [ ] Add log to product deletion
- [ ] Add log to stock adjustment
- [ ] Test and verify logs created

### Sales Operations
- [ ] Add log to sale completion
- [ ] Add log to refund/return
- [ ] Add log to discount application
- [ ] Test and verify logs created

### Customer Operations
- [ ] Add log to customer creation
- [ ] Add log to customer update
- [ ] Add log to customer deletion
- [ ] Test and verify logs created

### User Operations
- [ ] Add log to user creation
- [ ] Add log to user update
- [ ] Add log to user deletion
- [ ] Test and verify logs created

### Verify Audit Logs
- [ ] Run: `SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT 10;`
- [ ] Verify logs contain correct data
- [ ] Verify tenant_id is correct
- [ ] Verify user_id is correct
- [ ] Verify old_values and new_values are captured

## Phase 6: Testing ⏱️ 1-2 hours

### STAFF Role Testing
- [ ] Login as STAFF user
- [ ] Can view inventory
- [ ] Can process sales
- [ ] Can view customers
- [ ] Cannot see edit product button
- [ ] Cannot see delete product button
- [ ] Cannot access user management
- [ ] Cannot see financial reports
- [ ] Cannot access /superadmin route

### TENANT_ADMIN Role Testing
- [ ] Login as TENANT_ADMIN user
- [ ] Can do everything STAFF can
- [ ] Can see edit product button
- [ ] Can see delete product button
- [ ] Can access user management
- [ ] Can see financial reports
- [ ] Can manage settings
- [ ] Cannot access /superadmin route
- [ ] Cannot see other tenants' data

### SUPERADMIN Role Testing
- [ ] Login as SUPERADMIN user
- [ ] Can access /superadmin route
- [ ] Can see all tenants
- [ ] Can access all features
- [ ] Can view all audit logs

### Data Isolation Testing
- [ ] Create second tenant
- [ ] Create user in second tenant
- [ ] Login as first tenant user
- [ ] Verify cannot see second tenant's data
- [ ] Login as second tenant user
- [ ] Verify cannot see first tenant's data
- [ ] Login as SUPERADMIN
- [ ] Verify can see both tenants' data

### Audit Log Testing
- [ ] Perform various actions
- [ ] Check audit logs are created
- [ ] Verify correct user_id
- [ ] Verify correct tenant_id
- [ ] Verify old/new values captured
- [ ] Test audit log viewer component

## Phase 7: Security Review ⏱️ 30 minutes

### RLS Policy Verification
- [ ] Verify users can only see their tenant's data
- [ ] Verify STAFF cannot see admin data
- [ ] Verify tenant isolation works
- [ ] Test with SQL queries directly
- [ ] Verify policies cannot be bypassed

### Frontend Security
- [ ] All sensitive buttons wrapped with PermissionGate
- [ ] All sensitive routes protected
- [ ] Permission checks before operations
- [ ] No sensitive data exposed in console
- [ ] No API keys in frontend code

### Backend Security
- [ ] RLS enabled on all tables
- [ ] Policies tested and working
- [ ] Audit logging captures all actions
- [ ] No way to bypass tenant isolation
- [ ] Session timeout configured

## Phase 8: Documentation ⏱️ 30 minutes

### Code Documentation
- [ ] Add comments to permission checks
- [ ] Document custom permissions
- [ ] Document audit log usage
- [ ] Update README with auth info

### Team Documentation
- [ ] Share RBAC_QUICK_REFERENCE.md with team
- [ ] Document how to create new users
- [ ] Document how to add new permissions
- [ ] Document how to add audit logging

## Phase 9: Production Preparation ⏱️ 1 hour

### Environment Variables
- [ ] Move Supabase URL to env variable
- [ ] Move Supabase key to env variable
- [ ] Remove hardcoded credentials
- [ ] Update .env.example
- [ ] Verify .env.local is gitignored

### Security Hardening
- [ ] Review all RLS policies
- [ ] Enable email verification
- [ ] Configure password requirements
- [ ] Set up password reset flow
- [ ] Configure session timeout
- [ ] Review audit log retention

### Performance
- [ ] Add database indexes
- [ ] Optimize RLS policies
- [ ] Test with large datasets
- [ ] Monitor query performance

### Monitoring
- [ ] Set up error logging
- [ ] Monitor failed login attempts
- [ ] Monitor audit log growth
- [ ] Set up alerts for suspicious activity

## Phase 10: Deployment ⏱️ 30 minutes

### Pre-Deployment
- [ ] Run all tests
- [ ] Verify all checklist items complete
- [ ] Backup database
- [ ] Document rollback procedure

### Deployment
- [ ] Deploy to staging
- [ ] Test all functionality
- [ ] Test with real users
- [ ] Monitor for errors
- [ ] Deploy to production

### Post-Deployment
- [ ] Verify login works
- [ ] Verify permissions work
- [ ] Verify audit logs work
- [ ] Monitor for issues
- [ ] Gather user feedback

## Completion Status

**Total Estimated Time**: 8-12 hours

### Progress Tracker
- [ ] Phase 1: Database Setup (15 min)
- [ ] Phase 2: Test User Creation (10 min)
- [ ] Phase 3: Test Authentication (5 min)
- [ ] Phase 4: Apply RBAC to Components (2-4 hours)
- [ ] Phase 5: Add Audit Logging (1-2 hours)
- [ ] Phase 6: Testing (1-2 hours)
- [ ] Phase 7: Security Review (30 min)
- [ ] Phase 8: Documentation (30 min)
- [ ] Phase 9: Production Preparation (1 hour)
- [ ] Phase 10: Deployment (30 min)

### Sign-off
- [ ] Developer tested and approved
- [ ] Security review completed
- [ ] Documentation complete
- [ ] Ready for production

---

**Date Started**: _______________  
**Date Completed**: _______________  
**Completed By**: _______________

## Notes

Use this section to track issues, questions, or important decisions:

```
[Date] [Issue/Note]
______________________________________
______________________________________
______________________________________
______________________________________
```
