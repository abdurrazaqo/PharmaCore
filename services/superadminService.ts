import { supabase } from './supabaseClient';
import { UserRole } from '../types';

export interface PlatformMetrics {
  totalPharmacies: number;
  activePharmacies: number;
  pendingApprovals: number;
  inTrial: number;
  inGracePeriod: number;
  totalRevenue: number;
}

export interface OnboardingRequest {
  id: string;
  access_code: string;
  pharmacy_name: string;
  pharmacy_address: string;
  pharmacy_email: string;
  pharmacy_phone: string;
  pcn_number: string | null;
  contact_person_name: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  tenant_id?: string;
}

// Fetch platform overview metrics
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const now = new Date().toISOString();
  
  // Using multiple queries for precision, excluding demo tenant
  const [
    { count: total }, 
    { count: active }, 
    { count: pending },
    { data: trialTenants },
    { count: grace },
    { data: revenueData }
  ] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }).neq('status', 'deleted').neq('id', DEMO_TENANT_ID),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active').neq('id', DEMO_TENANT_ID),
    supabase.from('onboarding_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('tenants').select('id, trial_ends_at, subscription_expires_at').neq('id', DEMO_TENANT_ID).neq('status', 'deleted'),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'grace_period').neq('id', DEMO_TENANT_ID),
    supabase.from('access_codes').select('amount_paid').eq('status', 'used')
  ]);

  // Count tenants in trial: trial_ends_at > now AND (subscription_expires_at is null OR subscription_expires_at <= now)
  const inTrial = trialTenants?.filter(t => {
    const trialEndsAt = t.trial_ends_at ? new Date(t.trial_ends_at) : null;
    const subscriptionExpiresAt = t.subscription_expires_at ? new Date(t.subscription_expires_at) : null;
    const nowDate = new Date(now);
    
    // In trial if: trial hasn't ended AND (no subscription OR subscription has expired)
    return trialEndsAt && trialEndsAt > nowDate && (!subscriptionExpiresAt || subscriptionExpiresAt <= nowDate);
  }).length || 0;

  const totalRevenue = revenueData?.reduce((sum, item) => sum + Number(item.amount_paid), 0) || 0;

  return {
    totalPharmacies: total || 0,
    activePharmacies: active || 0,
    pendingApprovals: pending || 0,
    inTrial,
    inGracePeriod: grace || 0,
    totalRevenue
  };
}

// Fetch all onboarding requests by status
export async function getOnboardingRequests(status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<OnboardingRequest[]> {
  const { data, error } = await supabase
    .from('onboarding_requests')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: status === 'pending' });

  if (error) throw error;
  return data || [];
}

// Log admin action to audit logs
export async function logAdminAction(params: {
  tenant_id?: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values?: any;
  new_values?: any;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('audit_logs').insert([{
    tenant_id: params.tenant_id,
    user_id: user.id,
    action: params.action,
    resource_type: params.resource_type,
    resource_id: params.resource_id,
    old_values: params.old_values,
    new_values: params.new_values,
    metadata: { is_superadmin_action: true }
  }]);
}

// Tenant Management Actions
export async function suspendTenant(tenantId: string, reason: string) {
  const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
  
  const { error } = await supabase
    .from('tenants')
    .update({ 
      status: 'suspended', 
      suspended_at: new Date().toISOString(), 
      suspended_reason: reason 
    })
    .eq('id', tenantId);

  if (error) throw error;

  await logAdminAction({
    tenant_id: tenantId,
    action: 'tenant.suspended',
    resource_type: 'tenant',
    resource_id: tenantId,
    old_values: { status: tenant?.status },
    new_values: { status: 'suspended', reason }
  });
}

export async function reactivateTenant(tenantId: string) {
  const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();

  const { error } = await supabase
    .from('tenants')
    .update({ 
      status: 'active', 
      suspended_at: null, 
      suspended_reason: null 
    })
    .eq('id', tenantId);

  if (error) throw error;

  await logAdminAction({
    tenant_id: tenantId,
    action: 'tenant.reactivated',
    resource_type: 'tenant',
    resource_id: tenantId,
    old_values: { status: tenant?.status },
    new_values: { status: 'active' }
  });
}

export async function deleteTenant(tenantId: string) {
  const { error } = await supabase
    .from('tenants')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
    .eq('id', tenantId);

  if (error) throw error;

  await logAdminAction({
    tenant_id: tenantId,
    action: 'tenant.deleted',
    resource_type: 'tenant',
    resource_id: tenantId
  });
}

export async function changeTenantPlan(tenantId: string, newPlan: string) {
  const { data: tenant } = await supabase.from('tenants').select('plan').eq('id', tenantId).single();

  const { error } = await supabase
    .from('tenants')
    .update({ plan: newPlan })
    .eq('id', tenantId);

  if (error) throw error;

  await logAdminAction({
    tenant_id: tenantId,
    action: 'tenant.plan_changed',
    resource_type: 'tenant',
    resource_id: tenantId,
    old_values: { plan: tenant?.plan },
    new_values: { plan: newPlan }
  });
}

export async function extendSubscription(tenantId: string, days: number) {
  const { data: tenant } = await supabase.from('tenants').select('subscription_expires_at, trial_ends_at').eq('id', tenantId).single();
  
  const currentExpiry = tenant?.subscription_expires_at || tenant?.trial_ends_at || new Date().toISOString();
  const newExpiry = new Date(new Date(currentExpiry).getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('tenants')
    .update({ 
      subscription_expires_at: newExpiry,
      trial_ends_at: newExpiry 
    })
    .eq('id', tenantId);

  if (error) throw error;

  await logAdminAction({
    tenant_id: tenantId,
    action: 'tenant.subscription_extended',
    resource_type: 'tenant',
    resource_id: tenantId,
    new_values: { days, previous_expiry: currentExpiry, new_expiry: newExpiry }
  });
}

export async function getTenants(filters: any = {}) {
  const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
  
  let query = supabase.from('tenants').select('id, name, pharmacy_email, status, plan, is_gifted, subscription_expires_at, trial_ends_at').neq('id', DEMO_TENANT_ID);
  
  if (filters.status === 'beta') {
    query = query.eq('is_gifted', true);
  } else if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  
  if (filters.plan && filters.plan !== 'all') query = query.eq('plan', filters.plan);
  if (filters.search) query = query.ilike('name', `%${filters.search}%`);
  if (filters.is_gifted !== undefined && filters.status !== 'beta') query = query.eq('is_gifted', filters.is_gifted);
  
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data || [];
}

export async function getAccessCodes(filters: any = {}) {
  let query = supabase.from('access_codes').select('*');
  
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.search) query = query.ilike('buyer_email', `%${filters.search}%`);
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAuditLogs(page = 1, perPage = 50, filters: any = {}) {
  let query = supabase
    .from('audit_logs')
    .select('*, users(display_name, role)', { count: 'exact' });

  if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
  if (filters.action) query = query.eq('action', filters.action);
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) throw error;
  return { logs: data, total: count || 0 };
}
export async function reconsiderOnboardingRequest(requestId: string) {
  const { error } = await supabase
    .from('onboarding_requests')
    .update({ status: 'pending', reviewed_at: null, reviewed_by: null, rejection_reason: null })
    .eq('id', requestId);

  if (error) throw error;

  await logAdminAction({
    action: 'onboarding.reconsidered',
    resource_type: 'onboarding_request',
    resource_id: requestId
  });
}

export async function generateBetaInvite(): Promise<string> {
  const token = crypto.randomUUID();
  
  // Generate code in PHC-XXXX-XXXX format to match validation expectations
  const stripped = token.replace(/-/g, '');
  const first8 = stripped.substring(0, 8);
  const g1 = first8.substring(0, 4).toUpperCase();
  const g2 = first8.substring(4, 8).toUpperCase();
  const code = `PHC-${g1}-${g2}`;
  
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('access_codes')
    .insert([{
      token,
      code,
      status: 'unused',
      expires_at: expiresAt,
      is_beta: true,
      buyer_email: 'beta-invite@pharmacore',
      plan: 'pro',
      billing_cycle: 'annual',
      amount_paid: 0,
      paystack_reference: `BETA-REF-${code}`
    }]);

  if (error) throw error;
  
  await logAdminAction({
    action: 'beta_invite.generated',
    resource_type: 'access_code',
    resource_id: code
  });

  return `${window.location.origin}/onboard?token=${token}`;
}

export async function sendBetaInvitation(recipientName: string, recipientEmail: string, plan: 'basic' | 'pro' = 'pro') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-beta-invitation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      plan: plan
    })
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Failed to send invitation");
  return result;
}

