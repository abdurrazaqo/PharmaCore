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

async function createTestOnboarding() {
  console.log('=== CREATING TEST ONBOARDING REQUEST ===\n');
  
  // First, check if there's an unused beta code
  const { data: accessCode } = await supabase
    .from('access_codes')
    .select('*')
    .eq('status', 'unused')
    .eq('is_beta', true)
    .limit(1)
    .single();
  
  if (!accessCode) {
    console.log('❌ No unused beta codes found. Generate one from superadmin first.');
    return;
  }
  
  console.log('Using access code:', accessCode.code);
  
  // Create a test onboarding request
  const { data, error } = await supabase
    .from('onboarding_requests')
    .insert([{
      access_code: accessCode.code,
      pharmacy_name: 'Test Pharmacy for Approval',
      pharmacy_address: '123 Test Street, Test City',
      pharmacy_email: 'test-pharmacy@example.com',
      pharmacy_phone: '08012345678',
      pcn_number: 'TEST-PCN-001',
      contact_person_name: 'Test Contact Person',
      status: 'pending',
      is_beta: true
    }])
    .select()
    .single();
  
  if (error) {
    console.log('❌ Error creating test request:', error.message);
    return;
  }
  
  console.log('\n✅ Test onboarding request created!');
  console.log('- ID:', data.id);
  console.log('- Pharmacy:', data.pharmacy_name);
  console.log('- Email:', data.pharmacy_email);
  console.log('\nYou can now test approval from the superadmin dashboard.');
}

createTestOnboarding();
