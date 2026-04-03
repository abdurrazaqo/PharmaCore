// approve-onboarding Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
    
    // Auth Check: Must be superadmin
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    })
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized")

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify role in public.users
    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'superadmin') throw new Error("Requires superadmin privileges")

    const { request_id, approval_notes } = await req.json()

    // 1. Fetch Request
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('onboarding_requests')
      .select('*')
      .eq('id', request_id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !request) throw new Error("Pending onboarding request not found")

    // 2. Fetch Access Code info
    const { data: accessCode } = await supabaseAdmin
      .from('access_codes')
      .select('*')
      .eq('code', request.access_code)
      .single()

    const isBeta = accessCode?.is_beta === true;
    const giftedUntil = isBeta ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : null;

    // 3. Create Tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert([{
        name: request.pharmacy_name,
        status: 'active',
        plan: accessCode?.plan || 'basic',
        billing_cycle: accessCode?.billing_cycle || 'monthly',
        pharmacy_address: request.pharmacy_address,
        pharmacy_phone: request.pharmacy_phone,
        pharmacy_email: request.pharmacy_email,
        pcn_number: request.pcn_number,
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        approved_at: new Date().toISOString(),
        is_gifted: isBeta,
        gifted_until: giftedUntil
      }])
      .select()
      .single()

    if (tenantError) throw tenantError

    // 4. Update Request
    const setupToken = crypto.randomUUID()
    await supabaseAdmin
      .from('onboarding_requests')
      .update({
        status: 'approved',
        tenant_id: tenant.id,
        setup_token: setupToken,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', request_id)

    // 5. Send Email
    let emailSent = false
    if (resendApiKey) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'PharmaCore <hello@365health.online>',
          to: [request.pharmacy_email],
          subject: "Your PharmaCore Application is Approved! 🎉",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h1 style="color: #006C75; margin-bottom: 24px;">Congratulations!</h1>
              <p>Your application for <strong>${request.pharmacy_name}</strong> has been approved. You're just one step away from launching your digital pharmacy.</p>
              <div style="background: #f0fdfa; border: 1px solid #ccfbf1; padding: 24px; border-radius: 12px; margin: 30px 0; text-align: center;">
                <p style="margin-bottom: 20px; font-weight: bold;">Click the button below to complete your account setup:</p>
                <a href="https://pharmacore.365health.online/setup?token=${setupToken}" style="background: #006C75; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Complete Setup &rarr;</a>
              </div>
              <p style="font-size: 14px; color: #64748b;">If the button doesn't work, copy and paste this link into your browser: <br> <code>https://pharmacore.365health.online/setup?token=${setupToken}</code></p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              <p style="font-size: 14px; color: #94a3b8; text-align: center;">PharmaCore Support: hello@365health.online</p>
            </div>
          `
        })
      })
      emailSent = emailRes.ok
    }

    // 6. Log Audit
    await supabaseAdmin.from('audit_logs').insert([{
      action: 'onboarding.approved',
      resource_type: 'onboarding_request',
      resource_id: request_id,
      user_id: user.id,
      new_values: { tenant_id: tenant.id, approval_notes }
    }])

    return new Response(JSON.stringify({ success: true, tenant_id: tenant.id, setup_token: setupToken, emailSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
