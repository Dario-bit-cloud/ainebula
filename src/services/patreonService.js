// Servizio per integrazione Patreon

// Determina l'URL base dell'API in base all'ambiente
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Se siamo su localhost, usa localhost:3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    
    // In produzione, controlla se c'è una variabile d'ambiente per il backend
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (backendUrl) {
      return `${backendUrl}/api`;
    }
    
    // Altrimenti, per Vercel, usa URL relativo
    return '/api';
  }
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Verifica lo stato dell'abbonamento Patreon dell'utente
 */
export async function checkPatreonMembership(patreonUserId) {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/patreon/check-membership`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ patreonUserId })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore verifica Patreon:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Collega l'account Patreon all'utente
 */
export async function linkPatreonAccount(patreonUserId, patreonAccessToken) {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/patreon/link-account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ patreonUserId, patreonAccessToken })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore collegamento Patreon:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Ottiene l'URL di autorizzazione Patreon
 */
export function getPatreonAuthUrl() {
  const clientId = import.meta.env.VITE_PATREON_CLIENT_ID || 'NF2MmLVExjXVv4ZpcgijfosjlJIYQuPBblK7vE1PpSPRawgFbKhiVbzq0Nbl1YAf';
  
  // Determina redirect URI in base all'ambiente
  let redirectUri;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Se siamo su localhost, usa il backend locale (porta 3001)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      redirectUri = 'http://localhost:3001/api/patreon/callback';
    } else {
      // In produzione, usa il dominio corrente
      redirectUri = `${window.location.origin}/api/patreon/callback`;
    }
  } else {
    redirectUri = 'http://localhost:3001/api/patreon/callback';
  }
  
  const scope = 'identity identity[email] memberships';
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Salva state in localStorage per verifica dopo redirect
  if (typeof window !== 'undefined') {
    localStorage.setItem('patreon_oauth_state', state);
  }
  
  return `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
}

/**
 * Verifica se l'utente ha un account Patreon collegato
 */
export async function getPatreonLinkStatus() {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/patreon/link-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore verifica stato Patreon:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Scollega l'account Patreon
 */
export async function unlinkPatreonAccount() {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/patreon/unlink-account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore scollegamento Patreon:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

