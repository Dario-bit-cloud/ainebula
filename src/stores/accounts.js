/**
 * Sistema di gestione account - Ricostruito da zero
 * Gestisce account multipli, autenticazione e stato utente
 */

import { writable, get, derived } from 'svelte/store';
import { user as authUser, isAuthenticatedStore } from './auth.js';

// Chiavi localStorage
const ACCOUNTS_STORAGE_KEY = 'nebula-ai-accounts-v2';
const CURRENT_ACCOUNT_KEY = 'nebula-ai-current-account-v2';

/**
 * Struttura account:
 * {
 *   id: string (userId),
 *   username: string (obbligatorio),
 *   token: string | null,
 *   provider: 'neon' | 'supabase' | 'clerk',
 *   addedAt: string (ISO date),
 *   lastUsedAt: string (ISO date),
 *   isActive: boolean
 * }
 */

// Funzioni di utilità per localStorage
function loadAccountsFromStorage() {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Valida la struttura (username obbligatorio, email opzionale per retrocompatibilità)
      if (Array.isArray(parsed)) {
        return parsed.filter(acc => 
          acc && 
          acc.id && 
          acc.username // Solo username obbligatorio
        ).map(acc => {
          // Rimuovi email se presente (migrazione)
          const { email, ...accountWithoutEmail } = acc;
          return accountWithoutEmail;
        });
      }
    }
  } catch (error) {
    console.error('❌ [ACCOUNTS] Errore caricamento account:', error);
  }
  
  return [];
}

function saveAccountsToStorage(accountsList) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accountsList));
  } catch (error) {
    console.error('❌ [ACCOUNTS] Errore salvataggio account:', error);
  }
}

function getCurrentAccountIdFromStorage() {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(CURRENT_ACCOUNT_KEY);
  } catch (error) {
    return null;
  }
}

function setCurrentAccountIdInStorage(accountId) {
  if (typeof window === 'undefined') return;
  
  try {
    if (accountId) {
      localStorage.setItem(CURRENT_ACCOUNT_KEY, accountId);
    } else {
      localStorage.removeItem(CURRENT_ACCOUNT_KEY);
    }
  } catch (error) {
    console.error('❌ [ACCOUNTS] Errore salvataggio account corrente:', error);
  }
}

// Store principale
const initialAccounts = loadAccountsFromStorage();
export const accounts = writable(initialAccounts);
export const currentAccountId = writable(getCurrentAccountIdFromStorage());

// Salva automaticamente quando cambiano gli account
accounts.subscribe(accountsList => {
  saveAccountsToStorage(accountsList);
});

// Salva automaticamente quando cambia l'account corrente
currentAccountId.subscribe(accountId => {
  setCurrentAccountIdInStorage(accountId);
});

/**
 * Ottiene l'account corrente
 * Se non c'è un account selezionato, usa il primo disponibile
 */
export function getCurrentAccount() {
  const allAccounts = get(accounts);
  const currentId = get(currentAccountId);
  
  if (currentId) {
    const account = allAccounts.find(acc => acc.id === currentId);
    if (account) return account;
  }
  
  // Se non c'è account corrente valido, usa il primo disponibile
  if (allAccounts.length > 0) {
    return allAccounts[0];
  }
  
  return null;
}

/**
 * Ottiene tutti gli account tranne quello corrente
 */
export function getOtherAccounts() {
  const allAccounts = get(accounts);
  const currentId = get(currentAccountId);
  
  return allAccounts.filter(acc => acc.id !== currentId);
}

/**
 * Aggiunge o aggiorna un account
 * Se l'account esiste già (per id o username), lo aggiorna
 */
export function addAccount(accountData) {
  const allAccounts = get(accounts);
  
  // Valida i dati - username è obbligatorio
  if (!accountData || !accountData.id || !accountData.username) {
    console.error('❌ [ACCOUNTS] Dati account non validi (username obbligatorio):', accountData);
    return null;
  }
  
  // Verifica se l'account esiste già (per id o username)
  const existingIndex = allAccounts.findIndex(
    acc => acc.id === accountData.id || acc.username === accountData.username
  );
  
  const account = {
    id: accountData.id,
    username: accountData.username,
    token: accountData.token || null,
    provider: accountData.provider || 'neon',
    addedAt: existingIndex >= 0 ? allAccounts[existingIndex].addedAt : new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    isActive: true
  };
  
  let updatedAccounts;
  if (existingIndex >= 0) {
    // Aggiorna account esistente
    updatedAccounts = [...allAccounts];
    updatedAccounts[existingIndex] = account;
  } else {
    // Aggiungi nuovo account
    updatedAccounts = [...allAccounts, account];
  }
  
  accounts.set(updatedAccounts);
  
  // Imposta come account corrente
  currentAccountId.set(account.id);
  
  console.log('✅ [ACCOUNTS] Account aggiunto/aggiornato:', account.id);
  return account;
}

/**
 * Rimuove un account
 */
export function removeAccount(accountId) {
  const allAccounts = get(accounts);
  const filtered = allAccounts.filter(acc => acc.id !== accountId);
  
  accounts.set(filtered);
  
  // Se era l'account corrente, passa al primo disponibile o null
  if (get(currentAccountId) === accountId) {
    if (filtered.length > 0) {
      currentAccountId.set(filtered[0].id);
    } else {
      currentAccountId.set(null);
    }
  }
  
  console.log('✅ [ACCOUNTS] Account rimosso:', accountId);
  return filtered;
}

/**
 * Cambia account corrente
 */
export function switchAccount(accountId) {
  const allAccounts = get(accounts);
  const account = allAccounts.find(acc => acc.id === accountId);
  
  if (!account) {
    console.warn('⚠️ [ACCOUNTS] Account non trovato:', accountId);
    return null;
  }
  
  // Aggiorna lastUsedAt
  const updatedAccounts = allAccounts.map(acc => 
    acc.id === accountId 
      ? { ...acc, lastUsedAt: new Date().toISOString() }
      : acc
  );
  accounts.set(updatedAccounts);
  
  // Imposta come corrente
  currentAccountId.set(accountId);
  
  console.log('✅ [ACCOUNTS] Account cambiato:', accountId);
  return account;
}

/**
 * Sincronizza l'account corrente con lo store di autenticazione
 * Chiamato quando l'utente fa login
 */
export function syncCurrentAccountWithAuth() {
  const authUserData = get(authUser);
  const isAuthenticated = get(isAuthenticatedStore);
  
  if (!isAuthenticated || !authUserData || !authUserData.id) {
    // Se non c'è autenticazione, rimuovi l'account corrente se non è valido
    const currentAccount = getCurrentAccount();
    if (currentAccount) {
      // Verifica se l'account corrente è ancora valido
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Nessun token, rimuovi l'account corrente
        currentAccountId.set(null);
      }
    }
    return;
  }
  
  // Aggiungi/aggiorna l'account con i dati di autenticazione
  const token = localStorage.getItem('auth_token');
  
  // Username è obbligatorio
  if (!authUserData.username) {
    console.error('❌ [ACCOUNTS] Username mancante nei dati utente');
    return null;
  }
  
  const account = addAccount({
    id: authUserData.id,
    username: authUserData.username,
    token: token,
    provider: 'neon' // o 'supabase' o 'clerk' in base al provider usato
  });
  
  return account;
}

/**
 * Pulisce tutti gli account
 */
export function clearAllAccounts() {
  accounts.set([]);
  currentAccountId.set(null);
  localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
  localStorage.removeItem(CURRENT_ACCOUNT_KEY);
  console.log('✅ [ACCOUNTS] Tutti gli account rimossi');
}

/**
 * Verifica se un account è valido (ha token e dati necessari)
 */
export function isAccountValid(account) {
  if (!account) return false;
  if (!account.id || !account.username) return false; // Solo username obbligatorio
  
  // Se l'account ha un token, verifica che sia ancora valido
  if (account.token) {
    // Qui potresti aggiungere una verifica del token se necessario
    return true;
  }
  
  // Account senza token potrebbe essere ancora valido se l'autenticazione è gestita da cookie
  return true;
}

/**
 * Ottiene il numero di account validi
 */
export function getValidAccountsCount() {
  const allAccounts = get(accounts);
  return allAccounts.filter(acc => isAccountValid(acc)).length;
}

// Derived store per l'account corrente
export const currentAccount = derived(
  [accounts, currentAccountId],
  ([$accounts, $currentAccountId]) => {
    if ($currentAccountId) {
      const account = $accounts.find(acc => acc.id === $currentAccountId);
      if (account) return account;
    }
    return $accounts.length > 0 ? $accounts[0] : null;
  }
);

// Derived store per altri account
export const otherAccounts = derived(
  [accounts, currentAccountId],
  ([$accounts, $currentAccountId]) => {
    return $accounts.filter(acc => acc.id !== $currentAccountId);
  }
);
