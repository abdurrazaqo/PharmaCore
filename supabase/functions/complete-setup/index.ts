// complete-setup Edge Function
// Called by: SetupPage.tsx to finalise account creation
// Auth: None (public, validated via setup_token)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { setup_token, pharmacy_name, pharmacy_email, pharmacy_phone, pharmacy_address, admin_name, admin_email, password } = await req.json()

    // 1. Re-validate setup token
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('onboarding_requests')
      .select('*')
      .eq('setup_token', setup_token)
      .single()

    if (fetchError || !request || request.setup_token_used_at || request.status !== 'approved') {
       return new Response(JSON.stringify({ success: false, error: "Unauthorized or invalid setup session" }), {
         status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       })
    }

    // 2. Create Auth User
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: admin_email,
      password: password,
      email_confirm: true,
      user_metadata: { display_name: admin_name }
    })

    if (authError) {
      return new Response(JSON.stringify({ success: false, error: authError.message.includes('already exists') ? "An account with this email already exists." : authError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = authUser.user.id

    // 3. Insert into public.users
    const { error: userInsertError } = await supabaseAdmin.from('users').insert([{
      id: userId,
      tenant_id: request.tenant_id,
      role: 'tenant_admin',
      display_name: admin_name,
      branch_id: null
    }])

    if (userInsertError) {
      console.error('User record insertion failed:', userInsertError)
      // Cleanup auth user to allow retry
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(JSON.stringify({ 
        success: false, 
        error: `User profile creation failed: ${userInsertError.message}`,
        details: userInsertError
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Update Tenant
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { error: tenantUpdateError } = await supabaseAdmin
      .from('tenants')
      .update({
        name: pharmacy_name,
        pharmacy_email: pharmacy_email,
        pharmacy_phone: pharmacy_phone,
        pharmacy_address: pharmacy_address,
        status: 'active',
        trial_ends_at: trialEndsAt,
        onboarding_completed: false
      })
      .eq('id', request.tenant_id)

    if (tenantUpdateError) {
      console.error('Tenant update failed:', tenantUpdateError)
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Tenant record update failed: ${tenantUpdateError.message}`,
        details: tenantUpdateError
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Mark onboarding request as completed
    const { error: requestUpdateError } = await supabaseAdmin
      .from('onboarding_requests')
      .update({ setup_token_used_at: new Date().toISOString() })
      .eq('id', request.id)

    if (requestUpdateError) {
      console.error('Onboarding request update failed:', requestUpdateError)
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Request update failed: ${requestUpdateError.message}`,
        details: requestUpdateError 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 6. Send Welcome Email
    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'PharmaCore <hello@365health.online>',
            to: [admin_email],
            subject: "Welcome to PharmaCore — Your pharmacy is ready!",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #006C75;">Welcome aboard, ${admin_name}!</h1>
                <p>Your setup for <strong>${pharmacy_name}</strong> is complete. You now have full access to your PharmaCore dashboard.</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Your Trial Period:</strong> 30 Days (Expires ${new Date(trialEndsAt).toLocaleDateString()})</p>
                  <p><strong>Login URL:</strong> <a href="https://pharmacore.365health.online/login">pharmacore.365health.online/login</a></p>
                </div>
                <p>Need help getting started? Reply to this email or visit our help center.</p>
                <p>Cheers,<br>The PharmaCore Team</p>
              </div>
            `
          })
        })
      } catch (e) {
        console.error('Welcome email failed:', e)
      }
    }

    return new Response(JSON.stringify({ success: true, tenant_id: request.tenant_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Setup completion error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message || "An unexpected error occurred" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
