import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

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

    const { paystack_reference, tenant_id, new_plan } = await req.json()

    // Verify Paystack
    const pRes = await fetch(`https://api.paystack.co/transaction/verify/${paystack_reference}`, {
      headers: { Authorization: `Bearer ${paystackSecret}` }
    })
    const pData = await pRes.json()
    if (!pData.status || pData.data.status !== 'success') {
      throw new Error('Payment verification failed')
    }

    // Apply Upgrade Immediate
    const { error: updateError } = await supabaseAdmin.from('tenants').update({
      plan: new_plan,
      pending_plan: null 
    }).eq('id', tenant_id)

    if (updateError) throw updateError
    
    await supabaseAdmin.from('audit_logs').insert([
      { tenant_id, user_id: user.id, action: 'SUBSCRIPTION_UPGRADED', resource_type: 'tenant', resource_id: tenant_id, new_values: { plan: new_plan } }
    ])

    return new Response(JSON.stringify({ success: true, new_plan }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'An error occurred' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
