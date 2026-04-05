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

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function cleanupBetaData() {
  console.log('\n🧹 Starting Beta Data Cleanup...\n');

  let deletedTenants = 0;
  let deletedUsers = 0;

  try {
    // Step 1: Get all tenant IDs except demo
    console.log('[1/6] Fetching non-demo tenants...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .neq('id', DEMO_TENANT_ID);

    if (tenantsError) throw tenantsError;
    
    const tenantIds = tenants?.map(t => t.id) || [];
    deletedTenants = tenantIds.length;
    console.log(`   ✓ Found ${tenantIds.length} tenant(s) to remove`);
    if (tenants && tenants.length > 0) {
      tenants.forEach(t => console.log(`     - ${t.name} (${t.id})`));
    }

    // Step 2: Delete all sales for non-demo tenants
    if (tenantIds.length > 0) {
      console.log('\n[2/6] Deleting sales records...');
      const { error: salesError } = await supabase
        .from('sales')
        .delete()
        .in('tenant_id', tenantIds);
      
      if (salesError) throw salesError;
      console.log('   ✓ Sales records deleted');
    } else {
      console.log('\n[2/6] No sales to delete');
    }

    // Step 3: Delete all transactions for non-demo tenants
    if (tenantIds.length > 0) {
      console.log('\n[3/6] Deleting transactions...');
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .in('tenant_id', tenantIds);
      
      if (transactionsError) throw transactionsError;
      console.log('   ✓ Transactions deleted');
    } else {
      console.log('\n[3/6] No transactions to delete');
    }

    // Step 4: Delete all customers for non-demo tenants
    if (tenantIds.length > 0) {
      console.log('\n[4/6] Deleting customers...');
      const { error: customersError } = await supabase
        .from('customers')
        .delete()
        .in('tenant_id', tenantIds);
      
      if (customersError) throw customersError;
      console.log('   ✓ Customers deleted');
    } else {
      console.log('\n[4/6] No customers to delete');
    }

    // Step 5: Delete all products for non-demo tenants
    if (tenantIds.length > 0) {
      console.log('\n[5/6] Deleting products...');
      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .in('tenant_id', tenantIds);
      
      if (productsError) throw productsError;
      console.log('   ✓ Products deleted');
    } else {
      console.log('\n[5/6] No products to delete');
    }

    // Step 6: Delete all users for non-demo tenants
    if (tenantIds.length > 0) {
      console.log('\n[6/6] Deleting users...');
      const { data: users, error: usersSelectError } = await supabase
        .from('users')
        .select('id, display_name')
        .in('tenant_id', tenantIds);

      if (usersSelectError) throw usersSelectError;

      if (users && users.length > 0) {
        deletedUsers = users.length;
        console.log(`   Found ${users.length} user(s) to delete`);
        
        // Delete from auth.users (requires service role key)
        for (const user of users) {
          try {
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);
            if (authDeleteError) {
              console.warn(`   ⚠ Could not delete auth user ${user.display_name}: ${authDeleteError.message}`);
            }
          } catch (err: any) {
            console.warn(`   ⚠ Error deleting auth user: ${err.message}`);
          }
        }

        // Delete from users table
        const { error: usersError } = await supabase
          .from('users')
          .delete()
          .in('tenant_id', tenantIds);
        
        if (usersError) throw usersError;
        console.log('   ✓ Users deleted');
      } else {
        console.log('   No users to delete');
      }
    } else {
      console.log('\n[6/6] No users to delete');
    }

    // Step 7: Delete all onboarding requests (must be before tenants due to FK)
    console.log('\n[7/9] Deleting onboarding requests...');
    try {
      const { error: onboardingError } = await supabase
        .from('onboarding_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (onboardingError) throw onboardingError;
      console.log('   ✓ Onboarding requests deleted');
    } catch (err: any) {
      console.warn(`   ⚠ Onboarding deletion issue: ${err.message}`);
    }

    // Step 8: Delete all tenants except demo
    if (tenantIds.length > 0) {
      console.log('\n[8/9] Deleting tenants...');
      try {
        const { error: tenantsDeleteError } = await supabase
          .from('tenants')
          .delete()
          .neq('id', DEMO_TENANT_ID);
        
        if (tenantsDeleteError) throw tenantsDeleteError;
        console.log('   ✓ Tenants deleted');
      } catch (err: any) {
        console.warn(`   ⚠ Tenant deletion encountered an issue: ${err.message}`);
        console.log('   Continuing with remaining cleanup...');
      }
    } else {
      console.log('\n[8/9] No tenants to delete');
    }

    // Step 9: Delete all access codes
    console.log('\n[9/9] Deleting all access codes...');
    try {
      const { error: accessCodesError } = await supabase
        .from('access_codes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (accessCodesError) throw accessCodesError;
      console.log('   ✓ Access codes deleted');
    } catch (err: any) {
      console.warn(`   ⚠ Access codes deletion issue: ${err.message}`);
    }

    console.log('\n✅ Beta data cleanup completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Removed ${deletedTenants} tenant(s)`);
    console.log(`   - Removed ${deletedUsers} user(s)`);
    console.log(`   - Cleared all access codes`);
    console.log(`   - Cleared all onboarding requests`);
    console.log(`   - Demo tenant preserved: ${DEMO_TENANT_ID}`);
    
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Cleanup failed:', err.message);
    if (err.details) console.error('Details:', err.details);
    if (err.hint) console.error('Hint:', err.hint);
    console.log('\n⚠️  Some data may have been partially cleaned. You may need to run the script again.');
    process.exit(1);
  }
}

cleanupBetaData();
