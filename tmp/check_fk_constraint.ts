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

async function checkConstraint() {
  console.log('=== CHECKING FOREIGN KEY CONSTRAINT ===\n');
  
  // Get a sample access code
  const { data: accessCode } = await supabase
    .from('access_codes')
    .select('*')
    .eq('code', 'PHC-B805-82C8')
    .single();

  console.log('Access Code Record:');
  console.log('- ID:', accessCode?.id);
  console.log('- Token:', accessCode?.token);
  console.log('- Code:', accessCode?.code);
  
  // Try to insert with different values to see which one works
  console.log('\n=== TESTING FOREIGN KEY VALUES ===\n');
  
  // Test 1: Using ID
  console.log('Test 1: Using ID (primary key)');
  const { error: error1 } = await supabase
    .from('onboarding_requests')
    .insert({
      access_code: accessCode?.id,
      pharmacy_name: 'Test Pharmacy',
      pharmacy_address: 'Test Address',
      pharmacy_email: 'test@test.com',
      pharmacy_phone: '1234567890',
      pcn_number: 'TEST123',
      contact_person_name: 'Test Person',
      status: 'pending',
      is_beta: true
    });
  
  if (error1) {
    console.log('❌ Failed with ID:', error1.message);
  } else {
    console.log('✅ Success with ID!');
    // Clean up
    await supabase.from('onboarding_requests').delete().eq('pharmacy_email', 'test@test.com');
  }
  
  // Test 2: Using Token
  console.log('\nTest 2: Using Token');
  const { error: error2 } = await supabase
    .from('onboarding_requests')
    .insert({
      access_code: accessCode?.token,
      pharmacy_name: 'Test Pharmacy 2',
      pharmacy_address: 'Test Address',
      pharmacy_email: 'test2@test.com',
      pharmacy_phone: '1234567890',
      pcn_number: 'TEST123',
      contact_person_name: 'Test Person',
      status: 'pending',
      is_beta: true
    });
  
  if (error2) {
    console.log('❌ Failed with Token:', error2.message);
  } else {
    console.log('✅ Success with Token!');
    // Clean up
    await supabase.from('onboarding_requests').delete().eq('pharmacy_email', 'test2@test.com');
  }
  
  // Test 3: Using Code
  console.log('\nTest 3: Using Code');
  const { error: error3 } = await supabase
    .from('onboarding_requests')
    .insert({
      access_code: accessCode?.code,
      pharmacy_name: 'Test Pharmacy 3',
      pharmacy_address: 'Test Address',
      pharmacy_email: 'test3@test.com',
      pharmacy_phone: '1234567890',
      pcn_number: 'TEST123',
      contact_person_name: 'Test Person',
      status: 'pending',
      is_beta: true
    });
  
  if (error3) {
    console.log('❌ Failed with Code:', error3.message);
  } else {
    console.log('✅ Success with Code!');
    // Clean up
    await supabase.from('onboarding_requests').delete().eq('pharmacy_email', 'test3@test.com');
  }
}

checkConstraint();
