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
  user.set(userData);
  isAuthenticatedStore.set(true);
  // Sincronizza le chat e i progetti dal database
  await Promise.all([
    syncChatsOnLogin(),
    syncProjectsOnLogin()
  ]);
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

