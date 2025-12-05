/**
 * Configurazione Supabase Client per uso lato server
 * Usa Service Role Key per operazioni amministrative
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Leggi le variabili d'ambiente
const supabaseUrl = process.env.NEBULA_SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseServiceRoleKey = process.env.NEBULA_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_NEBULA_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ [SUPABASE] SUPABASE_URL non configurata');
}

if (!supabaseServiceRoleKey && !supabaseAnonKey) {
  console.error('❌ [SUPABASE] Service Role Key o Anon Key non configurata');
}

// Crea il client Supabase con Service Role Key (per operazioni server-side)
// Usa Service Role Key se disponibile, altrimenti Anon Key
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Helper per eseguire query SQL raw (usando RPC o query dirette)
export async function executeSQL(query, params = []) {
  try {
    // Supabase non supporta query SQL raw direttamente
    // Dobbiamo usare RPC functions o la sintassi Supabase
    // Per query complesse, possiamo usare .rpc() con funzioni PostgreSQL
    console.warn('⚠️ [SUPABASE] executeSQL non supportato direttamente. Usa la sintassi Supabase.');
    return null;
  } catch (error) {
    console.error('❌ [SUPABASE] Errore esecuzione SQL:', error);
    throw error;
  }
}

// Debug
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 [SUPABASE] Client server configurato:', supabaseUrl ? '✅' : '❌');
  console.log('🔧 [SUPABASE] Usando:', supabaseServiceRoleKey ? 'Service Role Key' : 'Anon Key');
}






