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

async function debugApproval() {
  console.log('=== DEBUGGING APPROVAL ERROR ===\n');
  
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
  console.log('Testing approval for:', request.pharmacy_name);
  console.log('Request ID:', request.id);
  
  // Try calling the Edge Function (this will fail without auth, but we'll see the error)
  console.log('\nCalling approve-onboarding Edge Function...');
  const { data, error } = await supabase.functions.invoke('approve-onboarding', {
    body: { request_id: request.id }
  });
  
  console.log('\nResponse:');
  console.log('Data:', data);
  console.log('Error:', error);
  
  if (error) {
    console.log('\n❌ Error details:');
    console.log('Message:', error.message);
    console.log('Context:', error.context);
  }
}

debugApproval();
