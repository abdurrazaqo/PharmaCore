// validate-setup-token Edge Function
// Called by: SetupPage.tsx to verify the approval link before account creation
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
    const { token } = await req.json()

    if (!token) {
      return new Response(JSON.stringify({ valid: false, error: "Setup token is required" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: request, error } = await supabaseAdmin
      .from('onboarding_requests')
      .select('*, tenants(*)')
      .eq('setup_token', token)
      .single()

    if (error || !request) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid or expired setup link" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (request.setup_token_used_at) {
      return new Response(JSON.stringify({ valid: false, error: "This setup link has already been used" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (request.status !== 'approved') {
      return new Response(JSON.stringify({ valid: false, error: "This application has not been approved yet" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      valid: true,
      pharmacy_name: request.pharmacy_name,
      pharmacy_email: request.pharmacy_email,
      pharmacy_phone: request.pharmacy_phone,
      pharmacy_address: request.pharmacy_address,
      pcn_number: request.pcn_number,
      contact_person_name: request.contact_person_name,
      tenant_id: request.tenant_id,
      plan: request.tenants?.plan,
      billing_cycle: request.tenants?.billing_cycle
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    return new Response(JSON.stringify({ valid: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
