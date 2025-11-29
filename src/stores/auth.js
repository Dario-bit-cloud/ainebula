import { writable } from 'svelte/store';
import { getCurrentUser, isAuthenticated, verifySession } from '../services/authService.js';
import { syncChatsOnLogin, clearChatsOnLogout } from './chat.js';
import { syncProjectsOnLogin, clearProjectsOnLogout } from './projects.js';

// Store per lo stato di autenticazione
export const user = writable(null);
export const isAuthenticatedStore = writable(false);
export const isLoading = writable(true);

// Inizializza lo store con i dati dal localStorage
export function initAuth() {
  const authenticated = isAuthenticated();
  
  // Inizializza come non autenticato finché non viene verificata la sessione
  user.set(null);
  isAuthenticatedStore.set(false);
  isLoading.set(true);
  
  // Verifica la sessione con il server se c'è un token
  if (authenticated) {
    verifySession().then(async result => {
      if (result.success) {
        user.set(result.user);
        isAuthenticatedStore.set(true);
        // Carica le chat e i progetti dal database (solo una volta qui)
        await Promise.all([
          syncChatsOnLogin(),
          syncProjectsOnLogin()
        ]);
        
        // Processa eventuali dati Patreon pendenti
        const pendingUserId = localStorage.getItem('patreon_pending_user_id');
        const pendingToken = localStorage.getItem('patreon_pending_token');
        if (pendingUserId && pendingToken) {
          // Trigger evento per processare Patreon (gestito in App.svelte)
          window.dispatchEvent(new CustomEvent('patreon-pending-process'));
        }
      } else {
        // Sessione non valida, pulisci tutto
        user.set(null);
        isAuthenticatedStore.set(false);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        // Rimuovi anche i dati utente vecchi se presenti
        localStorage.removeItem('nebula-ai-user');
      }
      isLoading.set(false);
    }).catch(() => {
      // In caso di errore, considera non autenticato
      user.set(null);
      isAuthenticatedStore.set(false);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Rimuovi anche i dati utente vecchi se presenti
      localStorage.removeItem('nebula-ai-user');
      isLoading.set(false);
    });
  } else {
    // Nessun token, utente non autenticato - pulisci eventuali dati vecchi
    user.set(null);
    localStorage.removeItem('user');
    localStorage.removeItem('nebula-ai-user');
    isLoading.set(false);
  }
}

// Aggiorna lo store dopo login/registrazione
export async function setUser(userData) {
  console.log('🔐 [AUTH STORE] setUser chiamato con:', userData);
  
  // Verifica che il token sia disponibile
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.error('❌ [AUTH STORE] Token non disponibile durante setUser');
    return;
  }
  
  // Carica tutti i dati dell'utente dal server per assicurarsi di avere dati completi
  try {
    const { verifySession } = await import('../services/authService.js');
    const sessionResult = await verifySession();
    
    if (sessionResult.success && sessionResult.user) {
      console.log('✅ [AUTH STORE] Dati utente completi caricati:', sessionResult.user);
      user.set(sessionResult.user);
      isAuthenticatedStore.set(true);
      
      // Attendi un breve momento per assicurarsi che lo store sia aggiornato
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Sincronizza le chat e i progetti dal database
      console.log('🔄 [AUTH STORE] Sincronizzazione chat e progetti...');
      await Promise.all([
        syncChatsOnLogin(),
        syncProjectsOnLogin()
      ]);
      console.log('✅ [AUTH STORE] Sincronizzazione completata');
    } else {
      console.warn('⚠️ [AUTH STORE] verifySession fallito, uso dati parziali');
      user.set(userData);
      isAuthenticatedStore.set(true);
      
      // Prova comunque a sincronizzare
      await new Promise(resolve => setTimeout(resolve, 100));
      await Promise.all([
        syncChatsOnLogin(),
        syncProjectsOnLogin()
      ]);
    }
  } catch (error) {
    console.error('❌ [AUTH STORE] Errore durante setUser:', error);
    // In caso di errore, usa i dati forniti e prova comunque a sincronizzare
    user.set(userData);
    isAuthenticatedStore.set(true);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    await Promise.all([
      syncChatsOnLogin(),
      syncProjectsOnLogin()
    ]);
  }
}

// Pulisci lo store dopo logout
export function clearUser() {
  user.set(null);
  isAuthenticatedStore.set(false);
  // Rimuovi tutti i dati utente dal localStorage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('nebula-ai-user');
  // Pulisci le chat e i progetti salvati sull'account
  clearChatsOnLogout();
  clearProjectsOnLogout();
}

