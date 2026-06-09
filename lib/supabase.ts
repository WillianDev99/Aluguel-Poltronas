import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jqkujyqinviwpkbdabya.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9jlSxG1qTi_ojq4yW21CaQ_UmAAlROd";

// Instância única para todo o projeto
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'posleve-auth-token' // Chave única para evitar conflitos com outros apps Supabase
  }
});