# Rollback Complete: In-App User Creation Removed

## What Was Removed

### Code Files Deleted
✓ `services/userService.ts` - User service with create user logic
✓ `supabase/functions/create-user/index.ts` - Edge Function for user creation

### Documentation Files Deleted
✓ `EDGE_FUNCTION_SETUP.md`
✓ `EDGE_FUNCTION_FIX.md`
✓ `DEPLOY_VIA_DASHBOARD.md`
✓ `USER_CREATION_READY.md`
✓ `QUICK_START_USER_CREATION.md`

### Code Changes Made
✓ `components/UserManagement.tsx` - Removed "Add User" button and modal
✓ `components/UserManagement.tsx` - Removed userService import
✓ `components/UserManagement.tsx` - Added info box explaining SQL-based user creation

## Supabase Cleanup Required

You still need to manually delete the Edge Function from Supabase:

1. Go to: https://supabase.com/dashboard/project/hmjclidojxubpvgsiegu/functions
2. Find the `create-user` function
3. Click the three dots menu (⋮)
4. Select "Delete"
5. Confirm deletion

### Optional: Remove Secrets
If you want to clean up completely:
1. Go to: https://supabase.com/dashboard/project/hmjclidojxubpvgsiegu/functions/secrets
2. Delete the `SERVICE_ROLE_KEY` secret (if you're not using it elsewhere)

## How to Create Users Now

Use the SQL method via Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/hmjclidojxubpvgsiegu/sql
2. Open the `create-test-user.sql` file from your project
3. Modify the values:
   - Email
   - Password
   - Display name
   - Role
   - Tenant ID
   - Branch ID (optional)
4. Run the query

### Example SQL
```sql
-- Create auth user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'newuser@pharmacore.local',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"display_name": "New User"}'::jsonb,
  now(),
  now()
)
RETURNING id;

-- Then create user profile with the returned ID
INSERT INTO public.users (id, tenant_id, role, display_name)
VALUES (
  '[ID from above]',
  '[your-tenant-id]',
  'staff',
  'New User'
);
```

## Current State

Your app now:
- Shows user list in User Management
- Allows viewing user details
- Allows deleting users (if you have permission)
- Does NOT allow creating users via the UI
- Requires SQL queries for user creation

This is a simpler, more secure approach for small teams.
