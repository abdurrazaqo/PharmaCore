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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing token')

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    // Auth Check
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) throw new Error('Unauthorized')

    const { role: newRole } = await req.json()
    const validRoles = ['tenant_admin', 'branch_admin', 'pharmacist', 'cashier']
    if (!validRoles.includes(newRole)) throw new Error('Invalid role specified')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify user belongs to DEMO tenant strictly
    const DEMO_TENANT = '00000000-0000-0000-0000-000000000001'
    
    const { data: userProfile } = await supabaseAdmin.from('users').select('tenant_id').eq('id', user.id).single()
    
    if (userProfile?.tenant_id !== DEMO_TENANT) {
      throw new Error('This action is strictly restricted to the Demo environment')
    }

    // Role modification is valid, update Public Schema
    const { error: updateErr } = await supabaseAdmin.from('users').update({ role: newRole }).eq('id', user.id)
    if (updateErr) throw new Error(updateErr.message)

    return new Response(JSON.stringify({ success: true, new_role: newRole }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
