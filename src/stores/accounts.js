import { writable, get } from 'svelte/store';

const ACCOUNTS_STORAGE_KEY = 'nebula-ai-accounts';
const CURRENT_ACCOUNT_KEY = 'nebula-ai-current-account';

// Struttura account:
// {
//   id: string,
//   username: string,
//   email: string,
//   token: string,
//   userId: string,
//   addedAt: string
// }

function loadAccounts() {
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading accounts:', e);
  }
  
  return [];
}

function saveAccounts(accounts) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Error saving accounts:', e);
  }
}

function getCurrentAccountId() {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(CURRENT_ACCOUNT_KEY);
  } catch (e) {
    return null;
  }
}

function setCurrentAccountId(accountId) {
  if (typeof window === 'undefined') return;
  
  try {
    if (accountId) {
      localStorage.setItem(CURRENT_ACCOUNT_KEY, accountId);
    } else {
      localStorage.removeItem(CURRENT_ACCOUNT_KEY);
    }
  } catch (e) {
    console.error('Error setting current account:', e);
  }
}

const initialAccounts = loadAccounts();
export const accounts = writable(initialAccounts);
export const currentAccountId = writable(getCurrentAccountId());

// Salva automaticamente quando cambiano gli account
accounts.subscribe(accountsList => {
  saveAccounts(accountsList);
});

// Ottieni l'account corrente
export function getCurrentAccount() {
  const allAccounts = get(accounts);
  const currentId = get(currentAccountId);
  
  if (!currentId) {
    // Se non c'è un account corrente, usa il primo disponibile
    return allAccounts.length > 0 ? allAccounts[0] : null;
  }
  
  return allAccounts.find(acc => acc.id === currentId) || allAccounts[0] || null;
}

// Aggiungi un nuovo account
export function addAccount(accountData) {
  const allAccounts = get(accounts);
  
  // Verifica se l'account esiste già (per email o userId)
  const existingIndex = allAccounts.findIndex(
    acc => acc.email === accountData.email || acc.userId === accountData.userId
  );
  
  const account = {
    id: accountData.userId || `account_${Date.now()}`,
    username: accountData.username,
    email: accountData.email,
    token: accountData.token,
    userId: accountData.userId,
    addedAt: new Date().toISOString()
  };
  
  if (existingIndex >= 0) {
    // Aggiorna account esistente
    allAccounts[existingIndex] = account;
    accounts.set(allAccounts);
  } else {
    // Aggiungi nuovo account
    accounts.set([...allAccounts, account]);
  }
  
  // Imposta come account corrente
  currentAccountId.set(account.id);
  setCurrentAccountId(account.id);
  
  return account;
}

// Rimuovi un account
export function removeAccount(accountId) {
  const allAccounts = get(accounts);
  const filtered = allAccounts.filter(acc => acc.id !== accountId);
  accounts.set(filtered);
  
  // Se era l'account corrente, passa al primo disponibile
  if (get(currentAccountId) === accountId) {
    if (filtered.length > 0) {
      currentAccountId.set(filtered[0].id);
      setCurrentAccountId(filtered[0].id);
    } else {
      currentAccountId.set(null);
      setCurrentAccountId(null);
    }
  }
  
  return filtered;
}

// Cambia account corrente
export function switchAccount(accountId) {
  const allAccounts = get(accounts);
  const account = allAccounts.find(acc => acc.id === accountId);
  
  if (account) {
    currentAccountId.set(accountId);
    setCurrentAccountId(accountId);
    return account;
  }
  
  return null;
}

// Ottieni tutti gli account tranne quello corrente
export function getOtherAccounts() {
  const allAccounts = get(accounts);
  const currentId = get(currentAccountId);
  
  return allAccounts.filter(acc => acc.id !== currentId);
}




