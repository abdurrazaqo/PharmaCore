// Script to check all tenants in the database
// Run with: npx tsx tmp/check_tenants.ts

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

async function checkTenants() {
  console.log('\n=== CHECKING ALL TENANTS ===\n');

  // Get all tenants
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tenants:', error);
    return;
  }

  if (!tenants || tenants.length === 0) {
    console.log('No tenants found in database.');
    return;
  }

  console.log(`Found ${tenants.length} tenant(s):\n`);

  for (const tenant of tenants) {
    const isDemo = tenant.id === '00000000-0000-0000-0000-000000000001';
    
    console.log(`${isDemo ? '🔬 DEMO TENANT' : '📦 TENANT'}`);
    console.log(`  ID: ${tenant.id}`);
    console.log(`  Name: ${tenant.name}`);
    console.log(`  Status: ${tenant.status}`);
    console.log(`  Plan: ${tenant.plan}`);
    console.log(`  Created: ${new Date(tenant.created_at).toLocaleString()}`);
    console.log(`  Trial Ends: ${tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleString() : 'N/A'}`);
    console.log(`  Subscription Expires: ${tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at).toLocaleString() : 'N/A'}`);
    
    // Count users
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id);
    
    console.log(`  Users: ${userCount || 0}`);
    
    // Count branches
    const { count: branchCount } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id);
    
    console.log(`  Branches: ${branchCount || 0}`);
    
    console.log('');
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total Tenants: ${tenants.length}`);
  console.log(`Active: ${tenants.filter(t => t.status === 'active').length}`);
  console.log(`Trial: ${tenants.filter(t => t.status === 'trial' || (t.trial_ends_at && new Date(t.trial_ends_at) > new Date())).length}`);
  console.log(`Suspended: ${tenants.filter(t => t.status === 'suspended').length}`);
  console.log(`Deleted: ${tenants.filter(t => t.status === 'deleted').length}`);
  
  const demoTenant = tenants.find(t => t.id === '00000000-0000-0000-0000-000000000001');
  if (demoTenant) {
    console.log(`\n✅ Demo tenant exists (status: ${demoTenant.status})`);
  } else {
    console.log('\n⚠️  Demo tenant NOT found!');
  }
}

checkTenants().catch(console.error);
