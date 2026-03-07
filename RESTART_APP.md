# How to See Your Changes

## The Issue

The code changes are saved, but your app needs to be restarted to see them.

## Solution: Restart Your Development Server

### Step 1: Stop the current server

If your app is running, press **Ctrl+C** in the terminal where it's running.

### Step 2: Start the server again

Run this command in your terminal:

```bash
npm run dev
```

Or if you're using yarn:

```bash
yarn dev
```

### Step 3: Hard refresh your browser

Once the server starts:
1. Go to your app in the browser
2. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
3. This clears the cache and loads fresh code

### Step 4: Login and verify

Login as tenant_admin and check:
- ✅ Header shows "Main Branch" and "Warshu Hospital Road"
- ✅ Sidebar shows "Pharm. Abdurrazaq O." and "tenant admin"
- ✅ Menu shows "User Management" under Administration

---

## About the Supabase Dashboard

**Important**: The `display_name` field is NOT in the `auth.users` table on Supabase Dashboard.

It's in the `public.users` table. This is correct!

To see it on Supabase Dashboard:
1. Go to **Table Editor**
2. Select **users** table (not auth.users)
3. You'll see the `display_name` column there

The `auth.users` table only stores authentication data (email, password hash, etc.)
The `public.users` table stores your custom user data (display_name, role, tenant_id, etc.)

---

## Troubleshooting

### Changes still not showing?

1. **Clear browser cache completely**:
   - Chrome: Ctrl+Shift+Delete → Clear browsing data
   - Select "Cached images and files"
   - Click "Clear data"

2. **Check browser console for errors**:
   - Press F12
   - Go to Console tab
   - Look for red errors
   - Share them if you see any

3. **Verify you're logged in as the right user**:
   - Logout
   - Login again as tenant_admin
   - Check if changes appear

4. **Check if TypeScript compiled successfully**:
   - Look at your terminal where the dev server is running
   - Should say "compiled successfully"
   - If you see errors, share them

### User Management not showing?

Run this in browser console (F12 → Console):
```javascript
// Check if you're logged in as tenant_admin
console.log(window.localStorage);
```

Then logout and login again.

---

## Quick Verification SQL

To verify your database is correct, run this in Supabase SQL Editor:

```sql
SELECT 
  u.id,
  u.display_name,
  u.role,
  t.name as tenant_name,
  b.name as branch_name,
  b.location as branch_location
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id
LEFT JOIN public.branches b ON b.id = u.branch_id;
```

You should see:
- display_name: "Pharm. Abdurrazaq O."
- role: "tenant_admin"
- tenant_name: "Test Pharmacy"
- branch_name: "Main Branch"
- branch_location: "Warshu Hospital Road"

If this looks correct, then the issue is just that your app needs to restart!
