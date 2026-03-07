# Display Name & Dynamic Data Setup Guide

## What This Fixes

1. ✅ User display name shows from database (not hardcoded)
2. ✅ Branch name shows from database (e.g., "Main Branch")
3. ✅ Branch location shows from database (e.g., "Warshu Hospital Road")
4. ✅ User role shows properly formatted
5. ✅ User Management menu appears for tenant_admin

## Step-by-Step Instructions

### Step 1: Add display_name Column (2 minutes)

1. Open Supabase SQL Editor
2. Run this command:

```sql
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS display_name TEXT;
```

3. Verify it was added:

```sql
SELECT * FROM public.users LIMIT 1;
```

You should see a `display_name` column now.

### Step 2: Update Your Test Users (3 minutes)

Run these commands to set display names for your users:

```sql
-- Update tenant_admin
UPDATE public.users 
SET display_name = 'Pharm. Abdurrazaq O.' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'tenant_admin@pharmacore.local'
);

-- Update staff (if you created one)
UPDATE public.users 
SET display_name = 'John Doe' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'staff@pharmacore.local'
);
```

### Step 3: Update Branch Location (1 minute)

If your branch location is not "Warshu Hospital Road", update it:

```sql
UPDATE public.branches
SET location = 'Warshu Hospital Road'
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
```

### Step 4: Verify Everything (1 minute)

Run this query to see all your data:

```sql
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
```

You should see:
- `display_name`: "Pharm. Abdurrazaq O."
- `tenant_name`: "Test Pharmacy"
- `branch_name`: "Main Branch"
- `branch_location`: "Warshu Hospital Road"

### Step 5: Test in Your App (2 minutes)

1. Refresh your app (or restart if needed)
2. Login as tenant_admin
3. Check the header - should show:
   - **Branch name**: "Main Branch" (not "Main Pharmacy")
   - **Location**: "Warshu Hospital Road" (not "Terminal #01")
4. Check the sidebar footer - should show:
   - **Name**: "Pharm. Abdurrazaq O."
   - **Role**: "tenant admin" (formatted nicely)
5. Check the menu - should see "User Management" under Administration section

## What Changed in the Code

### 1. Database Schema
- Added `display_name` column to `users` table

### 2. TypeScript Types (`types.ts`)
```typescript
export interface UserProfile {
  id: string;
  tenant_id: string;
  role: UserRole;
  branch_id?: string;
  display_name?: string;  // NEW
  tenant?: {              // NEW
    id: string;
    name: string;
  };
  branch?: {              // NEW
    id: string;
    name: string;
    location?: string;
  };
}
```

### 3. AuthContext (`contexts/AuthContext.tsx`)
Now fetches joined data:
```typescript
const { data, error } = await supabase
  .from('users')
  .select(`
    *,
    tenant:tenants(id, name, subdomain),
    branch:branches(id, name, location)
  `)
  .eq('id', userId)
  .single();
```

### 4. Layout Component (`components/Layout.tsx`)
Now uses dynamic data:
```typescript
// Branch name
{profile?.branch?.name || profile?.tenant?.name || 'Main Pharmacy'}

// Branch location
{profile?.branch?.location || 'Terminal #01'}

// User display name
{profile?.display_name || 'User'}

// User role (formatted)
{profile?.role?.replace('_', ' ') || 'Staff'}
```

## Troubleshooting

### Issue: Display name not showing
**Solution**: 
- Verify column was added: `SELECT * FROM public.users;`
- Verify data was updated: Check the query in Step 4
- Refresh your app or clear cache

### Issue: Branch name still shows "Main Pharmacy"
**Solution**:
- Check your branch name in database: `SELECT * FROM public.branches;`
- If it's not "Main Branch", update it:
  ```sql
  UPDATE public.branches 
  SET name = 'Main Branch' 
  WHERE id = '22222222-2222-2222-2222-222222222222';
  ```

### Issue: Location still shows "Terminal #01"
**Solution**:
- Run the UPDATE command from Step 3
- Verify: `SELECT * FROM public.branches;`

### Issue: User Management not appearing
**Solution**:
- Verify you're logged in as tenant_admin
- Check permission in console:
  ```javascript
  // In browser console
  console.log(profile.role); // Should be "tenant_admin"
  ```
- The menu only shows for tenant_admin and superadmin roles

### Issue: Role shows "tenant_admin" instead of "Tenant Admin"
**Solution**:
- This is expected - the code formats it by replacing underscores with spaces
- If you want different formatting, update the Layout component

## Expected Results

### Desktop Header
```
┌─────────────────────────────────────┐
│ [Store Icon] Main Branch            │
│              Warshu Hospital Road   │
└─────────────────────────────────────┘
```

### Sidebar Footer
```
┌─────────────────────────────────────┐
│ [Avatar] Pharm. Abdurrazaq O.       │
│          tenant admin               │
└─────────────────────────────────────┘
```

### Menu (for tenant_admin)
```
Main Menu
  - Dashboard
  - Sales / POS
  - Inventory
  - Patients
  - Reports

Administration
  - User Management  ← NEW!
```

## Next Steps

After completing this setup:
1. ✅ Test login with tenant_admin
2. ✅ Verify all dynamic data shows correctly
3. ✅ Click "User Management" to access user management page
4. ✅ Test with staff user (should NOT see User Management)
5. ✅ Create more users with proper display names

## Quick Reference

### Add New User with Display Name
```sql
-- 1. Create user in Supabase Dashboard
-- 2. Link to profile with display name
INSERT INTO public.users (id, tenant_id, role, branch_id, display_name)
VALUES (
  'USER_ID_FROM_DASHBOARD',
  '11111111-1111-1111-1111-111111111111',
  'staff',
  '22222222-2222-2222-2222-222222222222',
  'Jane Smith'  -- Display name
);
```

### Update Existing User Display Name
```sql
UPDATE public.users 
SET display_name = 'New Name' 
WHERE id = 'USER_ID';
```

### Update Branch Info
```sql
UPDATE public.branches 
SET 
  name = 'New Branch Name',
  location = 'New Location'
WHERE id = 'BRANCH_ID';
```

---

**Total Time**: ~10 minutes  
**Difficulty**: Easy  
**Status**: Ready to implement
