import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Hardcoded credentials for now - will fix env variables later
const supabaseUrl = 'https://hmjclidojxubpvgsiegu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamNsaWRvanh1YnB2Z3NpZWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjc3MTIsImV4cCI6MjA4NzYwMzcxMn0.a-WXgGXOMwq59ziUTi3ffQw2wZpKBV-8wM05_qwQDZE';

console.log('🔍 Supabase configuration (hardcoded):');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);

// Only create client if BOTH credentials are provided and valid
let supabaseInstance: SupabaseClient | null = null;

try {
  if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized successfully');
  } else {
    console.error('❌ Supabase configuration missing or invalid');
    console.log('Please check .env.local file has:');
    console.log('VITE_SUPABASE_URL=https://your-project.supabase.co');
    console.log('VITE_SUPABASE_ANON_KEY=your-key-here');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error);
  supabaseInstance = null;
}

export const supabase = supabaseInstance;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!supabase;

