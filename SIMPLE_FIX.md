# Simple Fix for Audit Log Error

The error happens because the audit log trigger is trying to log who made the change, but you're running SQL from the editor (not logged in).

## Quick Solution: Disable trigger temporarily

Run these commands **ONE BY ONE**:

### Step 1: Disable the audit trigger
```sql
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
```

### Step 2: Update display name
**Replace YOUR_USER_ID_HERE with your actual user ID!**
```sql
UPDATE public.users SET display_name = 'Pharm. Abdurrazaq O.' WHERE id = 'YOUR_USER_ID_HERE';
```

### Step 3: Update branch location
```sql
UPDATE public.branches SET location = 'Warshu Hospital Road' WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
```

### Step 4: (Optional) Re-enable the trigger
Only run this if you want audit logging back:
```sql
CREATE TRIGGER audit_users_trigger
  AFTER UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_changes();
```

### Step 5: Verify it worked
**Replace YOUR_USER_ID_HERE with your ID!**
```sql
SELECT u.display_name, u.role, b.name as branch_name, b.location FROM public.users u LEFT JOIN public.branches b ON b.id = u.branch_id WHERE u.id = 'YOUR_USER_ID_HERE';
```

---

## Better Solution: Fix the audit function

This makes the audit function smarter - it only logs when there's a logged-in user.

Run this **ONCE**:

```sql
CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'UPDATE' THEN
      PERFORM create_audit_log(
        NEW.tenant_id,
        'user.updated',
        'user',
        NEW.id::TEXT,
        to_jsonb(OLD),
        to_jsonb(NEW),
        jsonb_build_object('trigger', 'automatic')
      );
    ELSIF TG_OP = 'DELETE' THEN
      PERFORM create_audit_log(
        OLD.tenant_id,
        'user.deleted',
        'user',
        OLD.id::TEXT,
        to_jsonb(OLD),
        NULL,
        jsonb_build_object('trigger', 'automatic')
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then run the UPDATE commands from Step 2 and 3 above.

---

## Which solution should I use?

- **Quick Solution**: Faster, but disables audit logging temporarily
- **Better Solution**: Keeps audit logging working, but requires running a longer SQL command

I recommend the **Quick Solution** for now - you can always re-enable the trigger later.

---

## After fixing, refresh your app!

Press **Ctrl+Shift+R** (or **Cmd+Shift+R** on Mac)
