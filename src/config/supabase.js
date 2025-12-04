/**
 * Configurazione Supabase Client - DISABILITATO
 * Supabase è stato rimosso, ora usiamo solo Neon Database
 */

// Non creare il client Supabase se le variabili non sono configurate
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.NEBULA_SUPABASE_URL;

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_NEBULA_SUPABASE_ANON_KEY;

// Esporta un client nullo per evitare errori
export const supabase = null;

// Se qualcuno prova a usare Supabase, mostra un warning
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.warn('⚠️ [SUPABASE CONFIG] Supabase è stato disabilitato. Usa Neon Database invece.');
}
