// Script to delete all non-demo tenants
// Run with: npx tsx tmp/cleanup_non_demo_tenants.ts
// WARNING: This will permanently delete all tenants except the demo tenant!

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

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function cleanupTenants() {
  console.log('\n=== CLEANUP NON-DEMO TENANTS ===\n');

  // Get all non-demo tenants
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .neq('id', DEMO_TENANT_ID);

  if (error) {
    console.error('Error fetching tenants:', error);
    return;
  }

  if (!tenants || tenants.length === 0) {
    console.log('✅ No non-demo tenants found. Database is clean!');
    return;
  }

  console.log(`Found ${tenants.length} non-demo tenant(s) to delete:\n`);

  for (const tenant of tenants) {
    console.log(`  - ${tenant.name} (${tenant.id}) - Status: ${tenant.status}`);
  }

  console.log('\n⚠️  WARNING: This will permanently delete these tenants and all their data!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Starting cleanup...\n');

  for (const tenant of tenants) {
    console.log(`Deleting tenant: ${tenant.name} (${tenant.id})`);

    try {
      // Delete related data first (due to foreign key constraints)
      
      // 1. Delete users
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('tenant_id', tenant.id);
      
      if (usersError) console.error(`  ⚠️  Error deleting users: ${usersError.message}`);
      else console.log('  ✓ Users deleted');

      // 2. Delete products
      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .eq('tenant_id', tenant.id);
      
      if (productsError) console.error(`  ⚠️  Error deleting products: ${productsError.message}`);
      else console.log('  ✓ Products deleted');

      // 3. Delete customers
      const { error: customersError } = await supabase
        .from('customers')
        .delete()
        .eq('tenant_id', tenant.id);
      
      if (customersError) console.error(`  ⚠️  Error deleting customers: ${customersError.message}`);
      else console.log('  ✓ Customers deleted');

      // 4. Delete transactions
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('tenant_id', tenant.id);
      
      if (transactionsError) console.error(`  ⚠️  Error deleting transactions: ${transactionsError.message}`);
      else console.log('  ✓ Transactions deleted');

      // 5. Delete sales_items
      const { error: salesItemsError } = await supabase
        .from('sales_items')
        .delete()
        .eq('tenant_id', tenant.id);
      
      if (salesItemsError) console.error(`  ⚠️  Error deleting sales_items: ${salesItemsError.message}`);
      else console.log('  ✓ Sales items deleted');

      // 6. Delete audit_logs
      const { error: auditError } = await supabase
        .from('audit_logs')
        .delete()
        .eq('tenant_id', tenant.id);
      
      if (auditError) console.error(`  ⚠️  Error deleting audit_logs: ${auditError.message}`);
      else console.log('  ✓ Audit logs deleted');

      // 7. Delete branches
      const { error: branchesError } = await supabase
        .from('branches')
        .delete()
        .eq('tenant_id', tenant.id);
      
      if (branchesError) console.error(`  ⚠️  Error deleting branches: ${branchesError.message}`);
      else console.log('  ✓ Branches deleted');

      // 8. Finally, delete the tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenant.id);
      
      if (tenantError) {
        console.error(`  ❌ Error deleting tenant: ${tenantError.message}`);
      } else {
        console.log(`  ✅ Tenant deleted successfully\n`);
      }

    } catch (err: any) {
      console.error(`  ❌ Unexpected error: ${err.message}\n`);
    }
  }

  console.log('\n=== CLEANUP COMPLETE ===');
  console.log('Verifying demo tenant is still intact...\n');

  const { data: demoTenant, error: demoError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', DEMO_TENANT_ID)
    .single();

  if (demoError || !demoTenant) {
    console.error('❌ ERROR: Demo tenant not found! Something went wrong!');
  } else {
    console.log(`✅ Demo tenant "${demoTenant.name}" is safe and intact!`);
  }
}

cleanupTenants().catch(console.error);
