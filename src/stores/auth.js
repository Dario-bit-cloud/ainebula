import { writable } from 'svelte/store';
import { getCurrentUser, isAuthenticated, verifySession } from '../services/authService.js';
import { syncChatsOnLogin, clearChatsOnLogout } from './chat.js';

// Store per lo stato di autenticazione
export const user = writable(null);
export const isAuthenticatedStore = writable(false);
export const isLoading = writable(true);

// Inizializza lo store con i dati dal localStorage
export function initAuth() {
  const currentUser = getCurrentUser();
  const authenticated = isAuthenticated();
  
  user.set(currentUser);
  isAuthenticatedStore.set(authenticated);
  isLoading.set(false);
  
  // Verifica la sessione con il server se c'è un token
  if (authenticated) {
    verifySession().then(async result => {
      if (result.success) {
        user.set(result.user);
        isAuthenticatedStore.set(true);
        // Carica le chat dal database
        await syncChatsOnLogin();
      } else {
        // Sessione non valida, pulisci tutto
        user.set(null);
        isAuthenticatedStore.set(false);
      }
      isLoading.set(false);
    });
  }
}

// Aggiorna lo store dopo login/registrazione
export async function setUser(userData) {
  user.set(userData);
  isAuthenticatedStore.set(true);
  // Sincronizza le chat dal database
  await syncChatsOnLogin();
}

// Pulisci lo store dopo logout
export function clearUser() {
  user.set(null);
  isAuthenticatedStore.set(false);
  // Pulisci le chat salvate sull'account
  clearChatsOnLogout();
}

