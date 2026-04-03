// Comprehensive beta code diagnostic
// Run with: npx tsx tmp/diagnose_beta_issue.ts

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

async function diagnose() {
  console.log('\n=== BETA CODE DIAGNOSTIC ===\n');

  // 1. Check all beta codes
  const { data: betaCodes, error } = await supabase
    .from('access_codes')
    .select('*')
    .eq('is_beta', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching beta codes:', error);
    return;
  }

  if (!betaCodes || betaCodes.length === 0) {
    console.log('⚠️  No beta codes found in database');
    console.log('   Generate a new one from the superadmin dashboard\n');
    return;
  }

  console.log(`Found ${betaCodes.length} beta code(s):\n`);

  for (const code of betaCodes) {
    const isExpired = new Date(code.expires_at) < new Date();
    const age = Math.floor((Date.now() - new Date(code.created_at).getTime()) / (1000 * 60));
    
    console.log(`${code.status === 'unused' ? '🟢' : code.status === 'used' ? '🔵' : '🔴'} Code: ${code.code}`);
    console.log(`   Status: ${code.status}${isExpired ? ' (EXPIRED)' : ''}`);
    console.log(`   Format: ${code.code.startsWith('PHC-') ? '✅ Correct (PHC-XXXX-XXXX)' : '❌ Old format'}`);
    console.log(`   Created: ${age} minutes ago`);
    console.log(`   Link: https://pharmacore.365health.online/onboard?token=${code.token}`);
    console.log('');
  }

  // 2. Check the most recent unused beta code
  const recentUnused = betaCodes.find(c => c.status === 'unused' && new Date(c.expires_at) > new Date());
  
  if (!recentUnused) {
    console.log('⚠️  No valid unused beta codes found');
    console.log('   All codes are either used or expired');
    console.log('   Generate a new one from the superadmin dashboard\n');
    return;
  }

  console.log('=== TESTING MOST RECENT UNUSED CODE ===\n');
  console.log(`Testing: ${recentUnused.code}`);
  console.log(`Token: ${recentUnused.token}\n`);

  // 3. Test validation logic (simulate what the Edge Function does)
  console.log('Validation checks:');
  
  if (recentUnused.status === 'used') {
    console.log('❌ Status check: FAILED (already used)');
  } else if (recentUnused.status === 'expired') {
    console.log('❌ Status check: FAILED (expired)');
  } else {
    console.log('✅ Status check: PASSED (unused)');
  }

  const now = new Date();
  const expiresAt = new Date(recentUnused.expires_at);
  
  if (expiresAt < now) {
    console.log('❌ Expiry check: FAILED (expired)');
  } else {
    const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`✅ Expiry check: PASSED (${daysLeft} days remaining)`);
  }

  console.log('\n=== RECOMMENDATION ===\n');
  
  if (recentUnused.code.startsWith('PHC-')) {
    console.log('✅ Your most recent beta code has the correct format');
    console.log('   Use this link:');
    console.log(`   https://pharmacore.365health.online/onboard?token=${recentUnused.token}`);
    console.log('\n   If it still shows "invalid", the issue is likely:');
    console.log('   1. Edge Function not deployed (run: supabase functions deploy validate-access-token)');
    console.log('   2. Browser cache (try incognito mode)');
    console.log('   3. Wrong environment (check you\'re using the right Supabase project)');
  } else {
    console.log('❌ Your most recent beta code has the OLD format');
    console.log('   Delete it and generate a new one:');
    console.log('   1. Run: npx tsx tmp/delete_unused_beta_codes.ts');
    console.log('   2. Generate new beta link from superadmin dashboard');
    console.log('   3. The new code should have format: PHC-XXXX-XXXX');
  }
}

diagnose().catch(console.error);
