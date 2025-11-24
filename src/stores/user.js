import { writable, get } from 'svelte/store';

// Store per le informazioni dell'utente
// In futuro verrà popolato quando l'utente effettua il login
export const user = writable({
  name: '',
  email: '',
  isLoggedIn: false,
  subscription: {
    active: false,
    plan: null, // 'pro' o 'max'
    expiresAt: null
  }
});

// Funzione per verificare se l'utente ha un abbonamento attivo
export function hasActiveSubscription() {
  const userData = get(user);
  if (!userData.subscription?.active) return false;
  
  // Verifica se l'abbonamento è scaduto
  if (userData.subscription.expiresAt) {
    return new Date(userData.subscription.expiresAt) > new Date();
  }
  
  return true;
}

// Funzione per verificare se l'utente ha un piano specifico o superiore
export function hasPlanOrHigher(requiredPlan) {
  const userData = get(user);
  if (!hasActiveSubscription()) return false;
  
  const planHierarchy = { 'pro': 1, 'max': 2 };
  const userPlan = userData.subscription?.plan;
  
  if (!userPlan || !planHierarchy[userPlan]) return false;
  
  return planHierarchy[userPlan] >= planHierarchy[requiredPlan];
}

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

