# Supabase Authentication Setup Guide

## Overview
This guide walks you through setting up Supabase authentication for PharmaCore with role-based access control.

## Prerequisites
- Supabase project created
- Access to Supabase SQL Editor
- Access to Supabase Authentication Dashboard

## Step-by-Step Setup

### Step 1: Run Database Setup
1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-setup.sql`
4. Click **Run** to execute
5. Verify no errors appear

This creates:
- `users` table (extends auth.users)
- `tenants` table
- `branches` table
- Row Level Security (RLS) policies
- Helper functions and triggers

### Step 2: Create Test Tenant & Branch
1. Still in SQL Editor
2. Copy the tenant and branch creation sections from `create-test-user.sql`
3. Run to create test tenant and branch

### Step 3: Create Test User (Manual Method)

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Fill in:
   - **Email**: `tenant_admin@pharmacore.local`
   - **Password**: `TestAdmin123!`
   - **Auto Confirm User**: ✅ YES (important!)
4. Click **Create user**
5. **Copy the User ID** (UUID) that appears

#### Option B: Via SQL (Advanced)
```sql
-- This requires admin privileges and may not work in all Supabase setups
-- Use Dashboard method if this fails
```

### Step 4: Link Auth User to Profile
1. Go back to **SQL Editor**
2. Run this query (replace `YOUR_USER_ID` with the UUID from Step 3):

```sql
INSERT INTO public.users (id, tenant_id, role, branch_id)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with actual UUID
  '11111111-1111-1111-1111-111111111111',  -- Test tenant ID
  'tenant_admin',
  '22222222-2222-2222-2222-222222222222'   -- Test branch ID
);
```

### Step 5: Verify Setup
Run this verification query:

```sql
SELECT 
  u.id,
  u.tenant_id,
  u.role,
  u.branch_id,
  au.email,
  t.name as tenant_name,
  b.name as branch_name
FROM public.users u
JOIN auth.users au ON au.id = u.id
LEFT JOIN public.tenants t ON t.id = u.tenant_id
LEFT JOIN public.branches b ON b.id = u.branch_id;
```

You should see your test user with all details populated.

### Step 6: Test Login
1. Start your PharmaCore app
2. Navigate to `/login`
3. Enter:
   - **Username**: `tenant_admin`
   - **Password**: `TestAdmin123!`
4. Click **Sign in**
5. You should be redirected to the dashboard

## Creating Additional Test Users

### Superadmin User
```sql
-- 1. Create in Dashboard:
-- Email: superadmin@pharmacore.local
-- Password: SuperAdmin123!

-- 2. Link to profile (replace USER_ID):
INSERT INTO public.users (id, tenant_id, role, branch_id)
VALUES (
  'USER_ID_HERE',
  '11111111-1111-1111-1111-111111111111',
  'superadmin',
  NULL
);
```

### Staff User
```sql
-- 1. Create in Dashboard:
-- Email: staff@pharmacore.local
-- Password: TestStaff123!

-- 2. Link to profile (replace USER_ID):
INSERT INTO public.users (id, tenant_id, role, branch_id)
VALUES (
  'USER_ID_HERE',
  '11111111-1111-1111-1111-111111111111',
  'staff',
  '22222222-2222-2222-2222-222222222222'
);
```

## Troubleshooting

### Issue: "User not found" error
- Verify user was created in Authentication → Users
- Check that email is confirmed (Auto Confirm User was checked)
- Verify profile was created in `public.users` table

### Issue: "Invalid login credentials"
- Double-check password (case-sensitive)
- Ensure user email is confirmed
- Try resetting password in Supabase Dashboard

### Issue: "Profile not found" after login
- Run the verification query to check if profile exists
- If missing, run the INSERT statement to create profile
- Ensure `tenant_id` matches an existing tenant

### Issue: RLS policy blocking access
- Verify RLS policies were created correctly
- Check that user's role is set correctly in `public.users`
- Test with RLS disabled temporarily (not for production!)

## Security Notes

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access data within their tenant
- Superadmins can access all data
- Tenant admins can manage their tenant's users

### Password Requirements
For production, enforce strong passwords:
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, symbols
- Configure in Supabase → Authentication → Policies

### Environment Variables
Never commit these to git:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Keep them in `.env.local` (already gitignored)

## Next Steps

1. ✅ Complete database setup
2. ✅ Create test users
3. ✅ Test login functionality
4. 🔲 Configure email templates (optional)
5. 🔲 Set up password reset flow
6. 🔲 Add user management UI
7. 🔲 Configure production security policies

## Useful Supabase Queries

### List all users with profiles
```sql
SELECT 
  au.email,
  u.role,
  t.name as tenant,
  b.name as branch
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
LEFT JOIN public.tenants t ON t.id = u.tenant_id
LEFT JOIN public.branches b ON b.id = u.branch_id
ORDER BY au.created_at DESC;
```

### Check RLS policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### Reset user password (as admin)
```sql
-- Do this via Dashboard: Authentication → Users → [User] → Reset Password
```

## Support
If you encounter issues:
1. Check Supabase logs: Dashboard → Logs
2. Verify RLS policies are correct
3. Test with a fresh user account
4. Check browser console for errors
