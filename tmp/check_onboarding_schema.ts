import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('=== CHECKING ONBOARDING_REQUESTS SCHEMA ===\n');
  
  // Check the foreign key constraint
  const { data: constraints, error: constraintError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'onboarding_requests'
          AND kcu.column_name = 'access_code';
      `
    });

  if (constraintError) {
    console.log('Error checking constraints:', constraintError);
  } else {
    console.log('Foreign Key Constraint:', constraints);
  }

  // Check access_codes table structure
  const { data: accessCodes, error: accessError } = await supabase
    .from('access_codes')
    .select('*')
    .limit(1);

  if (accessError) {
    console.log('\nError querying access_codes:', accessError);
  } else {
    console.log('\nSample access_code record:');
    console.log(accessCodes?.[0]);
  }

  // Check what column is the primary key in access_codes
  console.log('\n=== CHECKING ACCESS_CODES PRIMARY KEY ===');
  const { data: pkData } = await supabase
    .from('access_codes')
    .select('id, token, code')
    .limit(1);
  
  console.log('Access codes columns:', pkData?.[0]);
}

checkSchema();
