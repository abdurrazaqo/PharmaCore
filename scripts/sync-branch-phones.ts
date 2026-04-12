
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(url!, key!);

async function sync() {
  console.log('--- 🔄 Syncing Tenant Phone Numbers to Branches ---');
  
  // 1. Get all tenants with phone numbers
  const { data: tenants, error: tError } = await supabase
    .from('tenants')
    .select('id, pharmacy_phone, pharmacy_address')
    .not('pharmacy_phone', 'is', null);
    
  if (tError) {
    console.error('Error fetching tenants:', tError);
    return;
  }

  for (const tenant of tenants) {
    console.log(`Processing Tenant: ${tenant.id}`);
    
    // 2. Get the primary branch for this tenant
    const { data: branches, error: bError } = await supabase
      .from('branches')
      .select('id, phone, location')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true })
      .limit(1);
      
    if (bError) {
      console.error(`  Error fetching branch for ${tenant.id}:`, bError);
      continue;
    }
    
    if (branches && branches.length > 0) {
      const branch = branches[0];
      
      // 3. Update branch phone if it's currently null
      if (!branch.phone) {
        console.log(`  Updating branch ${branch.id} with phone ${tenant.pharmacy_phone}`);
        const { error: uError } = await supabase
          .from('branches')
          .update({ 
            phone: tenant.pharmacy_phone,
            location: branch.location || tenant.pharmacy_address
          })
          .eq('id', branch.id);
          
        if (uError) console.error(`    ❌ Failed to update branch:`, uError);
        else console.log(`    ✅ Updated successfully.`);
      } else {
        console.log(`  Branch already has phone: ${branch.phone}`);
      }
    } else {
      console.log(`  ⚠️ No branch found for tenant.`);
    }
  }
  
  console.log('\n--- ✨ Sync Complete ---');
}

sync().catch(err => {
  console.error('💥 Fatal error during sync:', err);
  process.exit(1);
});
