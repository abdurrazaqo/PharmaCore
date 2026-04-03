import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { generateSeedData, DEMO_TENANT_ID } from '../supabase/functions/_shared/demoSeedData';

// Load .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
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

async function runSeed() {
  console.log('[SEED] Building Demo Data payload...');
  const { products, customers, transactions, salesItems } = generateSeedData();

  console.log(`[SEED] Generated ${products.length} products, ${customers.length} customers, ${transactions.length} transactions.`);

  try {
    console.log('[SEED] Wiping old operational demo data...');
    console.log('[SEED] Deleting sales...');
    const { error: salesDeleteError } = await supabase.from('sales').delete().eq('tenant_id', DEMO_TENANT_ID);
    if (salesDeleteError) throw salesDeleteError;
    
    console.log('[SEED] Deleting transactions...');
    const { error: txDeleteError } = await supabase.from('transactions').delete().eq('tenant_id', DEMO_TENANT_ID);
    if (txDeleteError) throw txDeleteError;
    
    console.log('[SEED] Deleting customers...');
    const { error: custDeleteError } = await supabase.from('customers').delete().eq('tenant_id', DEMO_TENANT_ID);
    if (custDeleteError) throw custDeleteError;
    
    console.log('[SEED] Deleting products...');
    const { error: prodDeleteError } = await supabase.from('products').delete().eq('tenant_id', DEMO_TENANT_ID);
    if (prodDeleteError) throw prodDeleteError;

    console.log('[SEED] Hard deletions successful. Inserting fresh records...');

    // 1. Insert Products in batches
    console.log('[SEED] Inserting products...');
    const batchSize = 10;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const { error: pErr } = await supabase.from('products').insert(batch);
      if (pErr) throw pErr;
      console.log(`  ✓ Inserted products ${i + 1}-${Math.min(i + batchSize, products.length)}`);
    }
    console.log('✅ Products seeded');

    // 2. Insert Customers
    console.log('[SEED] Inserting customers...');
    const { error: cErr } = await supabase.from('customers').insert(customers);
    if (cErr) throw cErr;
    console.log('✅ Customers seeded');

    // 3. Transactions (batch in 20s)
    console.log('[SEED] Inserting transactions...');
    for (let i = 0; i < transactions.length; i += 20) {
      const batch = transactions.slice(i, i + 20);
      const { error: txErr } = await supabase.from('transactions').insert(batch);
      if (txErr) throw txErr;
      console.log(`  ✓ Inserted transactions ${i + 1}-${Math.min(i + 20, transactions.length)}`);
    }
    console.log('✅ Transactions seeded');

    // 4. Sales Items (in chunks of 50)
    console.log('[SEED] Inserting sales items...');
    for (let i = 0; i < salesItems.length; i += 50) {
      const batch = salesItems.slice(i, i + 50);
      const { error: sErr } = await supabase.from('sales').insert(batch);
      if (sErr) throw sErr;
      console.log(`  ✓ Inserted sales ${i + 1}-${Math.min(i + 50, salesItems.length)}`);
    }
    console.log('✅ Sales seeded');

    console.log('\n[SUCCESS] Successfully recreated PharmaCore demo environment!');
    console.log(`  - ${products.length} products`);
    console.log(`  - ${customers.length} customers`);
    console.log(`  - ${transactions.length} transactions`);
    console.log(`  - ${salesItems.length} sales items`);
    process.exit(0);
  } catch (err: any) {
    console.error('\n[ERROR] Seed failed:', err.message);
    if (err.details) console.error('Details:', err.details);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  }
}

runSeed();
