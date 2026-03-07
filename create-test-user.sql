-- ============================================
-- CREATE TEST USERS FOR PHARMACORE
-- ============================================
-- Run this AFTER supabase-setup.sql
-- This creates a test tenant and users for testing

-- ============================================
-- 1. CREATE TEST TENANT
-- ============================================
INSERT INTO public.tenants (id, name, subdomain)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test Pharmacy',
  'test-pharmacy'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. CREATE TEST BRANCH
-- ============================================
INSERT INTO public.branches (id, tenant_id, name, location)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Main Branch',
  'Downtown Location'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. CREATE TEST USERS
-- ============================================
-- IMPORTANT: You need to create these users via Supabase Dashboard or Admin API
-- Then link them to profiles using the SQL below

-- After creating users in Supabase Auth Dashboard with these credentials:
-- Email: tenant_admin@pharmacore.local
-- Password: TestAdmin123!
-- 
-- Email: staff@pharmacore.local  
-- Password: TestStaff123!
--
-- Email: superadmin@pharmacore.local
-- Password: SuperAdmin123!

-- Then run this to link the auth users to profiles:
-- Replace the UUIDs with the actual auth.users IDs from Supabase Dashboard

-- Example (replace USER_ID_FROM_AUTH with actual UUID):
/*
INSERT INTO public.users (id, tenant_id, role, branch_id)
VALUES (
  'USER_ID_FROM_AUTH_DASHBOARD',
  '11111111-1111-1111-1111-111111111111',
  'tenant_admin',
  '22222222-2222-2222-2222-222222222222'
);
*/

-- ============================================
-- ALTERNATIVE: Use Supabase Admin API
-- ============================================
-- If you have access to Supabase Admin API, use this approach:
-- 1. Create user via API
-- 2. Automatically create profile via trigger

-- Create trigger to auto-create profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger can be customized to auto-create profiles
  -- For now, we'll create profiles manually for control
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uncomment to enable auto-profile creation
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- MANUAL STEPS TO CREATE TEST USER
-- ============================================
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create new user"
-- 3. Enter:
--    Email: tenant_admin@pharmacore.local
--    Password: TestAdmin123!
--    Auto Confirm User: YES
-- 4. Copy the User ID (UUID) from the created user
-- 5. Run this SQL (replace YOUR_USER_ID):

-- INSERT INTO public.users (id, tenant_id, role, branch_id)
-- VALUES (
--   'YOUR_USER_ID_HERE',
--   '11111111-1111-1111-1111-111111111111',
--   'tenant_admin',
--   '22222222-2222-2222-2222-222222222222'
-- );

-- ============================================
-- VERIFY SETUP
-- ============================================
-- Run these queries to verify everything is set up correctly:

-- Check tenants
SELECT * FROM public.tenants;

-- Check branches
SELECT * FROM public.branches;

-- Check users (after creating them)
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
