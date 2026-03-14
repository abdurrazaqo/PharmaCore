
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const { data: customer, error: cError } = await supabase.from('customers').select('*').limit(1);
  if (cError) {
    console.error('Error fetching customer:', cError);
  } else {
    console.log('Customer columns:', Object.keys(customer[0] || {}));
  }

  const { data: history, error: hError } = await supabase.from('balance_history').select('*').limit(1);
  if (hError) {
    console.error('Error fetching history:', hError);
  } else {
    console.log('History columns:', Object.keys(history[0] || {}));
  }
}

checkSchema();
