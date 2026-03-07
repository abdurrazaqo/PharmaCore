# Run These Commands ONE BY ONE

## ⚠️ IMPORTANT: Run each command separately!

Copy ONE command at a time, paste it, click Run, then move to the next.

---

## Command 1: Add the column

```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;
```

Click **Run**. Wait for success message.

---

## Command 2: Find your user ID

```sql
SELECT u.id, au.email, u.role FROM public.users u JOIN auth.users au ON au.id = u.id;
```

Click **Run**. You'll see a table with your users.

**Copy the `id` value** for the user with email `365admin@pharmacore.local` (or `tenant_admin@pharmacore.local`)

Example: `abc12345-def6-7890-ghij-klmnopqrstuv`

---

## Command 3: Update display name

**REPLACE `YOUR_USER_ID_HERE` with the ID you just copied!**

```sql
UPDATE public.users SET display_name = 'Pharm. Abdurrazaq O.' WHERE id = 'YOUR_USER_ID_HERE';
```

Click **Run**. Should say "1 row updated".

---

## Command 4: Update branch location

```sql
UPDATE public.branches SET location = 'Warshu Hospital Road' WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
```

Click **Run**. Should say "1 row updated".

---

## Command 5: Verify it worked

**REPLACE `YOUR_USER_ID_HERE` with your ID again!**

```sql
SELECT u.display_name, u.role, b.name as branch_name, b.location FROM public.users u LEFT JOIN public.branches b ON b.id = u.branch_id WHERE u.id = 'YOUR_USER_ID_HERE';
```

Click **Run**. You should see:
- display_name: Pharm. Abdurrazaq O.
- role: tenant_admin
- branch_name: Main Branch
- branch_location: Warshu Hospital Road

---

## Done! Now refresh your app

Press **Ctrl+Shift+R** (or **Cmd+Shift+R** on Mac) to hard refresh your app.

---

## Example with Real ID

If your user ID is `abc12345-def6-7890-ghij-klmnopqrstuv`, then:

**Command 3 becomes:**
```sql
UPDATE public.users SET display_name = 'Pharm. Abdurrazaq O.' WHERE id = 'abc12345-def6-7890-ghij-klmnopqrstuv';
```

**Command 5 becomes:**
```sql
SELECT u.display_name, u.role, b.name as branch_name, b.location FROM public.users u LEFT JOIN public.branches b ON b.id = u.branch_id WHERE u.id = 'abc12345-def6-7890-ghij-klmnopqrstuv';
```
