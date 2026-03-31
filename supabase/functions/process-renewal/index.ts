import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { renderSubscriptionRenewed } from "../_shared/emailTemplates.ts"

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
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized User')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: callerProfile } = await supabaseAdmin.from('users').select('role, tenant_id').eq('id', user.id).single()
    if (!callerProfile || !['tenant_admin', 'superadmin'].includes(callerProfile.role)) {
       throw new Error('Unauthorized Access')
    }

    const { paystack_reference, tenant_id, plan, billing_cycle } = await req.json()
    if (tenant_id !== callerProfile.tenant_id && callerProfile.role !== 'superadmin') {
      throw new Error('Unauthorized Tenant modification')
    }

    const pRes = await fetch(`https://api.paystack.co/transaction/verify/${paystack_reference}`, {
      headers: { Authorization: `Bearer ${paystackSecret}` }
    })
    const pData = await pRes.json()
    if (!pData.status || pData.data.status !== 'success') {
      throw new Error('Payment verification failed')
    }

    const { data: tenant } = await supabaseAdmin.from('tenants').select('subscription_expires_at, pending_plan, name, pharmacy_email').eq('id', tenant_id).single()
    
    const now = new Date()
    let currentExpiry = tenant?.subscription_expires_at ? new Date(tenant.subscription_expires_at) : now
    if (currentExpiry < now) currentExpiry = now
    
    if (billing_cycle === 'annual') {
      currentExpiry.setFullYear(currentExpiry.getFullYear() + 1)
    } else {
      currentExpiry.setMonth(currentExpiry.getMonth() + 1)
    }

    let finalPlan = plan
    let clearPending = null
    if (tenant?.pending_plan) {
      finalPlan = tenant.pending_plan
    }

    const { error: updateError } = await supabaseAdmin.from('tenants').update({
      status: 'active',
      subscription_expires_at: currentExpiry.toISOString(),
      plan: finalPlan,
      billing_cycle: billing_cycle,
      pending_plan: clearPending
    }).eq('id', tenant_id)

    if (updateError) throw updateError

    await supabaseAdmin.from('audit_logs').insert([
      { tenant_id, user_id: user.id, action: 'subscription.renewed', resource_type: 'tenant', resource_id: tenant_id }
    ])

    if (tenant?.pharmacy_email) {
      const html = renderSubscriptionRenewed({
        pharmacy_name: tenant.name,
        plan: finalPlan,
        billing_cycle,
        new_expiry_date: currentExpiry.toLocaleDateString(),
        amount_paid: (pData.data.amount / 100).toLocaleString()
      })
      await fetch('https://api.resend.com/emails', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${resendApiKey}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           from: "PharmaCore <hello@365health.online>",
           to: tenant.pharmacy_email,
           subject: '✅ PharmaCore Subscription Renewed Successfully',
           html
         })
      }).catch(err => console.error('Email send failed', err))
    }

    return new Response(JSON.stringify({ success: true, new_expiry: currentExpiry.toISOString() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'An error occurred' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
