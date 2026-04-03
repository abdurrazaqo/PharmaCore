// Script to delete unused beta access codes
// Run with: npx tsx tmp/delete_unused_beta_codes.ts

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

async function deleteUnusedBetaCodes() {
  console.log('\n=== DELETE UNUSED BETA ACCESS CODES ===\n');

  // Get all unused beta codes
  const { data: betaCodes, error } = await supabase
    .from('access_codes')
    .select('*')
    .eq('is_beta', true)
    .eq('status', 'unused')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching beta codes:', error);
    return;
  }

  if (!betaCodes || betaCodes.length === 0) {
    console.log('✅ No unused beta codes found. Database is clean!');
    return;
  }

  console.log(`Found ${betaCodes.length} unused beta code(s):\n`);

  for (const code of betaCodes) {
    console.log(`  - Code: ${code.code}`);
    console.log(`    Token: ${code.token.substring(0, 8)}...`);
    console.log(`    Created: ${new Date(code.created_at).toLocaleString()}`);
    console.log(`    Expires: ${new Date(code.expires_at).toLocaleString()}`);
    console.log('');
  }

  console.log('⚠️  WARNING: This will permanently delete these beta codes!');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Deleting unused beta codes...\n');

  for (const code of betaCodes) {
    try {
      const { error: deleteError } = await supabase
        .from('access_codes')
        .delete()
        .eq('id', code.id);

      if (deleteError) {
        console.error(`  ❌ Error deleting ${code.code}: ${deleteError.message}`);
      } else {
        console.log(`  ✅ Deleted ${code.code}`);
      }
    } catch (err: any) {
      console.error(`  ❌ Unexpected error deleting ${code.code}: ${err.message}`);
    }
  }

  console.log('\n=== CLEANUP COMPLETE ===');
  
  // Verify deletion
  const { count } = await supabase
    .from('access_codes')
    .select('*', { count: 'exact', head: true })
    .eq('is_beta', true)
    .eq('status', 'unused');

  console.log(`\nRemaining unused beta codes: ${count || 0}`);
}

deleteUnusedBetaCodes().catch(console.error);
