import { writable } from 'svelte/store';
import { syncChatsOnLogin, clearChatsOnLogout } from './chat.js';
import { syncProjectsOnLogin, clearProjectsOnLogout } from './projects.js';

// Store per lo stato di autenticazione
export const user = writable(null);
export const isAuthenticatedStore = writable(false);
export const isLoading = writable(true);

// Inizializza l'autenticazione all'avvio dell'app
export async function initAuth() {
  try {
    console.log('🔐 [AUTH STORE] Inizializzazione autenticazione...');
    
    // Prova prima con Neon Auth (verifySession che usa /api/auth/me)
    try {
      const { verifySession } = await import('../services/authService.js');
      const result = await verifySession();
      
      // Verifica che il risultato sia valido e contenga un utente con ID
      if (result && result.success && result.user && result.user.id) {
        console.log('✅ [AUTH STORE] Sessione Neon trovata');
        await setUser(result.user);
        isLoading.set(false);
        return;
      } else {
        // Se il risultato non è valido, pulisci lo stato
        console.log('ℹ️ [AUTH STORE] Sessione Neon non valida, pulizia stato');
        clearUser();
      }
    } catch (neonError) {
      console.log('ℹ️ [AUTH STORE] Nessuna sessione Neon trovata:', neonError.message);
      // In caso di errore, assicurati di pulire lo stato
      clearUser();
    }
    
    // Fallback a Supabase Auth (se configurato)
    try {
      const { getCurrentUser, getSession, syncUserToDatabase } = await import('../services/supabaseAuthService.js');
      const supabaseUser = await getCurrentUser();
      const session = await getSession();
      
      if (supabaseUser && session) {
        console.log('✅ [AUTH STORE] Sessione Supabase trovata');
        
        // Sincronizza l'utente con il database
        const syncResult = await syncUserToDatabase(supabaseUser);
        
        if (syncResult.success && syncResult.token) {
          localStorage.setItem('auth_token', syncResult.token);
        }
        
        // Aggiorna lo stato utente
        const formattedUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0]
        };
        
        await setUser(formattedUser);
        isLoading.set(false);
        return;
      }
    } catch (supabaseError) {
      console.log('ℹ️ [AUTH STORE] Supabase non disponibile:', supabaseError.message);
    }
    
    // Nessuna sessione trovata
    console.log('ℹ️ [AUTH STORE] Nessuna sessione trovata, utente non autenticato');
    clearUser();
    isLoading.set(false);
  } catch (error) {
    console.error('❌ [AUTH STORE] Errore durante inizializzazione:', error);
    clearUser();
    isLoading.set(false);
  }
}

// Aggiorna lo store dopo login/registrazione
export async function setUser(userData) {
  console.log('🔐 [AUTH STORE] setUser chiamato con:', userData);
  
  if (!userData) {
    console.error('❌ [AUTH STORE] Dati utente non forniti');
    return;
  }
  
  try {
    user.set(userData);
    isAuthenticatedStore.set(true);
    
    // Sincronizza l'account con il sistema di account multipli
    try {
      const { syncCurrentAccountWithAuth } = await import('./accounts.js');
      syncCurrentAccountWithAuth();
    } catch (error) {
      console.warn('⚠️ [AUTH STORE] Impossibile sincronizzare account:', error.message);
    }
    
    // Attendi un breve momento per assicurarsi che lo store sia aggiornato
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Sincronizza le chat e i progetti dal database
    console.log('🔄 [AUTH STORE] Sincronizzazione chat e progetti...');
    try {
      await Promise.all([
        syncChatsOnLogin(),
        syncProjectsOnLogin()
      ]);
      console.log('✅ [AUTH STORE] Sincronizzazione completata');
    } catch (error) {
      console.warn('⚠️ [AUTH STORE] Errore durante sincronizzazione chat/progetti:', error.message);
      // Non bloccare il login se la sincronizzazione fallisce
    }
  } catch (error) {
    console.error('❌ [AUTH STORE] Errore durante setUser:', error);
    // In caso di errore, usa i dati forniti comunque
    user.set(userData);
    isAuthenticatedStore.set(true);
  }
}

// Pulisci lo store dopo logout
export function clearUser() {
  console.log('🧹 [AUTH STORE] Pulizia stato utente...');
  user.set(null);
  isAuthenticatedStore.set(false);
  
  // Rimuovi tutti i dati utente dal localStorage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('nebula-ai-user');
  
  // Pulisci anche eventuali dati residui
  localStorage.removeItem('saved_email');
  localStorage.removeItem('saved_password');
  localStorage.removeItem('remember_credentials');
  
  // NON rimuovere gli account salvati - l'utente potrebbe volerli mantenere
  // Solo rimuovi l'account corrente se non c'è autenticazione
  import('./accounts.js').then(({ currentAccountId }) => {
    currentAccountId.set(null);
  }).catch(error => {
    console.log('ℹ️ [AUTH STORE] Impossibile pulire account corrente:', error.message);
  });
  
  // Pulisci le chat e i progetti salvati sull'account
  clearChatsOnLogout();
  clearProjectsOnLogout();
  
  console.log('✅ [AUTH STORE] Stato utente pulito');
}

