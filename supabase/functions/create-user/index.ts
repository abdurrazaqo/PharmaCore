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
    console.log('Authorization header present:', !!authHeader)
    if (authHeader) {
      console.log('Header preview:', authHeader.substring(0, 15) + '...')
    }

    if (!authHeader) throw new Error('Missing Authorization header')
    
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    console.log('Verifying user with supabaseUserClient.auth.getUser()...')
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser()
    if (userError) {
      console.error('getUser error:', userError)
      throw new Error(`Unauthorized: ${userError.message}`)
    }
    if (!user) {
      console.error('No user found for provided token')
      throw new Error('Unauthorized: Session not found')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role, tenant_id, branch_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile) throw new Error('Caller profile not found')
    
    const { email, password, display_name, role, tenant_id, branch_id } = await req.json()
    console.log(`Creating user: ${email} with role: ${role}`)
    console.log('Payload:', { email, display_name, role, tenant_id, branch_id })

    if (callerProfile.tenant_id !== tenant_id && callerProfile.role !== 'superadmin') {
      console.error('Tenant mismatch:', { callerTenant: callerProfile.tenant_id, targetTenant: tenant_id, callerRole: callerProfile.role })
      return new Response(JSON.stringify({ 
        error: 'Unauthorized: Tenant mismatch',
        details: `Your account is linked to tenant ${callerProfile.tenant_id}, but the request is for ${tenant_id}`
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Role validation
    const validTenantAdminRoles = ['branch_admin', 'pharmacist', 'pharmacy_technician', 'cashier', 'tenant_admin']
    const validBranchAdminRoles = ['pharmacist', 'pharmacy_technician', 'cashier']

    if (callerProfile.role === 'tenant_admin' && !validTenantAdminRoles.includes(role)) {
      console.error('Invalid role for Tenant Admin:', role)
      throw new Error(`Unauthorized role assignment. Tenant admins can assign: ${validTenantAdminRoles.join(', ')}`)
    }
    
    if (callerProfile.role === 'branch_admin') {
      if (!validBranchAdminRoles.includes(role)) {
        console.error('Invalid role for Branch Admin:', role)
        throw new Error(`Unauthorized role assignment. Branch admins can assign: ${validBranchAdminRoles.join(', ')}`)
      }
      if (branch_id && branch_id !== '' && branch_id !== callerProfile.branch_id) {
         console.error('Branch mismatch for Branch Admin:', { callerBranch: callerProfile.branch_id, targetBranch: branch_id })
         return new Response(JSON.stringify({ 
           error: 'Unauthorized: Branch mismatch',
           details: 'Branch admins can only create users within their own branch.'
         }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    if (['staff', 'staff_admin'].includes(role)) {
       throw new Error('Invalid legacy role provided.')
    }

    // 1. Create auth user
    console.log('Calling auth.admin.createUser...')
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name }
    })

    if (createError) {
      console.error('Auth creation error:', createError)
      throw createError
    }
    
    const newUserId = authData.user.id
    console.log('Auth user created:', newUserId)

    // 2. Insert into public.users
    console.log('Inserting into public.users...')
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert([{ 
        id: newUserId, 
        tenant_id, 
        branch_id: (branch_id && branch_id !== '') ? branch_id : null, 
        role, 
        display_name 
      }])

    if (insertError) {
      console.error('Public user insert error:', insertError)
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw insertError
    }

    console.log('User creation successful')
    return new Response(
      JSON.stringify({ success: true, user: { id: newUserId, email, display_name, role, tenant_id, branch_id } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    console.error('Edge Function Exception:', err)
    return new Response(JSON.stringify({ error: err.message || 'An error occurred' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
