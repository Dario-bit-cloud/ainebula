import { writable, get } from 'svelte/store';

// Carica i dati utente da localStorage se disponibili
function loadUserFromStorage() {
  if (typeof window === 'undefined') {
    return {
      name: '',
      email: '',
      isLoggedIn: false,
      subscription: {
        active: false,
        plan: null,
        expiresAt: null,
        key: null
      }
    };
  }
  
  try {
    const stored = localStorage.getItem('nebula-ai-user');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        name: parsed.name || '',
        email: parsed.email || '',
        isLoggedIn: parsed.isLoggedIn || false,
        subscription: {
          active: parsed.subscription?.active || false,
          plan: parsed.subscription?.plan || null,
          expiresAt: parsed.subscription?.expiresAt || null,
          key: parsed.subscription?.key || null
        }
      };
    }
  } catch (e) {
    console.error('Error loading user from storage:', e);
  }
  
  return {
    name: '',
    email: '',
    isLoggedIn: false,
    subscription: {
      active: false,
      plan: null,
      expiresAt: null,
      key: null
    }
  };
}

// Salva i dati utente in localStorage
function saveUserToStorage(userData) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('nebula-ai-user', JSON.stringify(userData));
  } catch (e) {
    console.error('Error saving user to storage:', e);
  }
}

// Store per le informazioni dell'utente
// Carica i dati da localStorage all'inizializzazione
const initialUser = loadUserFromStorage();
export const user = writable(initialUser);

// Sottoscrivi ai cambiamenti per salvare automaticamente
user.subscribe(userData => {
  saveUserToStorage(userData);
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
// Gerarchia piani: pro (30€/mese) < max (300€/mese)
export function hasPlanOrHigher(requiredPlan) {
  const userData = get(user);
  if (!hasActiveSubscription()) return false;
  
  const planHierarchy = { 'pro': 1, 'max': 2 };
  const userPlan = userData.subscription?.plan;
  
  if (!userPlan || !planHierarchy[userPlan]) return false;
  
  return planHierarchy[userPlan] >= planHierarchy[requiredPlan];
}

// Funzione per ottenere i limiti del piano corrente
export function getPlanLimits() {
  const userData = get(user);
  const plan = userData.subscription?.plan;
  
  const limits = {
    free: {
      messagesPerDay: 50,
      maxFileSize: 10, // MB
      historyDays: 7,
      premiumModels: false,
      apiAccess: false,
      prioritySupport: false
    },
    pro: {
      messagesPerDay: 500,
      maxFileSize: 100, // MB
      historyDays: -1, // illimitato
      premiumModels: ['gpt-4.1'],
      apiAccess: false,
      prioritySupport: true
    },
    max: {
      messagesPerDay: -1, // illimitato
      maxFileSize: 500, // MB
      historyDays: -1, // illimitato
      premiumModels: ['gpt-4.1', 'o3'],
      apiAccess: true,
      prioritySupport: true
    }
  };
  
  return limits[plan] || limits.free;
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

