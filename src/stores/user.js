import { writable } from 'svelte/store';

// Store per le informazioni dell'utente
// In futuro verrà popolato quando l'utente effettua il login
export const user = writable({
  name: '',
  email: '',
  isLoggedIn: false
});

// Funzione helper per aggiornare i dati utente (da chiamare dopo il login)
export function setUser(userData) {
  user.set({
    name: userData.name || '',
    email: userData.email || '',
    isLoggedIn: true
  });
}

// Funzione helper per fare logout
export function clearUser() {
  user.set({
    name: '',
    email: '',
    isLoggedIn: false
  });
}

