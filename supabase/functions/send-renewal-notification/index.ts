import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import {
  renderTrialReminder,
  renderRenewalReminder,
  renderGracePeriodNotice,
  renderSuspendedNotice
} from "../_shared/emailTemplates.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing token')

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: caller } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    
    if (caller?.role !== 'superadmin') {
      throw new Error('Forbidden')
    }

    const { tenant_id, notification_type } = await req.json()

    if (!tenant_id || !notification_type) {
      throw new Error('Missing payload parameters')
    }

    const { data: tenant } = await supabaseAdmin.from('tenants').select('*').eq('id', tenant_id).single()
    if (!tenant) throw new Error('Tenant not found')
    
    if (!tenant.pharmacy_email) {
      throw new Error('Tenant has no contact email configured')
    }

    let html = '';
    let subject = '';

    const now = new Date()

    if (notification_type === 'trial_reminder') {
       const trialEnd = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : now
       const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000))
       subject = `Your PharmaCore trial ends in ${daysRemaining} day(s)`
       html = renderTrialReminder({ 
         pharmacy_name: tenant.name, 
         days_remaining: daysRemaining, 
         trial_ends_at: trialEnd.toLocaleDateString() 
       })
    } else if (notification_type === 'renewal_reminder') {
       const subEnd = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at) : now
       const daysRemaining = Math.max(0, Math.ceil((subEnd.getTime() - now.getTime()) / 86400000))
       subject = `Your PharmaCore subscription renews in ${daysRemaining} day(s)`
       
       // Fallback logic for price
       const { data: pricingData } = await supabaseAdmin.from('pricing_config').select('amount_naira').eq('plan', tenant.plan || 'basic').eq('billing_cycle', tenant.billing_cycle || 'monthly').eq('is_active', true).single()
       const amount_due = pricingData?.amount_naira?.toLocaleString() || "N/A"

       html = renderRenewalReminder({
         pharmacy_name: tenant.name,
         days_remaining: daysRemaining,
         subscription_expires_at: subEnd.toLocaleDateString(),
         plan: tenant.plan || 'basic',
         amount_due
       })
    } else if (notification_type === 'grace_period') {
       const expiredDate = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at).toLocaleDateString() : 'recently'
       subject = '⚠️ Your PharmaCore subscription has expired'
       html = renderGracePeriodNotice({ pharmacy_name: tenant.name, expired_date: expiredDate })
    } else if (notification_type === 'suspended') {
       subject = 'Your PharmaCore account has been suspended'
       html = renderSuspendedNotice({ pharmacy_name: tenant.name, suspended_reason: tenant.suspended_reason || 'Subscription Expired' })
    } else {
       throw new Error('Unknown notification_type')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'PharmaCore <hello@365health.online>',
        to: tenant.pharmacy_email,
        subject,
        html
      })
    })

    if (!res.ok) {
      throw new Error(await res.text())
    }

    // Update last reminder
    await supabaseAdmin.from('tenants').update({
      last_reminder_sent_at: now.toISOString(),
      reminder_count: (tenant.reminder_count || 0) + 1
    }).eq('id', tenant_id)

    // Audit log
    await supabaseAdmin.from('audit_logs').insert([{
      tenant_id,
      user_id: user.id,
      action: 'subscription.manual_notification_sent',
      resource_type: 'tenant',
      resource_id: tenant_id,
      new_values: { notification_type }
    }])

    return new Response(JSON.stringify({ success: true, email_sent: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'An error occurred' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
