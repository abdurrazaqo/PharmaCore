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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      console.error('CRITICAL: RESEND_API_KEY is not configured in Supabase secrets.')
      throw new Error('Email service is not configured (missing API key)')
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('CRITICAL: Supabase environment variables are missing.')
      throw new Error('Server configuration error')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    console.log('Verifying user with userClient.auth.getUser()...')
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError) {
      console.error('getUser error:', userError)
      throw new Error(`Unauthorized (auth): ${userError.message}`)
    }
    if (!user) {
      console.error('No user found for provided token')
      throw new Error('Unauthorized (auth): Token valid but user session not found')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: caller } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    
    if (caller?.role !== 'superadmin') {
      throw new Error('Forbidden')
    }

    const { tenant_id, notification_type } = await req.json()
    console.log(`Payload received: tenant_id=${tenant_id}, notification_type=${notification_type}`)

    if (!tenant_id || !notification_type) {
      throw new Error('Missing payload parameters (tenant_id or notification_type)')
    }

    // 1. Fetch Tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin.from('tenants').select('*').eq('id', tenant_id).single()
    if (tenantError || !tenant) {
      console.error('Database Error (Tenant Lookup):', tenantError)
      throw new Error(`Tenant not found: ${tenantError?.message || 'Unknown error'}`)
    }
    
    if (!tenant.pharmacy_email) {
      throw new Error('Tenant has no contact email configured')
    }
    
    console.log(`Preparing ${notification_type} for ${tenant.name} (${tenant.pharmacy_email})`)

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
         trial_ends_at: trialEnd.toLocaleDateString('en-GB') 
       })
    } else if (notification_type === 'renewal_reminder') {
       const subEnd = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at) : now
       const daysRemaining = Math.max(0, Math.ceil((subEnd.getTime() - now.getTime()) / 86400000))
       subject = `Your PharmaCore subscription renews in ${daysRemaining} day(s)`
       
       // Fallback logic for price
       console.log('Fetching pricing_config...')
       const { data: pricingData, error: pricingError } = await supabaseAdmin
         .from('pricing_config')
         .select('amount_naira')
         .eq('plan', tenant.plan || 'basic')
         .eq('billing_cycle', tenant.billing_cycle || 'monthly')
         .eq('is_active', true)
         .single()
       
       if (pricingError) {
         console.warn('Pricing lookup failed (non-critical):', pricingError.message)
       }
       
       const amount_due = pricingData?.amount_naira?.toLocaleString() || "N/A"

       html = renderRenewalReminder({
         pharmacy_name: tenant.name,
         days_remaining: daysRemaining,
         subscription_expires_at: subEnd.toLocaleDateString('en-GB'),
         plan: tenant.plan || 'basic',
         amount_due
       })
    } else if (notification_type === 'grace_period') {
       const expiredDate = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at).toLocaleDateString('en-GB') : 'recently'
       subject = '⚠️ Your PharmaCore subscription has expired'
       html = renderGracePeriodNotice({ pharmacy_name: tenant.name, expired_date: expiredDate })
    } else if (notification_type === 'suspended') {
       subject = 'Your PharmaCore account has been suspended'
       html = renderSuspendedNotice({ pharmacy_name: tenant.name, suspended_reason: tenant.suspended_reason || 'Subscription Expired' })
    } else {
       throw new Error('Unknown notification_type')
    }

    console.log(`Sending email via Resend...`)
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
      const errorText = await res.text()
      console.error('Resend API error:', errorText)
      throw new Error(`Resend API Error: ${errorText}`)
    }

    const resData = await res.json()
    console.log('Email sent successfully:', resData)

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
