import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get credentials from environment variables with fallback to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hmjclidojxubpvgsiegu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtamNsaWRvanh1YnB2Z3NpZWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjc3MTIsImV4cCI6MjA4NzYwMzcxMn0.a-WXgGXOMwq59ziUTi3ffQw2wZpKBV-8wM05_qwQDZE';

// Only create client if BOTH credentials are provided and valid
let supabaseInstance: SupabaseClient | null = null;

try {
  if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  supabaseInstance = null;
}

export const supabase = supabaseInstance;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!supabase;

