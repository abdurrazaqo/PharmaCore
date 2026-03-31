// validate-access-token Edge Function
// Called by: OnboardPage.tsx to verify code/token before showing registration form
// Auth: None (public)
// Required environment variables:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { token, code } = await req.json()

    if (!token && !code) {
      return new Response(JSON.stringify({ valid: false, error: "Access code or token is required" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Query access_codes
    let query = supabaseAdmin.from('access_codes').select('*')
    if (token) {
      query = query.eq('token', token)
    } else {
      query = query.eq('code', code.toUpperCase())
    }

    const { data: accessCode, error } = await query.single()

    if (error || !accessCode) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid access code" }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check status
    if (accessCode.status === 'used') {
      return new Response(JSON.stringify({ valid: false, error: "This access code has already been used" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const now = new Date()
    const expiresAt = new Date(accessCode.expires_at)

    if (accessCode.status === 'expired' || expiresAt < now) {
      if (accessCode.status !== 'expired') {
        await supabaseAdmin.from('access_codes').update({ status: 'expired' }).eq('id', accessCode.id)
      }
      return new Response(JSON.stringify({ valid: false, error: "This access code has expired. Please contact support at hello@365health.online" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Success
    return new Response(JSON.stringify({
      valid: true,
      plan: accessCode.plan,
      billing_cycle: accessCode.billing_cycle,
      buyer_email: accessCode.buyer_email,
      expires_at: accessCode.expires_at,
      is_beta: !!accessCode.is_beta
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    return new Response(JSON.stringify({ valid: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
