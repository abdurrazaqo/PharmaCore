-- ============================================
-- UPDATE USER DISPLAY NAMES
-- ============================================
-- Run this after adding the display_name column

-- First, let's see all your users
SELECT 
  u.id,
  au.email,
  u.role,
  u.display_name,
  t.name as tenant_name,
  b.name as branch_name,
  b.location as branch_location
FROM public.users u
JOIN auth.users au ON au.id = u.id
LEFT JOIN public.tenants t ON t.id = u.tenant_id
LEFT JOIN public.branches b ON b.id = u.branch_id;

-- ============================================
-- UPDATE DISPLAY NAMES
-- ============================================
-- Copy the user IDs from the query above and update below

-- Update tenant_admin user
UPDATE public.users 
SET display_name = 'Pharm. Abdurrazaq O.' 
WHERE email IN (
  SELECT email FROM auth.users WHERE email = 'tenant_admin@pharmacore.local'
);

-- Alternative: Update by user ID (replace with actual ID)
-- UPDATE public.users 
-- SET display_name = 'Pharm. Abdurrazaq O.' 
-- WHERE id = 'YOUR_USER_ID_HERE';

-- Update staff user (if you created one)
UPDATE public.users 
SET display_name = 'John Doe' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'staff@pharmacore.local'
);

-- Update superadmin user (if you created one)
UPDATE public.users 
SET display_name = 'Super Admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'superadmin@pharmacore.local'
);

-- ============================================
-- VERIFY UPDATES
-- ============================================
SELECT 
  u.id,
  au.email,
  u.display_name,
  u.role,
  t.name as tenant_name,
  b.name as branch_name,
  b.location as branch_location
FROM public.users u
JOIN auth.users au ON au.id = u.id
LEFT JOIN public.tenants t ON t.id = u.tenant_id
LEFT JOIN public.branches b ON b.id = u.branch_id
ORDER BY u.role;

-- ============================================
-- UPDATE BRANCH LOCATION (if needed)
-- ============================================
-- If your branch location is not "Warshu Hospital Road", update it:

UPDATE public.branches
SET location = 'Warshu Hospital Road'
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Verify branch update
SELECT * FROM public.branches;
