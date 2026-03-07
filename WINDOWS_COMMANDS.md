# Windows PowerShell Commands

## Clear Vite Cache (Already Done ✅)

```powershell
Remove-Item -Recurse -Force node_modules\.vite
```

## Now Restart Server

```powershell
npm run dev
```

Wait for "ready in X ms" message.

---

## Then Clear Browser Cache

### Option 1: Use Incognito Window (Easiest)

1. Press **Ctrl+Shift+N** (Chrome/Edge)
2. Go to `http://localhost:3000`
3. Login as tenant_admin

### Option 2: Clear Cache in Regular Browser

1. Press **Ctrl+Shift+Delete**
2. Check "Cached images and files"
3. Time range: "All time"
4. Click "Clear data"
5. Close ALL tabs with localhost:3000
6. Open new tab → localhost:3000

---

## Check Browser Console for Errors

1. Press **F12**
2. Click "Console" tab
3. Look for RED errors
4. Take screenshot if you see any

---

## If Still Not Working

The issue might be in the database query. Let's check if the profile is loading correctly.

In browser console (F12), paste this after logging in:

```javascript
// Wait 2 seconds for profile to load, then check
setTimeout(() => {
  console.log('Checking profile data...');
  
  // Check localStorage
  const keys = Object.keys(localStorage);
  const authKey = keys.find(k => k.includes('auth-token'));
  if (authKey) {
    const data = JSON.parse(localStorage.getItem(authKey));
    console.log('User Email:', data.user?.email);
    console.log('User ID:', data.user?.id);
  }
}, 2000);
```

This will show if the user is logged in correctly.

---

## Next: Check Database Query

If the user is logged in but data isn't showing, the issue is in the AuthContext query.

Run this in Supabase SQL Editor to test the query:

```sql
SELECT 
  u.*,
  t.id as tenant_id_check,
  t.name as tenant_name,
  b.id as branch_id_check,
  b.name as branch_name,
  b.location as branch_location
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id
LEFT JOIN public.branches b ON b.id = u.branch_id
WHERE u.id = (SELECT id FROM auth.users WHERE email = '365admin@pharmacore.local');
```

You should see:
- display_name: Pharm. Abdurrazaq O.
- tenant_name: Test Pharmacy
- branch_name: Main Branch
- branch_location: Warshu Hospital Road

If this query returns data, then the issue is in how the AuthContext is parsing it.
