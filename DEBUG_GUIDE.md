# Debug Guide - Find Out What's Wrong

I've added debug logging to help us see what's happening.

## Step 1: Save and Restart

1. **Save all files** (the changes I just made)
2. **Stop your dev server**: Press Ctrl+C in terminal
3. **Start it again**: `npm run dev`
4. **Wait** for "ready" message

## Step 2: Open Browser Console

1. Go to your app: `http://localhost:3000`
2. Press **F12** to open DevTools
3. Click the **Console** tab
4. **Clear the console**: Click the 🚫 icon or press Ctrl+L

## Step 3: Login and Watch Console

1. Login as tenant_admin
2. **Watch the console** - you should see messages like:
   ```
   🔍 Fetching profile for user: abc123...
   📦 Raw data from Supabase: {...}
   ✅ Transformed profile: {...}
   🎨 Layout - Profile data: {...}
   🎨 Layout - Display name: Pharm. Abdurrazaq O.
   🎨 Layout - Branch: {...}
   ```

## Step 4: Check What You See

### Scenario A: You see "📦 Raw data from Supabase: null"

**Problem**: The database query is returning nothing.

**Solution**: Run this SQL to verify your user exists:
```sql
SELECT * FROM public.users WHERE id = (
  SELECT id FROM auth.users WHERE email = '365admin@pharmacore.local'
);
```

If this returns nothing, your user profile wasn't created properly.

---

### Scenario B: You see data but display_name is null

**Example console output**:
```
📦 Raw data from Supabase: {
  id: "abc123",
  role: "tenant_admin",
  display_name: null,  ← NULL!
  ...
}
```

**Problem**: The display_name wasn't saved to database.

**Solution**: Run the UPDATE command again:
```sql
UPDATE public.users 
SET display_name = 'Pharm. Abdurrazaq O.' 
WHERE id = 'YOUR_USER_ID';
```

---

### Scenario C: You see data but branch/tenant is null

**Example console output**:
```
📦 Raw data from Supabase: {
  id: "abc123",
  display_name: "Pharm. Abdurrazaq O.",
  branch: null,  ← NULL!
  tenant: null   ← NULL!
}
```

**Problem**: The JOIN query isn't working or branch_id/tenant_id is wrong.

**Solution**: Check your user's IDs:
```sql
SELECT 
  u.id,
  u.tenant_id,
  u.branch_id,
  u.display_name,
  t.name as tenant_name,
  b.name as branch_name
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id
LEFT JOIN public.branches b ON b.id = u.branch_id
WHERE u.id = (SELECT id FROM auth.users WHERE email = '365admin@pharmacore.local');
```

If tenant_name or branch_name is NULL, the IDs don't match.

---

### Scenario D: You see an error message

**Example**:
```
❌ Error from Supabase: { message: "..." }
```

**Solution**: Copy the error message and share it with me.

---

### Scenario E: You don't see ANY console messages

**Problem**: The code changes didn't load.

**Solution**:
1. Close ALL browser tabs with localhost:3000
2. Clear browser cache (Ctrl+Shift+Delete)
3. Open in Incognito window (Ctrl+Shift+N)
4. Go to localhost:3000
5. Login again

---

## Step 5: Share Results

After checking the console, tell me:

1. **What messages do you see?** (copy/paste or screenshot)
2. **Is display_name showing in the console?**
3. **Is branch/tenant showing in the console?**
4. **Any red error messages?**

This will tell us exactly what's wrong!

---

## Quick SQL Verification

While we're debugging, run this to verify your database is correct:

```sql
SELECT 
  u.id,
  u.display_name,
  u.role,
  u.tenant_id,
  u.branch_id,
  t.name as tenant_name,
  b.name as branch_name,
  b.location as branch_location
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id
LEFT JOIN public.branches b ON b.id = u.branch_id
WHERE u.id = (
  SELECT id FROM auth.users WHERE email = '365admin@pharmacore.local'
);
```

Expected result:
```
display_name: Pharm. Abdurrazaq O.
role: tenant_admin
tenant_name: Test Pharmacy
branch_name: Main Branch
branch_location: Warshu Hospital Road
```

If any of these are NULL or wrong, that's the problem!
