// send-beta-invitation Edge Function
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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration missing')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Missing authorization header")
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error("Unauthorized")
    }
    
    // Verify role in public.users
    const { data: profile } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'superadmin') throw new Error("Requires superadmin privileges")

    const body = await req.json()
    const { recipient_name, recipient_email, plan } = body

    if (!recipient_name || !recipient_email) {
      throw new Error("Recipient name and email are required")
    }

    const invitationPlan = (plan === 'basic' || plan === 'pro') ? plan : 'pro'

    // Step 1: Generate token and code
    const generateTokenAndCode = () => {
      const token = crypto.randomUUID()
      const stripped = token.replace(/-/g, '')
      const first8 = stripped.substring(0, 8)
      const g1 = first8.substring(0, 4).toUpperCase()
      const g2 = first8.substring(4, 8).toUpperCase()
      const code = `PHC-${g1}-${g2}`
      return { token, code }
    }

    const { token: invitationToken, code } = generateTokenAndCode()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Step 2: Insert into access_codes
    const { data: newCodeData, error: insertError } = await supabaseAdmin
      .from('access_codes')
      .insert([{
        token: invitationToken,
        code,
        status: 'unused',
        expires_at: expiresAt,
        is_beta: true,
        buyer_email: recipient_email,
        plan: invitationPlan,
        billing_cycle: 'annual',
        amount_paid: 0,
        paystack_reference: `BETA-INVITE-${code}`
      }])
      .select('id')
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw new Error("Failed to generate access code")
    }

    // Step 3: Send email using the custom template
    let emailSent = false
    if (resendApiKey) {
      const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Welcome to PharmaCore</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15px;
      color: #222222;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    a { color: #006C75; text-decoration: underline; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
  <tr>
    <td align="center" style="padding: 40px 16px;">

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.07);">

        <!-- Top bar -->
        <tr>
          <td style="background-color:#006C75; height:5px; font-size:0; line-height:0;">&nbsp;</td>
        </tr>

        <!-- Logo -->
        <tr>
          <td align="center" style="padding: 32px 40px;">
            <img src="https://pharmacore.365health.online/images/preview%20image.png" alt="PharmaCore by 365Health" width="280" style="display:block; height:auto; max-width:280px; margin:0 auto;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 32px 40px 36px;">

            <p style="margin:0 0 20px; font-size:15px; line-height:1.75; color:#222222; font-family:Arial,Helvetica,sans-serif;">
              Dear ${recipient_name},
            </p>

            <p style="margin:0 0 18px; font-size:15px; line-height:1.75; color:#333333; font-family:Arial,Helvetica,sans-serif;">
              My name is Abdur-Razaq, and I am the founder of PharmaCore. I started building it because I kept seeing Nigerian community pharmacies struggle with the same things &#8212; tracking inventory, managing sales, and staying organised &#8212; without software that actually fit the way they work.
            </p>

            <p style="margin:0 0 18px; font-size:15px; line-height:1.75; color:#333333; font-family:Arial,Helvetica,sans-serif;">
              You are one of the very first pharmacies on this platform, and that means a lot to me. I am giving you <strong>three months of free access</strong> &#8212; no payment, no pressure &#8212; to use PharmaCore as if it were already your everyday tool.
            </p>

            <p style="margin:0 0 28px; font-size:15px; line-height:1.75; color:#333333; font-family:Arial,Helvetica,sans-serif;">
              Over the coming weeks, I will send you short, practical emails to help you get the most out of the platform &#8212; from setting up your inventory to running your first sales report.
            </p>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
              <tr><td style="border-top:1px solid #eeeeee; font-size:0; line-height:0;">&nbsp;</td></tr>
            </table>

            <!-- Access Code Card -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td align="center" style="background-color:#F0F8F8; border:1.5px solid #B2D8DB; border-radius:12px; padding:28px 24px; font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#7A9EA0; margin-bottom:16px;">Your Access Code</div>
                  <div style="font-size:32px; font-weight:800; color:#006C75; letter-spacing:4px; font-family:'Courier New',Courier,monospace; line-height:1.3;">${code}</div>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
              <tr>
                <td align="center">
                  <a href="https://pharmacore.365health.online/onboard?token=${invitationToken}" style="display:inline-block; background-color:#006C75; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; padding:16px 48px; border-radius:50px; font-family:Arial,Helvetica,sans-serif;">Start Onboarding &#8594;</a>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr><td style="border-top:1px solid #eeeeee; font-size:0; line-height:0;">&nbsp;</td></tr>
            </table>

            <!-- Getting Started -->
            <p style="margin:0 0 20px; font-size:12px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:#006C75; font-family:Arial,Helvetica,sans-serif;">Getting Started</p>

            <!-- Step 1 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
              <tr>
                <td width="44" valign="top">
                  <div style="width:40px; height:40px; background-color:#E6F4F5; border-radius:10px; text-align:center; line-height:40px; font-size:20px; display:inline-block;">&#128279;</div>
                </td>
                <td style="padding-left:14px; vertical-align:top; padding-top:2px;">
                  <div style="font-size:14px; font-weight:700; color:#1A2B2C; font-family:Arial,Helvetica,sans-serif; margin-bottom:3px;">Open your onboarding link</div>
                  <div style="font-size:13px; color:#666666; font-family:Arial,Helvetica,sans-serif; line-height:1.5;">Click the button above &#8212; it takes you directly to your pharmacy setup page.</div>
                </td>
              </tr>
            </table>

            <!-- Step 2 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
              <tr>
                <td width="44" valign="top">
                  <div style="width:40px; height:40px; background-color:#E6F4F5; border-radius:10px; text-align:center; line-height:40px; font-size:20px; display:inline-block;">&#128273;</div>
                </td>
                <td style="padding-left:14px; vertical-align:top; padding-top:2px;">
                  <div style="font-size:14px; font-weight:700; color:#1A2B2C; font-family:Arial,Helvetica,sans-serif; margin-bottom:3px;">Your access code is pre-filled</div>
                  <div style="font-size:13px; color:#666666; font-family:Arial,Helvetica,sans-serif; line-height:1.5;">The button carries your code automatically &#8212; no need to type it in.</div>
                </td>
              </tr>
            </table>

            <!-- Step 3 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
              <tr>
                <td width="44" valign="top">
                  <div style="width:40px; height:40px; background-color:#E6F4F5; border-radius:10px; text-align:center; line-height:40px; font-size:20px; display:inline-block;">&#127973;</div>
                </td>
                <td style="padding-left:14px; vertical-align:top; padding-top:2px;">
                  <div style="font-size:14px; font-weight:700; color:#1A2B2C; font-family:Arial,Helvetica,sans-serif; margin-bottom:3px;">Set up your pharmacy profile</div>
                  <div style="font-size:13px; color:#666666; font-family:Arial,Helvetica,sans-serif; line-height:1.5;">Add your pharmacy name, address, contact details, and create your admin account.</div>
                </td>
              </tr>
            </table>

            <!-- Step 4 -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
              <tr>
                <td width="44" valign="top">
                  <div style="width:40px; height:40px; background-color:#E6F4F5; border-radius:10px; text-align:center; line-height:40px; font-size:20px; display:inline-block;">&#128640;</div>
                </td>
                <td style="padding-left:14px; vertical-align:top; padding-top:2px;">
                  <div style="font-size:14px; font-weight:700; color:#1A2B2C; font-family:Arial,Helvetica,sans-serif; margin-bottom:3px;">Start exploring</div>
                  <div style="font-size:13px; color:#666666; font-family:Arial,Helvetica,sans-serif; line-height:1.5;">Inventory, sales, prescriptions, and reports are all ready for you from day one.</div>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
              <tr><td style="border-top:1px solid #eeeeee; font-size:0; line-height:0;">&nbsp;</td></tr>
            </table>

            <!-- Closing -->
            <p style="margin:0 0 18px; font-size:15px; line-height:1.75; color:#333333; font-family:Arial,Helvetica,sans-serif;">
              I am personally invested in making sure this works well for you. If anything feels confusing, or if something is not working the way you expect, please reply to this email directly &#8212; I read every message.
            </p>

            <p style="margin:0 0 28px; font-size:15px; line-height:1.75; color:#333333; font-family:Arial,Helvetica,sans-serif;">
              Welcome to PharmaCore. I am glad you are here.
            </p>

            <!-- Signature -->
            <p style="margin:0; font-size:15px; line-height:1.9; color:#222222; font-family:Arial,Helvetica,sans-serif;">
              Abdur-Razaq Odeleye<br>
              <span style="font-size:13px; color:#888888;">Founder/CEO</span><br>
              <span style="font-size:13px; color:#888888;">365Health Systems</span>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f9f9f9; border-top:1px solid #eeeeee; padding:20px 40px; text-align:center;">
            <p style="margin:0 0 5px; font-size:11px; color:#aaaaaa; font-family:Arial,Helvetica,sans-serif; line-height:1.6;">
              365Health Systems Ltd &nbsp;&#183;&nbsp; Kano, Nigeria
            </p>
            <p style="margin:0; font-size:11px; color:#aaaaaa; font-family:Arial,Helvetica,sans-serif; line-height:1.6;">
              Questions? <a href="mailto:hello@365health.online" style="color:#006C75; text-decoration:none;">hello@365health.online</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
      `

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'PharmaCore <hello@365health.online>',
          to: [recipient_email],
          subject: `Welcome to PharmaCore — Your Access Details`,
          html: emailTemplate
        })
      })
      
      if (!emailRes.ok) {
        const errorText = await emailRes.text()
        console.error('Resend API error:', errorText)
      } else {
        const eData = await emailRes.json()
        if (eData.id) emailSent = true
      }
    }

    // Step 4: Log audit
    await supabaseAdmin.from('audit_logs').insert([{
      action: 'beta_invite.sent',
      resource_type: 'access_code',
      resource_id: newCodeData?.id || code,
      user_id: user.id,
      new_values: { recipient_name, recipient_email, access_code: code }
    }])

    return new Response(JSON.stringify({ success: true, code, email_sent: emailSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Beta invitation error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
