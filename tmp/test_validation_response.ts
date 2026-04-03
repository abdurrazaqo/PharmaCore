import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testValidation() {
  console.log('=== TESTING VALIDATION FUNCTION RESPONSE ===\n');
  
  const testCode = 'PHC-B805-82C8';
  
  console.log('Testing with code:', testCode);
  
  const { data, error } = await supabase.functions.invoke('validate-access-token', {
    body: { code: testCode }
  });
  
  if (error) {
    console.log('❌ Error:', error);
    return;
  }
  
  console.log('\n✅ Response from Edge Function:');
  console.log(JSON.stringify(data, null, 2));
  
  console.log('\n=== CHECKING WHAT WE NEED ===');
  console.log('Has code field?', 'code' in data);
  console.log('Code value:', data.code);
  console.log('Has token field?', 'token' in data);
  console.log('Token value:', data.token);
  
  if (!data.code) {
    console.log('\n⚠️  WARNING: The Edge Function is not returning the "code" field!');
    console.log('This means the deployment might not have taken effect yet.');
    console.log('Try waiting a minute and running this script again.');
  } else {
    console.log('\n✅ Edge Function is returning the code correctly!');
    console.log('The issue must be elsewhere in the flow.');
  }
}

testValidation();
