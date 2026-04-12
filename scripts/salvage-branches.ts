
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing since dotenv might be finicky in this context
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');

if (!url || !key) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function salvage() {
  console.log('--- 🛡️ Starting Branch Salvage & Data Merge ---');

  // 1. Find all tenants
  const { data: tenants, error: tError } = await supabase.from('tenants').select('id, name');
  if (tError) throw tError;

  for (const tenant of tenants) {
    console.log(`\nChecking Tenant: ${tenant.name} (${tenant.id})`);

    // 2. Find branches
    const { data: branches, error: bError } = await supabase
      .from('branches')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true });

    if (bError) {
      console.error(`  Error fetching branches: ${bError.message}`);
      continue;
    }

    if (branches.length === 0) {
      console.log('  ⚠️ No branches found for this tenant.');
      continue;
    }

    const mainBranch = branches[0];
    const otherBranches = branches.slice(1);
    const branchIds = branches.map(b => b.id);

    console.log(`  Main Branch: ${mainBranch.name} (${mainBranch.id})`);

    // 3. Move products with NULL branch_id to mainBranch
    const { error: pError } = await supabase
      .from('products')
      .update({ branch_id: mainBranch.id })
      .eq('tenant_id', tenant.id)
      .is('branch_id', null);
    
    if (pError) console.error(`  Error updating orphaned products: ${pError.message}`);
    else console.log(`  ✅ Orphaned products moved to ${mainBranch.name}`);

    // 4. Move transactions with NULL branch_id to mainBranch
    const { error: trError } = await supabase
      .from('transactions')
      .update({ branch_id: mainBranch.id })
      .eq('tenant_id', tenant.id)
      .is('branch_id', null);
    
    if (trError) console.error(`  Error updating orphaned transactions: ${trError.message}`);
    else console.log(`  ✅ Orphaned transactions moved to ${mainBranch.name}`);

    // 5. Merge Duplicate Branches (Automatically as requested)
    if (otherBranches.length > 0) {
      console.log(`  Detected ${otherBranches.length} duplicate branches. Merging...`);
      
      for (const branch of otherBranches) {
        console.log(`    Merging ${branch.name} (${branch.id})...`);
        
        // Move products
        await supabase.from('products').update({ branch_id: mainBranch.id }).eq('branch_id', branch.id);
        // Move transactions
        await supabase.from('transactions').update({ branch_id: mainBranch.id }).eq('branch_id', branch.id);
        // Move users
        await supabase.from('users').update({ branch_id: mainBranch.id }).eq('branch_id', branch.id);
        
        // Delete the redundant branch
        const { error: delError } = await supabase.from('branches').delete().eq('id', branch.id);
        if (delError) console.error(`    ❌ Failed to delete branch ${branch.id}: ${delError.message}`);
        else console.log(`    ✅ Branch ${branch.name} deleted.`);
      }
    }
  }

  console.log('\n--- ✨ Salvage Operation Complete ---');
}

salvage().catch(err => {
  console.error('💥 Fatal error during salvage:', err);
  process.exit(1);
});
