/**
 * Configurazione Supabase Client
 * Per uso lato client (browser)
 */

import { createClient } from '@supabase/supabase-js';

// Leggi le variabili d'ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.NEBULA_SUPABASE_URL;

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_NEBULA_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ [SUPABASE CONFIG] URL o Anon Key non configurati');
}

// Crea il client Supabase per uso lato client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Debug in sviluppo
if (import.meta.env.DEV) {
  console.log('🔧 [SUPABASE CONFIG] Client configurato:', supabaseUrl ? '✅' : '❌');
}



