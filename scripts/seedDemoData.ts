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

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  console.log('[SEED] Building Demo Data payload...');
  const { products, customers, transactions, salesItems } = generateSeedData();

  console.log(`[SEED] Generated ${products.length} products, ${customers.length} customers, ${transactions.length} transactions.`);

  try {
    console.log('[SEED] Wiping old operational demo data...');
    // Wipe order matters due to foreign keys: sales -> transactions -> customers/products
    await supabase.from('sales').delete().eq('tenant_id', DEMO_TENANT_ID);
    await supabase.from('transactions').delete().eq('tenant_id', DEMO_TENANT_ID);
    await supabase.from('customers').delete().eq('tenant_id', DEMO_TENANT_ID);
    await supabase.from('products').delete().eq('tenant_id', DEMO_TENANT_ID);

    console.log('[SEED] Hard deletions successful. Inserting fresh records...');

    // 1. Insert Products
    const { error: pErr } = await supabase.from('products').insert(products);
    if (pErr) throw pErr;
    console.log('✅ Products seeded');

    // 2. Insert Customers
    const { error: cErr } = await supabase.from('customers').insert(customers);
    if (cErr) throw cErr;
    console.log('✅ Customers seeded');

    // 3. Transactions (batch in 100s safely)
    const { error: txErr } = await supabase.from('transactions').insert(transactions);
    if (txErr) throw txErr;
    console.log('✅ Transactions seeded');

    // 4. Sales Items (in chunks if large, but there are ~250 items, should be fine)
    const { error: sErr } = await supabase.from('sales').insert(salesItems);
    if (sErr) throw sErr;
    console.log('✅ Sales seeded');

    console.log('[SUCCESS] Successfully recreated PharmaCore demo environment!');
    process.exit(0);
  } catch (err) {
    console.error('[ERROR]', err);
    process.exit(1);
  }
}

runSeed();
