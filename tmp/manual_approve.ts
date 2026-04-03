import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function manualApprove() {
  console.log('=== MANUALLY APPROVING PENDING REQUEST ===\n');
  
  // Get pending request
  const { data: requests } = await supabase
    .from('onboarding_requests')
    .select('*')
    .eq('status', 'pending')
    .limit(1);
  
  if (!requests || requests.length === 0) {
    console.log('No pending requests');
    return;
  }
  
  const request = requests[0];
  console.log('Approving:', request.pharmacy_name);
  console.log('Email:', request.pharmacy_email);
  
  // Get access code
  const { data: accessCode } = await supabase
    .from('access_codes')
    .select('*')
    .eq('code', request.access_code)
    .single();
  
  const isBeta = accessCode?.is_beta === true;
  const giftedUntil = isBeta ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : null;
  
  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert([{
      name: request.pharmacy_name,
      status: 'active',
      plan: accessCode?.plan || 'basic',
      billing_cycle: accessCode?.billing_cycle || 'monthly',
      pharmacy_address: request.pharmacy_address,
      pharmacy_phone: request.pharmacy_phone,
      pharmacy_email: request.pharmacy_email,
      pcn_number: request.pcn_number,
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date().toISOString(),
      is_gifted: isBeta,
      gifted_until: giftedUntil
    }])
    .select()
    .single();
  
  if (tenantError) {
    console.log('❌ Error creating tenant:', tenantError);
    return;
  }
  
  console.log('✅ Tenant created:', tenant.id);
  
  // Update request
  const setupToken = crypto.randomUUID();
  await supabase
    .from('onboarding_requests')
    .update({
      status: 'approved',
      tenant_id: tenant.id,
      setup_token: setupToken,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', request.id);
  
  console.log('✅ Request updated');
  console.log('\n=== SETUP LINK ===');
  console.log(`https://pharmacore.365health.online/setup?token=${setupToken}`);
  console.log('\nSend this link to:', request.pharmacy_email);
  console.log('\n✅ Approval complete!');
}

manualApprove();
