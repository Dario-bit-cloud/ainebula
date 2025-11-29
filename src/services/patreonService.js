// Servizio semplificato per gestire Patreon

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    if (backendUrl) {
      return `${backendUrl}/api`;
    }
    return '/api';
  }
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

// Ottieni URL OAuth Patreon
export function getPatreonAuthUrl() {
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'http:' ? 'http' : 'https';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3001';
  const redirectUri = `${protocol}://${host}/api/patreon/callback`;
  
  const clientId = 'NF2MmLVExjXVv4ZpcgijfosjlJIYQuPBblK7vE1PpSPRawgFbKhiVbzq0Nbl1YAf';
  const scopes = 'identity identity[email] identity.memberships';
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: 'patreon_auth'
  });
  
  return `https://www.patreon.com/oauth2/authorize?${params.toString()}`;
}

// Collega account Patreon (dopo callback)
export async function linkPatreonAccount(patreonUserId, patreonAccessToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/patreon/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        patreonUserId,
        patreonAccessToken
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore collegamento Patreon:', error);
    return {
      success: false,
      message: 'Errore durante il collegamento con Patreon',
      error: error.message
    };
  }
}

// Verifica stato collegamento e abbonamento
export async function getPatreonStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/patreon/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore verifica stato Patreon:', error);
    return {
      success: false,
      message: 'Errore durante la verifica dello stato',
      error: error.message
    };
  }
}

// Sincronizza abbonamento da Patreon
export async function syncPatreonMembership() {
  try {
    const response = await fetch(`${API_BASE_URL}/patreon/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore sincronizzazione Patreon:', error);
    return {
      success: false,
      message: 'Errore durante la sincronizzazione',
      error: error.message
    };
  }
}

// Scollega account Patreon
export async function unlinkPatreonAccount() {
  try {
    const response = await fetch(`${API_BASE_URL}/patreon/unlink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore scollegamento Patreon:', error);
    return {
      success: false,
      message: 'Errore durante lo scollegamento',
      error: error.message
    };
  }
}
