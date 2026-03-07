-- ============================================
-- QUICK FIX: Disable RLS temporarily
-- ============================================
-- The RLS policies are causing infinite recursion
-- Let's disable them temporarily so you can see your changes

-- Disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Disable RLS on tenants table
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- Disable RLS on branches table
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;

-- Now try logging in again!

-- ============================================
-- TO RE-ENABLE LATER (after we fix the policies)
-- ============================================
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
