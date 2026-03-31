import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    if (!callerProfile) throw new Error('Caller profile not found')
    
    const { email, password, display_name, role, tenant_id, branch_id } = await req.json()

    if (callerProfile.tenant_id !== tenant_id && callerProfile.role !== 'superadmin') {
      throw new Error('Unauthorized: Tenant mismatch')
    }

    // Role validation
    const validTenantAdminRoles = ['branch_admin', 'pharmacist', 'pharmacy_technician', 'cashier']
    const validBranchAdminRoles = ['pharmacist', 'pharmacy_technician', 'cashier']

    if (callerProfile.role === 'tenant_admin' && !validTenantAdminRoles.includes(role)) {
      throw new Error(`Unauthorized role assignment. Tenant admins can assign: ${validTenantAdminRoles.join(', ')}`)
    }
    
    if (callerProfile.role === 'branch_admin') {
      if (!validBranchAdminRoles.includes(role)) {
        throw new Error(`Unauthorized role assignment. Branch admins can assign: ${validBranchAdminRoles.join(', ')}`)
      }
      if (branch_id !== callerProfile.branch_id) {
         throw new Error('Unauthorized: Branch mismatch for Branch Admin')
      }
    }

    if (['staff', 'staff_admin'].includes(role)) {
       throw new Error('Invalid legacy role provided.')
    }

    // 1. Create auth user
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (createError) throw createError
    
    const newUserId = authData.user.id

    // 2. Insert into public.users
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert([{ id: newUserId, tenant_id, branch_id: branch_id || null, role, display_name }])

    if (insertError) {
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw insertError
    }

    return new Response(
      JSON.stringify({ success: true, user: { id: newUserId, email, display_name, role, tenant_id, branch_id } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'An error occurred' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
