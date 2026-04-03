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

async function getSetupInfo() {
  console.log('=== GETTING SETUP INFO FOR APPROVED PHARMACY ===\n');
  
  // Get the most recently approved request
  const { data: request, error } = await supabase
    .from('onboarding_requests')
    .select('*')
    .eq('pharmacy_name', 'my365Pharmacy')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !request) {
    console.log('Could not find the approved request');
    return;
  }
  
  console.log('Pharmacy:', request.pharmacy_name);
  console.log('Email:', request.pharmacy_email);
  console.log('Setup Token:', request.setup_token);
  console.log('Tenant ID:', request.tenant_id);
  console.log('\n=== SETUP LINK ===');
  console.log(`https://pharmacore.365health.online/setup?token=${request.setup_token}`);
  console.log('\n⚠️  You can manually send this link to:', request.pharmacy_email);
  console.log('\nOr I can help you send an email with this link.');
}

getSetupInfo();
