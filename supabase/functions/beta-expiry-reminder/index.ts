import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    const authHeader = req.headers.get('Authorization')
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const sendEmail = async (to: string, subject: string, html: string) => {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'PharmaCore <hello@365health.online>',
            to,
            subject,
            html
          })
        })
        if (!res.ok) console.error(`Failed to send email to ${to}: `, await res.text())
      } catch (err) {
        console.error('Email caught error:', err)
      }
    }

    const now = new Date()
    // Target date = Date exactly 7 days from now
    const targetDateStr = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Query active tenants that are gifted
    const { data: giftedTenants } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('status', 'active')
      .eq('is_gifted', true)
      .not('gifted_until', 'is', null)
      .limit(100)

    let emailsSent = 0

    for (const tenant of giftedTenants || []) {
      const gUntilStr = new Date(tenant.gifted_until).toISOString().split('T')[0]
      if (gUntilStr !== targetDateStr) continue;

      // Check if they have an active paid subscription
      let hasActiveSubscription = false;
      if (tenant.subscription_expires_at) {
        const subEnd = new Date(tenant.subscription_expires_at);
        if (subEnd.getTime() > now.getTime()) {
           hasActiveSubscription = true;
        }
      }

      if (hasActiveSubscription) continue;

      // Send Reminder
      if (tenant.pharmacy_email) {
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h1 style="color: #d97706; margin-bottom: 24px;">Beta Period Ending Soon</h1>
            <p>Hi there,</p>
            <p>Your gifted beta access to PharmaCore for <strong>${tenant.name}</strong> will conclude in exactly <strong>7 days</strong>.</p>
            <p>We hope you've enjoyed the platform! We would love to keep you on board. Please choose a subscription plan to retain your data and ensure uninterrupted access to your workspace.</p>
            
            <div style="text-align: center; margin: 30px 0;">
               <a href="https://pharmacore.365health.online/subscription" style="background: #006C75; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View Plans & Subscribe</a>
            </div>
            
            <p style="font-size: 14px; color: #64748b;">If you need assistance, simply reply to this email.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="font-size: 14px; color: #94a3b8; text-align: center;">PharmaCore Support: hello@365health.online</p>
          </div>
        `
        await sendEmail(tenant.pharmacy_email, "⚠️ Your PharmaCore beta ends in 7 days", html)
        emailsSent++
      }
    }

    return new Response(JSON.stringify({ success: true, processed_at: now.toISOString(), emails_sent: emailsSent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'An error occurred' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
