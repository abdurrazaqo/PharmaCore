// reject-onboarding Edge Function
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
    
    // Auth Check
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    })
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'superadmin') throw new Error("Requires superadmin privileges")

    const { request_id, rejection_reason } = await req.json()

    // 1. Fetch Request
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('onboarding_requests')
      .select('*')
      .eq('id', request_id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !request) throw new Error("Request not found")

    // 2. Update status
    await supabaseAdmin
      .from('onboarding_requests')
      .update({
        status: 'rejected',
        rejection_reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', request_id)

    // 3. Send Email
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'PharmaCore Support <hello@365health.online>',
          to: [request.pharmacy_email],
          subject: "Update on Your PharmaCore Application",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h1 style="color: #64748b; margin-bottom: 24px;">Application Status Update</h1>
              <p>Thank you for your interest in PharmaCore. After careful review, we are unable to approve your application for <strong>${request.pharmacy_name}</strong> at this time.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin: 30px 0;">
                <p style="margin-bottom: 8px; font-weight: bold; color: #475569;">Reason for rejection:</p>
                <p style="color: #64748b; font-style: italic;">${rejection_reason}</p>
              </div>
              <p>If you have any questions or would like to discuss this further, please don't hesitate to reach out to us at <a href="mailto:hello@365health.online">hello@365health.online</a>.</p>
              <p>Best regards,<br>The PharmaCore Onboarding Team</p>
            </div>
          `
        })
      })
    }

    // 4. Log Audit
    await supabaseAdmin.from('audit_logs').insert([{
      action: 'onboarding.rejected',
      resource_type: 'onboarding_request',
      resource_id: request_id,
      user_id: user.id,
      new_values: { rejection_reason }
    }])

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
