// Servizio per gestire l'autenticazione

const API_BASE_URL = 'http://localhost:3001/api/auth';

/**
 * Registra un nuovo utente
 */
export async function register(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      // Salva il token nel localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Effettua il login
 */
export async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      // Salva il token nel localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Verifica la sessione corrente
 */
export async function verifySession() {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, message: 'Nessun token trovato' };
    }
    
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    } else {
      // Token non valido, rimuovilo e tutti i dati utente
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('nebula-ai-user');
    }
    
    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Effettua il logout
 */
export async function logout() {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Errore durante il logout:', error);
  } finally {
    // Rimuovi sempre il token e tutti i dati utente dal localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('nebula-ai-user');
  }
}

/**
 * Ottiene il token corrente
 */
export function getToken() {
  return localStorage.getItem('auth_token');
}

/**
 * Ottiene l'utente corrente
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Verifica se l'utente è autenticato
 */
export function isAuthenticated() {
  return !!localStorage.getItem('auth_token');
}

