
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

async function checkRLS() {
  const { data, error } = await supabase.rpc('pg_get_table_policies', { table_name: 'branches' });
  if (error) {
    console.log('RPC failed, trying raw query on pg_policies');
    const { data: policies, error: polError } = await supabase.from('pg_policies').select('*').eq('tablename', 'branches');
    if (polError) {
      // If we can't query pg_policies directly (permissions), we'll try a dummy update and check error
      console.log('Could not query pg_policies. Trying a dummy update...');
      const { error: updError } = await supabase.from('branches').update({ name: 'Test' }).eq('id', 'non-existent-id');
      console.log('Update test error:', updError ? updError.message : 'No error');
    } else {
      console.log('Policies:', policies);
    }
  } else {
    console.log('Policies:', data);
  }
}

checkRLS();
