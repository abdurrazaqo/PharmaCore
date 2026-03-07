-- ============================================
-- QUICK FIX - Run these commands one by one
-- ============================================

-- Step 1: Add display_name column (if not already added)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Step 2: First, let's see your users to get the correct ID
SELECT 
  u.id,
  au.email,
  u.role,
  u.display_name
FROM public.users u
JOIN auth.users au ON au.id = u.id;

-- Step 3: Copy the ID from the result above for tenant_admin user
-- Then run this UPDATE command, replacing 'YOUR_USER_ID' with the actual ID

-- UPDATE public.users 
-- SET display_name = 'Pharm. Abdurrazaq O.' 
-- WHERE id = 'YOUR_USER_ID_HERE';

-- OR if you see the email in the results, use this approach:
UPDATE public.users 
SET display_name = 'Pharm. Abdurrazaq O.' 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'tenant_admin@pharmacore.local'
);

-- Step 4: Update staff user (if you created one)
UPDATE public.users 
SET display_name = 'John Doe' 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'staff@pharmacore.local'
);

-- Step 5: Update branch location
UPDATE public.branches
SET location = 'Warshu Hospital Road'
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Step 6: Verify everything worked
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
LEFT JOIN public.branches b ON b.id = u.branch_id;

-- ============================================
-- ALTERNATIVE: Update by ID directly
-- ============================================
-- If the subquery doesn't work, do it in two steps:

-- 1. Get the user ID
-- SELECT id FROM auth.users WHERE email = 'tenant_admin@pharmacore.local';

-- 2. Copy the ID and use it here (replace the ID below)
-- UPDATE public.users 
-- SET display_name = 'Pharm. Abdurrazaq O.' 
-- WHERE id = 'paste-the-id-here';
