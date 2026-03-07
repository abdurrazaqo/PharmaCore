# Force Complete Refresh - Step by Step

Your browser is showing old cached code. Follow these exact steps:

## Step 1: Stop the Development Server

In your terminal where the app is running:
- Press **Ctrl+C**
- Wait for it to stop completely

## Step 2: Clear Vite Cache

Run this command:
```bash
rm -rf node_modules/.vite
```

Or on Windows PowerShell:
```powershell
Remove-Item -Recurse -Force node_modules/.vite
```

## Step 3: Start Server Again

```bash
npm run dev
```

Wait for "ready in X ms" message.

## Step 4: Clear Browser Cache Completely

### Chrome/Edge:
1. Press **Ctrl+Shift+Delete**
2. Select "Cached images and files"
3. Time range: "All time"
4. Click "Clear data"

### Or use Incognito/Private Window:
1. Press **Ctrl+Shift+N** (Chrome) or **Ctrl+Shift+P** (Edge)
2. Go to localhost:3000
3. This bypasses all cache

## Step 5: Hard Refresh

1. Go to your app (localhost:3000)
2. Press **Ctrl+Shift+R** multiple times
3. Or press **F12** → Right-click refresh button → "Empty Cache and Hard Reload"

## Step 6: Logout and Login

1. Click logout button
2. Login as tenant_admin
3. Password: TestAdmin123!

## Step 7: Check Browser Console

Press **F12** and check Console tab for any errors.

---

## Quick Test in Console

Press F12, go to Console tab, and paste this:

```javascript
// Check if profile is loaded
fetch('http://localhost:3000/').then(() => {
  console.log('App loaded');
  console.log('LocalStorage:', localStorage);
});
```

Then logout and login again.

---

## If Still Not Working

The issue might be that the dev server isn't picking up the changes. Try this:

### Option 1: Touch the files to force rebuild

```bash
touch components/Layout.tsx
touch contexts/AuthContext.tsx
touch types.ts
```

### Option 2: Restart with clean slate

```bash
# Stop server (Ctrl+C)
rm -rf node_modules/.vite
rm -rf dist
npm run dev
```

---

## Verify Code Changes Are There

Run this to confirm the code has the changes:

```bash
grep -n "display_name" components/Layout.tsx
grep -n "display_name" contexts/AuthContext.tsx
grep -n "display_name" types.ts
```

You should see the display_name references in all three files.
