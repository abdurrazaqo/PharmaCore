import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseAnonKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('transactions').select('*').limit(1);
  if (error) {
     console.log('Error transactions:', error.message);
  } else {
     console.log('Transactions Columns:', data?.[0] ? Object.keys(data[0]) : 'No rows');
  }
  
  const { data: salesData, error: salesError } = await supabase.from('sales').select('*').limit(1);
  if (salesError) {
     console.log('Error sales:', salesError.message);
  } else {
     console.log('Sales Columns:', salesData?.[0] ? Object.keys(salesData[0]) : 'No rows');
  }
  process.exit(0);
}
check();
