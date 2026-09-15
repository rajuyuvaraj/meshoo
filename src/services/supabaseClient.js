import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  localStorage.getItem('vns_supabase_url') ||
  'https://hindfirnbdxsmrluswje.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  localStorage.getItem('vns_supabase_key') ||
  'sb_publishable_jBKZjAa3tm5Wxo9SQiMfOA_MRBPrk4S';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export function updateSupabaseConfig(url, key) {
  if (url && key) {
    localStorage.setItem('vns_supabase_url', url);
    localStorage.setItem('vns_supabase_key', key);
  } else {
    localStorage.removeItem('vns_supabase_url');
    localStorage.removeItem('vns_supabase_key');
  }
  window.location.reload();
}
