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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    const authHeader = req.headers.get('Authorization')
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const sendEmail = async (to: string, subject: string, html: string) => {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'PharmaCore <hello@365health.online>',
            to,
            subject,
            html
          })
        })
        if (!res.ok) {
          console.error(`Failed to send email to ${to}: `, await res.text())
        }
      } catch (err) {
        console.error('Email caught error:', err)
      }
    }

    // Cache pricing config
    const { data: pricingData } = await supabaseAdmin.from('pricing_config').select('*').eq('is_active', true)
    const pricingMap = pricingData?.reduce((acc: any, row: any) => {
      if (!acc[row.plan]) acc[row.plan] = {}
      acc[row.plan][row.billing_cycle] = row.amount_naira
      return acc
    }, {}) || {}
    
    // Fallback dictionary just in case
    const getPrice = (plan: string, cycle: string) => {
      if (pricingMap[plan] && pricingMap[plan][cycle] !== undefined) {
        return pricingMap[plan][cycle].toLocaleString()
      }
      const fallbacks: Record<string, any> = {
        basic: { monthly: "10,000", annual: "100,000" },
        pro: { monthly: "20,000", annual: "200,000" },
        enterprise: { monthly: "50,000", annual: "500,000" }
      }
      return fallbacks[plan]?.[cycle] || "0"
    }

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const summary = {
      trials_expired: 0,
      trial_reminders_sent: 0,
      renewal_reminders_sent: 0,
      entered_grace_period: 0,
      suspended: 0,
      downgrades_applied: 0
    }

    const logAudit = async (tenant_id: string, action: string, meta: any = null) => {
      await supabaseAdmin.from('audit_logs').insert([{
        tenant_id,
        user_id: null,
        action,
        resource_type: 'system_automation',
        resource_id: tenant_id,
        new_values: meta
      }])
    }

    // ---------------------------------------------------------
    // A. Expire trials that have ended
    // ---------------------------------------------------------
    const { data: expiredTrials } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('status', 'active')
      .lt('trial_ends_at', now.toISOString())
      .is('subscription_expires_at', null)
      .limit(100)

    for (const tenant of expiredTrials || []) {
      if (tenant.is_gifted && tenant.gifted_until && new Date(tenant.gifted_until) >= now) continue;

      const { error } = await supabaseAdmin.from('tenants').update({
        status: 'suspended',
        suspended_at: now.toISOString(),
        suspended_reason: 'Trial period ended. Please subscribe to continue.'
      }).eq('id', tenant.id)
      
      if (!error) {
        summary.trials_expired++
        await logAudit(tenant.id, 'subscription.trial_expired')
        if (tenant.pharmacy_email) {
          const html = renderSuspendedNotice({ pharmacy_name: tenant.name, suspended_reason: 'Trial period ended. Please subscribe to continue.' })
          await sendEmail(tenant.pharmacy_email, "Your PharmaCore account has been suspended", html)
        }
      }
    }

    // ---------------------------------------------------------
    // B. Send Trial Reminders
    // ---------------------------------------------------------
    const { data: trialingTenants } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('status', 'active')
      .not('trial_ends_at', 'is', null)
      .is('subscription_expires_at', null)
      .limit(100)

    for (const tenant of trialingTenants || []) {
      if (tenant.is_gifted && tenant.gifted_until && new Date(tenant.gifted_until) >= now) continue;

      const trialEnd = new Date(tenant.trial_ends_at)
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000))
      
      const lastSentDate = tenant.last_reminder_sent_at ? new Date(tenant.last_reminder_sent_at).toISOString().split('T')[0] : null
      
      if ([7, 3, 1].includes(daysRemaining) && lastSentDate !== todayStr) {
        const { error } = await supabaseAdmin.from('tenants').update({
          last_reminder_sent_at: now.toISOString(),
          reminder_count: (tenant.reminder_count || 0) + 1
        }).eq('id', tenant.id)

        if (!error) {
          summary.trial_reminders_sent++
          await logAudit(tenant.id, 'subscription.trial_reminder_sent', { days_remaining: daysRemaining })
          if (tenant.pharmacy_email) {
             const html = renderTrialReminder({ 
               pharmacy_name: tenant.name, 
               days_remaining: daysRemaining, 
               trial_ends_at: trialEnd.toLocaleDateString()
             })
             await sendEmail(tenant.pharmacy_email, `Your PharmaCore trial ends in ${daysRemaining} day(s)`, html)
          }
        }
      }
    }

    // ---------------------------------------------------------
    // C. Send Subscription Renewal Reminders
    // ---------------------------------------------------------
    const { data: activeSubscribers } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('status', 'active')
      .not('subscription_expires_at', 'is', null)
      .limit(100)

    for (const tenant of activeSubscribers || []) {
      if (tenant.is_gifted && tenant.gifted_until && new Date(tenant.gifted_until) >= now) continue;

      const subEnd = new Date(tenant.subscription_expires_at)
      const daysRemaining = Math.max(0, Math.ceil((subEnd.getTime() - now.getTime()) / 86400000))
      
      let shouldSend = false
      const schedule = tenant.billing_cycle === 'annual' ? [60, 30, 7, 3, 1] : (tenant.renewal_reminder_days || [7, 3, 1])

      if (schedule.includes(daysRemaining)) {
        const lastSentDate = tenant.last_reminder_sent_at ? new Date(tenant.last_reminder_sent_at).toISOString().split('T')[0] : null
        if (lastSentDate !== todayStr) {
          shouldSend = true
        }
      }

      if (shouldSend) {
        const { error } = await supabaseAdmin.from('tenants').update({
          last_reminder_sent_at: now.toISOString(),
          reminder_count: (tenant.reminder_count || 0) + 1
        }).eq('id', tenant.id)

        if (!error) {
          summary.renewal_reminders_sent++
          await logAudit(tenant.id, 'subscription.renewal_reminder_sent', { days_remaining: daysRemaining, billing_cycle: tenant.billing_cycle })
          if (tenant.pharmacy_email) {
            const html = renderRenewalReminder({
              pharmacy_name: tenant.name,
              days_remaining: daysRemaining,
              subscription_expires_at: subEnd.toLocaleDateString(),
              plan: tenant.plan || 'basic',
              amount_due: getPrice(tenant.plan || 'basic', tenant.billing_cycle || 'monthly')
            })
            await sendEmail(tenant.pharmacy_email, `Your PharmaCore subscription renews in ${daysRemaining} day(s)`, html)
          }
        }
      }
    }

    // ---------------------------------------------------------
    // D. Move expired subscriptions to grace period
    // ---------------------------------------------------------
    const { data: expiredSubs } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('status', 'active')
      .lt('subscription_expires_at', now.toISOString())
      .limit(100)

    for (const tenant of expiredSubs || []) {
      if (tenant.is_gifted && tenant.gifted_until && new Date(tenant.gifted_until) >= now) continue;

      const { error } = await supabaseAdmin.from('tenants').update({
        status: 'grace_period',
        grace_period_started_at: now.toISOString()
      }).eq('id', tenant.id)

      if (!error) {
        summary.entered_grace_period++
        await logAudit(tenant.id, 'subscription.entered_grace_period')
        if (tenant.pharmacy_email) {
          const expiredDate = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at).toLocaleDateString() : 'recently'
          const html = renderGracePeriodNotice({ pharmacy_name: tenant.name, expired_date: expiredDate })
          await sendEmail(tenant.pharmacy_email, '⚠️ Your PharmaCore subscription has expired', html)
        }
      }
    }

    // ---------------------------------------------------------
    // E. Suspend tenants whose grace period has ended
    // ---------------------------------------------------------
    const gracePeriodEnd = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString()
    const { data: graceEnded } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('status', 'grace_period')
      .lt('grace_period_started_at', gracePeriodEnd)
      .limit(100)

    for (const tenant of graceEnded || []) {
      if (tenant.is_gifted && tenant.gifted_until && new Date(tenant.gifted_until) >= now) {
        // If they were in grace period but just got gifted, restore their active status
        await supabaseAdmin.from('tenants').update({ status: 'active', grace_period_started_at: null }).eq('id', tenant.id);
        continue;
      }

      const { error } = await supabaseAdmin.from('tenants').update({
        status: 'suspended',
        suspended_at: now.toISOString(),
        suspended_reason: 'Subscription expired and grace period ended. Please renew to restore access.'
      }).eq('id', tenant.id)

      if (!error) {
        summary.suspended++
        await logAudit(tenant.id, 'subscription.suspended_after_grace')
        if (tenant.pharmacy_email) {
          const html = renderSuspendedNotice({ pharmacy_name: tenant.name, suspended_reason: 'Subscription expired. Please renew to restore access.' })
          await sendEmail(tenant.pharmacy_email, "Your PharmaCore account has been suspended", html)
        }
      }
    }

    // ---------------------------------------------------------
    // F. Apply scheduled downgrades at renewal
    // ---------------------------------------------------------
    const tomorrow = new Date(now.getTime() + 86400000).toISOString()
    const { data: pendingDowngrades } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .not('pending_plan', 'is', null)
      .lt('subscription_expires_at', tomorrow)
      .limit(100)

    for (const tenant of pendingDowngrades || []) {
      const { error } = await supabaseAdmin.from('tenants').update({
        plan: tenant.pending_plan,
        pending_plan: null
      }).eq('id', tenant.id)

      if (!error) {
        summary.downgrades_applied++
        await logAudit(tenant.id, 'subscription.downgrade_applied', { plan: tenant.pending_plan })
      }
    }

    console.log('[Scheduler] Finished daily run:', summary)

    return new Response(JSON.stringify({
      success: true,
      processed_at: now.toISOString(),
      summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Fatal Error in scheduler:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
