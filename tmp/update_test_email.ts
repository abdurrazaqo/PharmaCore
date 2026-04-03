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

async function updateEmail() {
  const { error } = await supabase
    .from('onboarding_requests')
    .update({ pharmacy_email: 'odeleye100@gmail.com' })
    .eq('pharmacy_email', 'test-pharmacy@example.com');
  
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('✅ Email updated to odeleye100@gmail.com');
  }
}

updateEmail();
