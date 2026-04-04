// finalize-onboarding Edge Function
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
    
    // Verify user profile and tenant_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()
      
    if (profileError || !profile) throw new Error("User profile not found")
    
    // Safety check: Only tenant_admin or superadmin should do this
    if (profile.role !== 'tenant_admin' && profile.role !== 'superadmin') {
      throw new Error("Access denied: Insufficient permissions")
    }

    // Update the tenant record using service role (bypassing RLS)
    const { data: updatedTenant, error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({ onboarding_completed: true })
      .eq('id', profile.tenant_id)
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('Finalization Update Error:', updateError)
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Database update failed: ${updateError.message}`,
        details: updateError 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!updatedTenant) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `No tenant record found with ID: ${profile.tenant_id}. Update failed.`,
        tenant_id: profile.tenant_id
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Onboarding finalized successfully",
      updated_tenant_id: updatedTenant.id,
      onboarding_completed: updatedTenant.onboarding_completed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Finalization error:', err)
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
