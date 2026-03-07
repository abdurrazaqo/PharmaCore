-- ============================================
-- FIX: Disable audit trigger temporarily
-- ============================================

-- Option 1: Disable the trigger temporarily
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;

-- Now you can update the display name
UPDATE public.users 
SET display_name = 'Pharm. Abdurrazaq O.' 
WHERE id = 'YOUR_USER_ID_HERE';

-- Re-enable the trigger (optional - only if you want audit logging)
CREATE TRIGGER audit_users_trigger
  AFTER UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_changes();

-- ============================================
-- OR Option 2: Fix the audit function to handle NULL user_id
-- ============================================

-- This makes the audit function work even when auth.uid() is null
CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if there's an authenticated user
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

-- Now update the display name
UPDATE public.users 
SET display_name = 'Pharm. Abdurrazaq O.' 
WHERE id = 'YOUR_USER_ID_HERE';
