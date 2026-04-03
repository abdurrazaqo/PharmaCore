import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('=== TESTING SUPERADMIN AUTH ===\n');
  
  // Check current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('❌ No active session found');
    console.log('You need to be logged in to test this');
    return;
  }
  
  console.log('✅ Session found');
  console.log('User ID:', session.user.id);
  console.log('Email:', session.user.email);
  
  // Check user role
  const { data: profile } = await supabase
    .from('users')
    .select('role, display_name')
    .eq('id', session.user.id)
    .single();
  
  console.log('\nUser Profile:');
  console.log('Role:', profile?.role);
  console.log('Name:', profile?.display_name);
  
  if (profile?.role !== 'superadmin') {
    console.log('\n❌ User is not a superadmin!');
    console.log('Current role:', profile?.role);
    return;
  }
  
  console.log('\n✅ User is a superadmin');
  
  // Try calling the Edge Function
  console.log('\n=== TESTING EDGE FUNCTION CALL ===');
  
  const { data: requests } = await supabase
    .from('onboarding_requests')
    .select('id')
    .eq('status', 'pending')
    .limit(1);
  
  if (!requests || requests.length === 0) {
    console.log('No pending requests to test with');
    return;
  }
  
  console.log('Testing with request ID:', requests[0].id);
  
  const { data, error } = await supabase.functions.invoke('approve-onboarding', {
    body: { request_id: requests[0].id }
  });
  
  console.log('\nEdge Function Response:');
  console.log('Data:', data);
  console.log('Error:', error);
}

testAuth();
