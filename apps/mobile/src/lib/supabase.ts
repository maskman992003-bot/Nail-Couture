import { initSupabase, supabase } from '@nail-couture/shared/lib/supabase.js';

initSupabase(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
);

export { supabase };
