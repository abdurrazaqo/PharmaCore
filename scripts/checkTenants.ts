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

async function checkTenants() {
  console.log('\n🔍 Checking Tenants Table...\n');

  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, status, trial_ends_at, subscription_expires_at, is_gifted')
      .neq('status', 'deleted');

    if (error) throw error;

    console.log(`Found ${tenants?.length || 0} tenant(s):\n`);

    const now = new Date();
    
    tenants?.forEach(t => {
      const isDemo = t.id === DEMO_TENANT_ID;
      const trialEndsAt = t.trial_ends_at ? new Date(t.trial_ends_at) : null;
      const subscriptionExpiresAt = t.subscription_expires_at ? new Date(t.subscription_expires_at) : null;
      
      const inTrial = trialEndsAt && trialEndsAt > now && (!subscriptionExpiresAt || subscriptionExpiresAt <= now);
      
      console.log(`📋 ${t.name}`);
      console.log(`   ID: ${t.id}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   Is Demo: ${isDemo ? 'YES' : 'NO'}`);
      console.log(`   Is Gifted: ${t.is_gifted ? 'YES' : 'NO'}`);
      console.log(`   Trial Ends: ${trialEndsAt ? trialEndsAt.toISOString() : 'N/A'}`);
      console.log(`   Subscription Expires: ${subscriptionExpiresAt ? subscriptionExpiresAt.toISOString() : 'N/A'}`);
      console.log(`   In Trial: ${inTrial ? 'YES ⚠️' : 'NO'}`);
      console.log('');
    });

    const inTrialCount = tenants?.filter(t => {
      if (t.id === DEMO_TENANT_ID) return false;
      const trialEndsAt = t.trial_ends_at ? new Date(t.trial_ends_at) : null;
      const subscriptionExpiresAt = t.subscription_expires_at ? new Date(t.subscription_expires_at) : null;
      return trialEndsAt && trialEndsAt > now && (!subscriptionExpiresAt || subscriptionExpiresAt <= now);
    }).length || 0;

    console.log(`\n📊 Summary:`);
    console.log(`   Total Tenants (excluding deleted): ${tenants?.length || 0}`);
    console.log(`   Demo Tenant: ${tenants?.find(t => t.id === DEMO_TENANT_ID) ? '1' : '0'}`);
    console.log(`   In Trial (excluding demo): ${inTrialCount}`);
    
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Check failed:', err.message);
    if (err.details) console.error('Details:', err.details);
    process.exit(1);
  }
}

checkTenants();
