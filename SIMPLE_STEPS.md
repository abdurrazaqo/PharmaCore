# Simple Steps to Fix Everything

## Step 1: Add the column

Copy and paste this into Supabase SQL Editor, then click Run:

```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;
```

✅ You should see: "Success. No rows returned"

---

## Step 2: Find your user ID

Copy and paste this, then click Run:

```sql
SELECT 
  u.id,
  au.email,
  u.role
FROM public.users u
JOIN auth.users au ON au.id = u.id;
```

✅ You should see a table with your users. Copy the `id` for the tenant_admin user.

Example result:
```
id: abc123-def456-ghi789
email: tenant_admin@pharmacore.local
role: tenant_admin
```

---

## Step 3: Update display name

Replace `YOUR_USER_ID_HERE` with the ID you copied, then run:

```sql
UPDATE public.users 
SET display_name = 'Pharm. Abdurrazaq O.' 
WHERE id = 'YOUR_USER_ID_HERE';
```

✅ You should see: "Success. 1 row updated"

---

## Step 4: Update branch location

Copy and paste this, then click Run:

```sql
UPDATE public.branches
SET location = 'Warshu Hospital Road'
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
```

✅ You should see: "Success. 1 row updated"

---

## Step 5: Verify it worked

Copy and paste this, then click Run:

```sql
SELECT 
  u.display_name,
  u.role,
  b.name as branch_name,
  b.location as branch_location
FROM public.users u
LEFT JOIN public.branches b ON b.id = u.branch_id
WHERE u.id = 'YOUR_USER_ID_HERE';
```

(Replace YOUR_USER_ID_HERE with your ID again)

✅ You should see:
```
display_name: Pharm. Abdurrazaq O.
role: tenant_admin
branch_name: Main Branch
branch_location: Warshu Hospital Road
```

---

## Step 6: Refresh your app

1. Go to your app
2. Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to hard refresh
3. Login as tenant_admin

✅ You should now see:
- Header: "Main Branch" and "Warshu Hospital Road"
- Sidebar: "Pharm. Abdurrazaq O." and "tenant admin"
- Menu: "User Management" under Administration

---

## If Step 3 Still Gives Error

Try this alternative approach:

```sql
-- Method 1: Using subquery
UPDATE public.users 
SET display_name = 'Pharm. Abdurrazaq O.' 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'tenant_admin@pharmacore.local'
);
```

If that doesn't work, do it manually:

```sql
-- Step A: Get the ID
SELECT id FROM auth.users WHERE email = 'tenant_admin@pharmacore.local';

-- Step B: Copy the ID from the result, then run:
UPDATE public.users 
SET display_name = 'Pharm. Abdurrazaq O.' 
WHERE id = 'paste-id-here';
```

---

## Common Errors

### Error: "column display_name does not exist"
**Solution**: Run Step 1 again

### Error: "relation auth.users does not exist"
**Solution**: You might not have permission. Try the manual method in "If Step 3 Still Gives Error"

### Error: "0 rows updated"
**Solution**: The user ID is wrong. Run Step 2 again and make sure you copy the correct ID

---

## Need Help?

Share the exact error message you're getting and I'll help you fix it!
