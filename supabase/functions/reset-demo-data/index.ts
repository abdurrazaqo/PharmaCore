import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { generateSeedData, DEMO_TENANT_ID } from "../_shared/demoSeedData.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    const authHeader = req.headers.get('Authorization')
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Build Demo Data
    const { products, customers, transactions, salesItems } = generateSeedData()

    // Delete existing records cascade
    await supabaseAdmin.from('sales').delete().eq('tenant_id', DEMO_TENANT_ID)
    await supabaseAdmin.from('transactions').delete().eq('tenant_id', DEMO_TENANT_ID)
    await supabaseAdmin.from('customers').delete().eq('tenant_id', DEMO_TENANT_ID)
    await supabaseAdmin.from('products').delete().eq('tenant_id', DEMO_TENANT_ID)

    // Parallel insert
    await Promise.all([
       supabaseAdmin.from('products').insert(products),
       supabaseAdmin.from('customers').insert(customers)
    ])

    // Wait for PK records then insert transactions
    await supabaseAdmin.from('transactions').insert(transactions)
    await supabaseAdmin.from('sales').insert(salesItems)

    const result = {
      success: true,
      reset_at: new Date().toISOString(),
      seeded: {
        products: products.length,
        customers: customers.length,
        transactions: transactions.length
      }
    }

    // Log the reset
    await supabaseAdmin.from('audit_logs').insert([{
      tenant_id: DEMO_TENANT_ID,
      user_id: null,
      action: 'system.demo_data_reset',
      resource_type: 'tenant',
      resource_id: DEMO_TENANT_ID,
      new_values: result.seeded
    }])

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err: any) {
    console.error('Demo reset failed:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
