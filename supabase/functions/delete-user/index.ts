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
    if (!authHeader) throw new Error('Missing Authorization header')
    
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role, tenant_id, branch_id')
      .eq('id', user.id)
      .single()

    const { user_id } = await req.json()
    
    const { data: targetProfile } = await supabaseAdmin
      .from('users')
      .select('role, tenant_id, branch_id')
      .eq('id', user_id)
      .single()

    if (!targetProfile) throw new Error('Target user not found')

    if (callerProfile.tenant_id !== targetProfile.tenant_id && callerProfile.role !== 'superadmin') {
      throw new Error('Unauthorized: Tenant mismatch')
    }
    
    if (callerProfile.role === 'branch_admin') {
      if (targetProfile.branch_id !== callerProfile.branch_id) {
         throw new Error('Unauthorized: Cannot delete outside your branch')
      }
      if (['tenant_admin', 'branch_admin', 'superadmin'].includes(targetProfile.role)) {
         throw new Error('Unauthorized: Cannot delete administrators')
      }
    }
    
    if (callerProfile.role === 'tenant_admin' && ['superadmin'].includes(targetProfile.role)) {
        throw new Error('Unauthorized: Cannot delete superadmin')
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (deleteAuthError) throw deleteAuthError

    await supabaseAdmin.from('users').delete().eq('id', user_id)
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'An error occurred' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
