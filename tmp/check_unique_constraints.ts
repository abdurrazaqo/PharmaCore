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

async function testInsert() {
  console.log('=== TESTING ACTUAL INSERT ===\n');
  
  const testData = {
    access_code: 'PHC-B805-82C8',
    pharmacy_name: 'Debug Test Pharmacy',
    pharmacy_address: 'Test Address 123',
    pharmacy_email: 'debugtest@example.com',
    pharmacy_phone: '1234567890',
    pcn_number: 'TEST-PCN-123',
    contact_person_name: 'Debug Tester',
    status: 'pending',
    is_beta: true
  };
  
  console.log('Attempting to insert:', testData);
  
  const { data, error } = await supabase
    .from('onboarding_requests')
    .insert([testData])
    .select();
  
  if (error) {
    console.log('\n❌ INSERT FAILED');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Error details:', error.details);
    console.log('Error hint:', error.hint);
    console.log('\nFull error object:');
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log('\n✅ INSERT SUCCESSFUL');
    console.log('Inserted data:', data);
    
    // Clean up
    console.log('\nCleaning up test data...');
    await supabase
      .from('onboarding_requests')
      .delete()
      .eq('pharmacy_email', 'debugtest@example.com');
    console.log('✅ Cleanup complete');
  }
}

testInsert();
