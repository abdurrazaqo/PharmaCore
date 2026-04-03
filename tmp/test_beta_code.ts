// Script to test a specific beta code validation
// Run with: npx tsx tmp/test_beta_code.ts <token_or_code>

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBetaCode() {
  const input = process.argv[2];
  
  if (!input) {
    console.error('Usage: npx tsx tmp/test_beta_code.ts <token_or_code>');
    console.error('Example: npx tsx tmp/test_beta_code.ts PHC-ABCD-1234');
    console.error('Or: npx tsx tmp/test_beta_code.ts <full-uuid-token>');
    process.exit(1);
  }

  console.log('\n=== TESTING BETA CODE VALIDATION ===\n');
  console.log(`Input: ${input}`);
  console.log(`Type: ${input.includes('-') && input.length > 20 ? 'Token (UUID)' : 'Code'}\n`);

  // Determine if it's a token or code
  const isToken = input.includes('-') && input.length > 20;
  
  let query = supabase.from('access_codes').select('*');
  
  if (isToken) {
    console.log('Searching by token...');
    query = query.eq('token', input);
  } else {
    console.log('Searching by code...');
    query = query.eq('code', input.toUpperCase());
  }

  const { data: accessCode, error } = await query.single();

  if (error) {
    console.error('❌ Database Error:', error.message);
    console.error('Error Code:', error.code);
    
    if (error.code === 'PGRST116') {
      console.log('\n💡 This means no matching record was found in the database.');
      console.log('   The code/token does not exist or has been deleted.');
    }
    return;
  }

  if (!accessCode) {
    console.error('❌ No access code found');
    return;
  }

  console.log('\n✅ Access Code Found!\n');
  console.log('Details:');
  console.log(`  Code: ${accessCode.code}`);
  console.log(`  Token: ${accessCode.token}`);
  console.log(`  Status: ${accessCode.status}`);
  console.log(`  Is Beta: ${accessCode.is_beta ? 'Yes' : 'No'}`);
  console.log(`  Plan: ${accessCode.plan}`);
  console.log(`  Billing: ${accessCode.billing_cycle}`);
  console.log(`  Email: ${accessCode.buyer_email}`);
  console.log(`  Created: ${new Date(accessCode.created_at).toLocaleString()}`);
  console.log(`  Expires: ${new Date(accessCode.expires_at).toLocaleString()}`);

  // Check validation
  console.log('\n=== VALIDATION CHECKS ===\n');

  if (accessCode.status === 'used') {
    console.log('❌ Status: USED - This code has already been used');
  } else if (accessCode.status === 'expired') {
    console.log('❌ Status: EXPIRED - This code has expired');
  } else {
    console.log('✅ Status: UNUSED - Code is available');
  }

  const now = new Date();
  const expiresAt = new Date(accessCode.expires_at);
  
  if (expiresAt < now) {
    console.log(`❌ Expiry: EXPIRED (${Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24))} days ago)`);
  } else {
    console.log(`✅ Expiry: VALID (expires in ${Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days)`);
  }

  console.log('\n=== ONBOARDING LINK ===\n');
  console.log(`https://pharmacore.365health.online/onboard?token=${accessCode.token}`);
}

testBetaCode().catch(console.error);
