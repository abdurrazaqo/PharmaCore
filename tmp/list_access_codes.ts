// Script to list all access codes
// Run with: npx tsx tmp/list_access_codes.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('VITE_SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAccessCodes() {
  console.log('\n=== ALL ACCESS CODES ===\n');

  // Get all access codes
  const { data: codes, error } = await supabase
    .from('access_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching access codes:', error);
    return;
  }

  if (!codes || codes.length === 0) {
    console.log('No access codes found in database.');
    return;
  }

  console.log(`Found ${codes.length} access code(s):\n`);

  for (const code of codes) {
    const isBeta = code.is_beta;
    const isExpired = new Date(code.expires_at) < new Date();
    
    console.log(`${isBeta ? '🧪 BETA CODE' : '💳 PAID CODE'}`);
    console.log(`  Code: ${code.code}`);
    console.log(`  Status: ${code.status}${isExpired ? ' (EXPIRED)' : ''}`);
    console.log(`  Plan: ${code.plan} - ${code.billing_cycle}`);
    console.log(`  Amount: ₦${code.amount_paid || 0}`);
    console.log(`  Email: ${code.buyer_email}`);
    console.log(`  Created: ${new Date(code.created_at).toLocaleString()}`);
    console.log(`  Expires: ${new Date(code.expires_at).toLocaleString()}`);
    
    if (code.paystack_reference) {
      console.log(`  Paystack Ref: ${code.paystack_reference}`);
    }
    
    console.log('');
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total Codes: ${codes.length}`);
  console.log(`Beta Codes: ${codes.filter(c => c.is_beta).length}`);
  console.log(`Paid Codes: ${codes.filter(c => !c.is_beta).length}`);
  console.log(`Unused: ${codes.filter(c => c.status === 'unused').length}`);
  console.log(`Used: ${codes.filter(c => c.status === 'used').length}`);
  console.log(`Expired: ${codes.filter(c => c.status === 'expired' || new Date(c.expires_at) < new Date()).length}`);
}

listAccessCodes().catch(console.error);
