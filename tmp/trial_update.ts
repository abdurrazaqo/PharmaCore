
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function trialUpdate() {
  const { data: first } = await supabase.from('customers').select('id').limit(1);
  if (!first || first.length === 0) return;
  
  const { error } = await supabase.from('customers').update({ last_addition_total: 0 }).eq('id', first[0].id);
  if (error) {
    console.log('Error adding column:', error.message);
  } else {
    console.log('Successfully added/updated last_addition_total column');
  }
}
trialUpdate();
