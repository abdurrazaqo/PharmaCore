-- ============================================
-- AUDIT LOGGING SYSTEM FOR PHARMACORE
-- ============================================
-- This creates a comprehensive audit trail for all user actions

-- ============================================
-- 1. CREATE AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user_date 
  ON public.audit_logs(tenant_id, user_id, created_at DESC);

-- ============================================
-- 2. ENABLE RLS ON AUDIT LOGS
-- ============================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Superadmins can view all audit logs
CREATE POLICY "Superadmins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Tenant admins can view logs in their tenant
CREATE POLICY "Tenant admins can view tenant audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
        AND role IN ('tenant_admin', 'superadmin')
        AND tenant_id = audit_logs.tenant_id
    )
  );

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Only system can insert audit logs (via function)
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 3. FUNCTION TO CREATE AUDIT LOG
-- ============================================
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_tenant_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata
  ) VALUES (
    p_tenant_id,
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. AUTOMATIC AUDIT TRIGGERS (EXAMPLE)
-- ============================================
-- Example: Audit user profile changes

CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
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
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to users table
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
CREATE TRIGGER audit_users_trigger
  AFTER UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_changes();

-- ============================================
-- 5. AUDIT LOG RETENTION POLICY
-- ============================================
-- Function to clean up old audit logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. USEFUL AUDIT QUERIES
-- ============================================

-- View recent activity for a tenant
CREATE OR REPLACE VIEW public.recent_tenant_activity AS
SELECT 
  al.id,
  al.action,
  al.resource_type,
  al.resource_id,
  al.created_at,
  au.email as user_email,
  u.role as user_role,
  t.name as tenant_name
FROM public.audit_logs al
JOIN auth.users au ON au.id = al.user_id
JOIN public.users u ON u.id = al.user_id
JOIN public.tenants t ON t.id = al.tenant_id
ORDER BY al.created_at DESC
LIMIT 100;

-- View user activity summary
CREATE OR REPLACE VIEW public.user_activity_summary AS
SELECT 
  u.id,
  au.email,
  u.role,
  t.name as tenant_name,
  COUNT(al.id) as total_actions,
  MAX(al.created_at) as last_activity,
  COUNT(DISTINCT DATE(al.created_at)) as active_days
FROM public.users u
JOIN auth.users au ON au.id = u.id
JOIN public.tenants t ON t.id = u.tenant_id
LEFT JOIN public.audit_logs al ON al.user_id = u.id
GROUP BY u.id, au.email, u.role, t.name;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_audit_log TO authenticated;
GRANT SELECT ON public.recent_tenant_activity TO authenticated;
GRANT SELECT ON public.user_activity_summary TO authenticated;

-- ============================================
-- AUDIT LOGGING SETUP COMPLETE
-- ============================================
-- Usage from application:
-- SELECT create_audit_log(
--   'tenant-id',
--   'product.created',
--   'product',
--   'product-id',
--   NULL,
--   '{"name": "Aspirin", "price": 5.99}'::jsonb
-- );
