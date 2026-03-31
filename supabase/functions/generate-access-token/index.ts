// generate-access-token Edge Function
// Called by: 365Health checkout page (www.365health.online) after successful Paystack payment
// Auth: None (public) — secured by server-side Paystack payment verification
// Required environment variables:
//   PAYSTACK_SECRET_KEY — Paystack secret key for payment verification
//   RESEND_API_KEY — Resend API key for sending confirmation emails
//   SUPABASE_URL — Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key for DB writes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ORIGINS = [
  'https://www.365health.online',
  'http://localhost:5173',
  'http://localhost:3000'
]

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const headers = { ...corsHeaders }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  } else {
     headers['Access-Control-Allow-Origin'] = 'https://www.365health.online'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey || !paystackSecret) {
      throw new Error('Server configuration missing')
    }

    const body = await req.json()
    const { paystack_reference, plan, billing_cycle, buyer_email, buyer_phone, buyer_name, pharmacy_name } = body

    // Step 1: Validate request body
    if (!paystack_reference || !plan || !billing_cycle || !buyer_email || !buyer_name) {
      return new Response(JSON.stringify({ success: false, error: "Invalid request body" }), { 
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' } 
      })
    }

    if (!['basic', 'pro'].includes(plan)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid plan" }), { 
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' } 
      })
    }

    if (!['monthly', 'annual'].includes(billing_cycle)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid billing cycle" }), { 
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' } 
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Step 2: Idempotency check
    const { data: existingCode } = await supabaseAdmin
      .from('access_codes')
      .select('token, code, expires_at')
      .eq('paystack_reference', paystack_reference)
      .single()

    if (existingCode) {
      return new Response(JSON.stringify({
        success: true,
        token: existingCode.token,
        code: existingCode.code,
        expires_at: existingCode.expires_at,
        email_sent: false
      }), { headers: { ...headers, 'Content-Type': 'application/json' }, status: 200 })
    }

    // Step 3: Verify payment with Paystack
    const expectedKobo = {
      'basic-monthly': 1000000,
      'basic-annual': 10000000,
      'pro-monthly': 2000000,
      'pro-annual': 20000000
    }[`${plan}-${billing_cycle}`]

    let pData;
    try {
      const pRes = await fetch(`https://api.paystack.co/transaction/verify/${paystack_reference}`, {
        headers: { Authorization: `Bearer ${paystackSecret}` }
      })
      pData = await pRes.json()
    } catch (err) {
      console.error('Paystack API error:', err)
      return new Response(JSON.stringify({ success: false, error: "Payment verification service unavailable. Please try again." }), { 
        status: 502, headers: { ...headers, 'Content-Type': 'application/json' } 
      })
    }

    if (!pData.status || pData.data.status !== 'success') {
       return new Response(JSON.stringify({ success: false, error: "Payment not successful on Paystack" }), { 
         status: 400, headers: { ...headers, 'Content-Type': 'application/json' } 
       })
    }

    if (pData.data.currency !== 'NGN') {
       return new Response(JSON.stringify({ success: false, error: "Invalid currency" }), { 
         status: 400, headers: { ...headers, 'Content-Type': 'application/json' } 
       })
    }

    if (pData.data.amount !== expectedKobo) {
       return new Response(JSON.stringify({ success: false, error: "Payment amount mismatch" }), { 
         status: 400, headers: { ...headers, 'Content-Type': 'application/json' } 
       })
    }

    if (pData.data.customer.email.toLowerCase() !== buyer_email.toLowerCase()) {
       return new Response(JSON.stringify({ success: false, error: "Email mismatch" }), { 
         status: 400, headers: { ...headers, 'Content-Type': 'application/json' } 
       })
    }

    // Step 4: Generate token and code
    const generateTokenAndCode = () => {
      const token = crypto.randomUUID()
      const stripped = token.replace(/-/g, '')
      const first8 = stripped.substring(0, 8)
      const g1 = first8.substring(0, 4).toUpperCase()
      const g2 = first8.substring(4, 8).toUpperCase()
      const code = `PHC-${g1}-${g2}`
      return { token, code }
    }

    let { token, code } = generateTokenAndCode()

    // Step 5: Insert into access_codes (with one retry for collision)
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const insertData = {
      token,
      code,
      paystack_reference,
      plan,
      billing_cycle,
      amount_paid: pData.data.amount / 100,
      buyer_email,
      buyer_phone,
      status: 'unused',
      expires_at: expiresAt
    }

    let { error: insertError } = await supabaseAdmin.from('access_codes').insert([insertData])

    if (insertError && insertError.code === '23505') { // Unique violation
        console.warn('Code collision detected, retrying...')
        const retry = generateTokenAndCode()
        token = retry.token
        code = retry.code
        insertData.token = token
        insertData.code = code
        const { error: retryError } = await supabaseAdmin.from('access_codes').insert([insertData])
        insertError = retryError
    }

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(JSON.stringify({ success: false, error: "Failed to generate access code. Please contact support." }), { 
        status: 500, headers: { ...headers, 'Content-Type': 'application/json' } 
      })
    }

    // Step 6: Send confirmation email via Resend
    let emailSent = false
    const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    const emailTemplate = `
      <div style="background-color: white; max-width: 600px; margin: 0 auto; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #334155;">
        <div style="background-color: #006C75; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">PharmaCore by 365Health</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 0;">Hi ${buyer_name},</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #475569;">
            Thank you for your payment. Your PharmaCore access details are below. Use this code to complete your pharmacy setup.
          </p>
          
          <div style="background-color: #f8fafc; border: 2px solid #006C75; border-radius: 8px; padding: 24px; text-align: center; margin: 32px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase;">
              YOUR ACCESS CODE
            </p>
            <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #006C75; letter-spacing: 2px;">
              ${code}
            </p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://pharmacore.365health.online/onboard?token=${token}" 
               style="display: inline-block; background-color: #006C75; color: white; padding: 14px 32px; border-radius: 24px; font-size: 16px; font-weight: 700; text-decoration: none; transition: opacity 0.2s;">
              Start Onboarding &rarr;
            </a>
            <p style="margin: 16px 0 0 0; font-size: 12px; color: #94a3b8;">
              If the button doesn't work, visit pharmacore.365health.online/onboard and enter your code manually.
            </p>
          </div>
          
          <div style="background-color: #FFF8E1; border-left: 4px solid #F59E0B; padding: 16px; margin: 32px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>⚠️ Important:</strong> Your access code expires on <strong>${formattedExpiry}</strong>. It can only be used once to create your admin account.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 24px;">
            <strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)} &mdash; ${billing_cycle.charAt(0).toUpperCase() + billing_cycle.slice(1)} billing | 30-day free trial included
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0 0 8px 0;">Questions? Contact us at <a href="mailto:hello@365health.online" style="color: #006C75; text-decoration: none;">hello@365health.online</a></p>
          <p style="margin: 0;">&copy; 2025 365Health Systems Ltd. Lagos, Nigeria.</p>
        </div>
      </div>
    `

    if (resendApiKey) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'PharmaCore <hello@365health.online>',
            to: [buyer_email],
            subject: `Your PharmaCore Access Code — ${code}`,
            html: emailTemplate
          })
        })
        const eData = await emailRes.json()
        if (eData.id) emailSent = true
      } catch (err) {
        console.error('Email delivery error:', err)
        // Non-blocking
      }
    }

    // Step 7: Return success
    return new Response(JSON.stringify({
      success: true,
      token,
      code,
      expires_at: expiresAt,
      email_sent: emailSent
    }), { headers: { ...headers, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err: any) {
    console.error('Runtime error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message || 'An error occurred' }), { 
      status: 400, headers: { ...headers, 'Content-Type': 'application/json' } 
    })
  }
})
