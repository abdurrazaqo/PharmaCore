import { supabase } from './supabaseClient';

export enum AuditAction {
  // User actions
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  
  // Product actions
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',
  STOCK_ADJUSTED = 'stock.adjusted',
  
  // Sales actions
  SALE_COMPLETED = 'sale.completed',
  SALE_REFUNDED = 'sale.refunded',
  DISCOUNT_APPLIED = 'discount.applied',
  
  // Customer actions
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  
  // Settings actions
  SETTINGS_UPDATED = 'settings.updated',
  BRANCH_CREATED = 'branch.created',
  BRANCH_UPDATED = 'branch.updated',
  
  // Report actions
  REPORT_GENERATED = 'report.generated',
  REPORT_EXPORTED = 'report.exported',
}

export interface AuditLogEntry {
  tenantId: string;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

export const auditLog = {
  /**
   * Create an audit log entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    if (!supabase) {
      console.warn('Supabase not initialized, skipping audit log');
      return;
    }

    try {
      const { error } = await supabase.rpc('create_audit_log', {
        p_tenant_id: entry.tenantId,
        p_action: entry.action,
        p_resource_type: entry.resourceType,
        p_resource_id: entry.resourceId || null,
        p_old_values: entry.oldValues || null,
        p_new_values: entry.newValues || null,
        p_metadata: entry.metadata || null,
      });

      if (error) {
        console.error('Failed to create audit log:', error);
      }
    } catch (err) {
      console.error('Error creating audit log:', err);
    }
  },

  /**
   * Get audit logs for a tenant
   */
  async getTenantLogs(tenantId: string, limit = 100) {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:user_id (
          email:auth.users(email)
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * Get audit logs for a specific user
   */
  async getUserLogs(userId: string, limit = 100) {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * Get audit logs for a specific resource
   */
  async getResourceLogs(resourceType: string, resourceId: string, limit = 50) {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * Search audit logs
   */
  async searchLogs(filters: {
    tenantId?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    if (!supabase) throw new Error('Supabase not initialized');

    let query = supabase.from('audit_logs').select('*');

    if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId);
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.resourceType) query = query.eq('resource_type', filters.resourceType);
    if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
    if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());

    query = query.order('created_at', { ascending: false });
    
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },
};

// Helper function to use in components
export const useAuditLog = () => {
  return auditLog;
};
