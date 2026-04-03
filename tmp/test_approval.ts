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

async function testApproval() {
  console.log('=== TESTING APPROVAL FLOW ===\n');
  
  // Get the pending request
  const { data: requests, error: reqError } = await supabase
    .from('onboarding_requests')
    .select('*')
    .eq('status', 'pending')
    .limit(1);
  
  if (reqError || !requests || requests.length === 0) {
    console.log('No pending requests found');
    return;
  }
  
  const request = requests[0];
  console.log('Found pending request:');
  console.log('- ID:', request.id);
  console.log('- Pharmacy:', request.pharmacy_name);
  console.log('- Access Code:', request.access_code);
  
  // Check if access code exists
  console.log('\n=== CHECKING ACCESS CODE ===');
  const { data: accessCode, error: codeError } = await supabase
    .from('access_codes')
    .select('*')
    .eq('code', request.access_code)
    .single();
  
  if (codeError) {
    console.log('❌ Error fetching access code:', codeError.message);
    console.log('This is likely the issue!');
    
    // Try to find what access codes exist
    console.log('\n=== CHECKING ALL ACCESS CODES ===');
    const { data: allCodes } = await supabase
      .from('access_codes')
      .select('code, token, status');
    console.log('Available codes:', allCodes);
    
  } else {
    console.log('✅ Access code found:');
    console.log('- Code:', accessCode.code);
    console.log('- Plan:', accessCode.plan);
    console.log('- Billing:', accessCode.billing_cycle);
    console.log('- Is Beta:', accessCode.is_beta);
  }
}

testApproval();
