import { initSupabase, supabase } from '@nail-couture/shared/lib/supabase.js';

initSupabase(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export { supabase };
