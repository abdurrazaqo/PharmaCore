import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: (...args) => {
      return fetch(...args);
    },
  },
});

async function clearUnusedAccessCodes() {
  console.log('\n🧹 Clearing Unused Access Codes...\n');

  try {
    // Fetch all unused access codes
    console.log('[1/2] Fetching unused access codes...');
    const { data: codes, error: fetchError } = await supabase
      .from('access_codes')
      .select('id, code, buyer_email, status, created_at')
      .eq('status', 'unused');

    if (fetchError) throw fetchError;

    if (!codes || codes.length === 0) {
      console.log('   ℹ️  No unused access codes found');
      process.exit(0);
    }

    console.log(`   ✓ Found ${codes.length} unused access code(s):`);
    codes.forEach(c => {
      console.log(`     - ${c.code} (${c.buyer_email}) - Created: ${new Date(c.created_at).toLocaleDateString()}`);
    });

    // Delete all unused access codes
    console.log('\n[2/2] Deleting unused access codes...');
    const { error: deleteError } = await supabase
      .from('access_codes')
      .delete()
      .eq('status', 'unused');

    if (deleteError) throw deleteError;

    console.log('   ✓ Unused access codes deleted');

    console.log('\n✅ Cleanup completed!');
    console.log(`\n📊 Summary: Removed ${codes.length} unused access code(s)`);
    
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Cleanup failed:', err.message);
    if (err.details) console.error('Details:', err.details);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  }
}

clearUnusedAccessCodes();
