import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

export function initSupabase(url, anonKey) {
  if (!url || !anonKey) {
    throw new Error('Supabase URL and anon key are required');
  }
  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}

export function getSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initSupabase() at app startup.');
  }
  return supabaseClient;
}

export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabase();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  },
);
