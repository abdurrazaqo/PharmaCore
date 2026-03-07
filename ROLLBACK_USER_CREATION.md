# Rollback Guide: Remove In-App User Creation

## Files to Delete

### 1. Delete Edge Function Files
- `supabase/functions/create-user/index.ts`

### 2. Delete Service Files
- `services/userService.ts`

### 3. Delete Documentation Files
- `EDGE_FUNCTION_SETUP.md`
- `EDGE_FUNCTION_FIX.md`
- `DEPLOY_VIA_DASHBOARD.md`
- `USER_CREATION_READY.md`
- `QUICK_START_USER_CREATION.md`

## Code Changes Required

### 1. Update UserManagement.tsx
Remove the "Add User" functionality and revert to view-only mode.

### 2. Supabase Changes
Delete the Edge Function from Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/hmjclidojxubpvgsiegu/functions
2. Find the `create-user` function
3. Click the three dots menu
4. Select "Delete"
5. Confirm deletion

### 3. Remove Secrets (Optional)
If you want to clean up completely:
1. Go to: https://supabase.com/dashboard/project/hmjclidojxubpvgsiegu/functions/secrets
2. Delete `SERVICE_ROLE_KEY` secret

## Alternative: Keep SQL-Based User Creation

You can still create users using SQL in the Supabase SQL Editor:
- Use the file: `create-test-user.sql`
- This method is simpler and doesn't require Edge Functions

## Rollback Complete
After these changes, user creation will only be possible via SQL queries in Supabase Dashboard.
