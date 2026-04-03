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

async function checkExisting() {
  console.log('=== CHECKING EXISTING ONBOARDING REQUESTS ===\n');
  
  const testCode = 'PHC-B805-82C8';
  
  // Check if there's already an onboarding request with this code
  const { data: existing, error } = await supabase
    .from('onboarding_requests')
    .select('*')
    .eq('access_code', testCode);
  
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log('Existing onboarding requests with code', testCode + ':');
  console.log(existing);
  
  if (existing && existing.length > 0) {
    console.log('\n⚠️  FOUND EXISTING REQUEST(S)!');
    console.log('This is why you\'re getting a conflict error.');
    console.log('\nDo you want to delete these test requests? (Y/N)');
    console.log('\nTo delete, run:');
    console.log('npx tsx tmp/delete_test_onboarding.ts');
  } else {
    console.log('\n✅ No existing requests found.');
    console.log('The issue must be something else.');
  }
  
  // Also check the access_codes table
  console.log('\n=== CHECKING ACCESS CODE ===\n');
  const { data: accessCode } = await supabase
    .from('access_codes')
    .select('*')
    .eq('code', testCode)
    .single();
  
  console.log('Access code details:');
  console.log('- Code:', accessCode?.code);
  console.log('- Status:', accessCode?.status);
  console.log('- Used by tenant:', accessCode?.used_by_tenant_id);
}

checkExisting();
