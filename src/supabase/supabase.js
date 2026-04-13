import { createClient } from '@supabase/supabase-js';

// Project ID will be auto-injected during deployment
const SUPABASE_URL = 'https://udkathvkohktkrswxote.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVka2F0aHZrb2hrdGtyc3d4b3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTU0ODcsImV4cCI6MjA4MzU5MTQ4N30.0PeeTdlcxVwoueZpnLZ4VnieFTVs9EukzD_zJaC3c90';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase variables are missing! Check your configuration.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

export default supabase;