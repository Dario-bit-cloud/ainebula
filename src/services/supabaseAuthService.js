// Servizio per gestire l'autenticazione con Supabase

import { supabase } from '../config/supabase.js';
import { log, logWarn, logError } from '../utils/logger.js';

/**
 * Registra un nuovo utente con email e password
 */
export async function signUp(email, password, username = null) {
  try {
    log('📝 [SUPABASE AUTH] Inizio registrazione:', { email, hasUsername: !!username });
    
    // Registra l'utente su Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0]
        }
      }
    });

    if (authError) {
      logError('❌ [SUPABASE AUTH] Errore registrazione:', authError);
      return {
        success: false,
        message: authError.message || 'Errore durante la registrazione'
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'Errore durante la registrazione'
      };
    }

    log('✅ [SUPABASE AUTH] Utente registrato su Supabase Auth');

    // Sincronizza l'utente con il database PostgreSQL
    const syncResult = await syncUserToDatabase(authData.user, username);
    
    if (!syncResult.success) {
      logWarn('⚠️ [SUPABASE AUTH] Sincronizzazione database fallita:', syncResult.message);
      // Non bloccare la registrazione se la sincronizzazione fallisce
    }

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username: username || authData.user.user_metadata?.username || email.split('@')[0]
      },
      session: authData.session
    };
  } catch (error) {
    logError('❌ [SUPABASE AUTH] Errore durante registrazione:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Effettua il login con email e password
 */
export async function signIn(email, password) {
  try {
    log('🔐 [SUPABASE AUTH] Inizio login:', { email });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      logError('❌ [SUPABASE AUTH] Errore login:', error);
      return {
        success: false,
        message: error.message || 'Credenziali non valide'
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'Errore durante il login'
      };
    }

    log('✅ [SUPABASE AUTH] Login riuscito');

    // Sincronizza l'utente con il database PostgreSQL
    const syncResult = await syncUserToDatabase(data.user);
    
    if (!syncResult.success) {
      logWarn('⚠️ [SUPABASE AUTH] Sincronizzazione database fallita:', syncResult.message);
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        username: data.user.user_metadata?.username || data.user.email?.split('@')[0]
      },
      session: data.session
    };
  } catch (error) {
    logError('❌ [SUPABASE AUTH] Errore durante login:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Effettua il logout
 */
export async function signOut() {
  try {
    log('🚪 [SUPABASE AUTH] Logout...');
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      logError('❌ [SUPABASE AUTH] Errore logout:', error);
      return {
        success: false,
        message: error.message
      };
    }

    log('✅ [SUPABASE AUTH] Logout completato');
    return { success: true };
  } catch (error) {
    logError('❌ [SUPABASE AUTH] Errore durante logout:', error);
    return {
      success: false,
      message: 'Errore durante il logout',
      error: error.message
    };
  }
}

/**
 * Ottiene l'utente corrente
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return user;
  } catch (error) {
    logError('❌ [SUPABASE AUTH] Errore getCurrentUser:', error);
    return null;
  }
}

/**
 * Ottiene la sessione corrente
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return null;
    }

    return session;
  } catch (error) {
    logError('❌ [SUPABASE AUTH] Errore getSession:', error);
    return null;
  }
}

/**
 * Verifica se l'utente è autenticato
 */
export async function isAuthenticated() {
  try {
    const session = await getSession();
    return !!session;
  } catch (error) {
    logError('❌ [SUPABASE AUTH] Errore isAuthenticated:', error);
    return false;
  }
}


/**
 * Determina l'URL base dell'API
 */
function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Se siamo su localhost, usa localhost:3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/auth';
    }
    
    // In produzione, controlla se c'è una variabile d'ambiente per il backend
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (backendUrl) {
      return `${backendUrl}/api/auth`;
    }
    
    // Altrimenti, per Vercel, usa URL relativo
    return '/api/auth';
  }
  return '/api/auth';
}

/**
 * Ascolta i cambiamenti di autenticazione
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/**
 * Inizializza Supabase Auth e verifica lo stato iniziale
 */
export async function initSupabaseAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      log('✅ [SUPABASE AUTH] Sessione esistente trovata');
    } else {
      log('ℹ️ [SUPABASE AUTH] Nessuna sessione esistente');
    }
    return { success: true, session };
  } catch (error) {
    logError('❌ [SUPABASE AUTH] Errore inizializzazione:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sincronizza l'utente con il database (esportato per uso esterno)
 */
export async function syncUserToDatabase(supabaseUser, username = null) {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const session = await getSession();
    
    if (!session) {
      return {
        success: false,
        message: 'Sessione non disponibile'
      };
    }

    const response = await fetch(`${apiBaseUrl}/supabase-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        userId: supabaseUser.id,
        email: supabaseUser.email,
        username: username || supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: errorText || 'Errore sincronizzazione database'
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logError('❌ [SUPABASE AUTH] Errore syncUserToDatabase:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

