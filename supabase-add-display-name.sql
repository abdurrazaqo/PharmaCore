-- ============================================
-- ADD DISPLAY NAME TO USERS TABLE
-- ============================================
-- Run this to add display_name field to existing users table

-- Add display_name column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing test users with display names
-- Replace the UUIDs with your actual user IDs from the database

-- Example updates (replace with your actual user IDs):
-- UPDATE public.users 
-- SET display_name = 'Pharm. Abdurrazaq O.' 
-- WHERE role = 'tenant_admin';

-- UPDATE public.users 
-- SET display_name = 'John Doe' 
-- WHERE role = 'staff';

-- UPDATE public.users 
-- SET display_name = 'Super Admin' 
-- WHERE role = 'superadmin';

-- ============================================
-- VERIFY CHANGES
-- ============================================
SELECT 
  u.id,
  u.display_name,
  u.role,
  au.email,
  t.name as tenant_name,
  b.name as branch_name,
  b.location as branch_location
FROM public.users u
JOIN auth.users au ON au.id = u.id
LEFT JOIN public.tenants t ON t.id = u.tenant_id
LEFT JOIN public.branches b ON b.id = u.branch_id;
