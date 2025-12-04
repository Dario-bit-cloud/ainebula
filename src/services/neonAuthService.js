// Servizio per gestire l'autenticazione con Neon Database
// Usa le API routes /api/auth/register e /api/auth/login

import { log, logWarn, logError } from '../utils/logger.js';

// Determina l'URL base dell'API in base all'ambiente
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Se siamo su localhost, usa localhost:3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/auth';
    }
    
    // In produzione, controlla se c'è una variabile d'ambiente per il backend
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (backendUrl) {
      return `${backendUrl}/api/auth`;
    }
    
    // Altrimenti, per Vercel, usa URL relativo
    return '/api/auth';
  }
  return 'http://localhost:3001/api/auth';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 [NEON AUTH SERVICE] API Base URL configurato:', API_BASE_URL);

/**
 * Registra un nuovo utente con username e password
 */
export async function signUp(username, password) {
  try {
    log('📝 [NEON AUTH] Inizio registrazione:', { username });
    
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include i cookie
      body: JSON.stringify({
        username,
        password
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      logError('❌ [NEON AUTH] Errore registrazione:', data);
      return {
        success: false,
        message: data.message || 'Errore durante la registrazione'
      };
    }
    
    if (data.success && data.token) {
      // Salva il token nel localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      log('✅ [NEON AUTH] Registrazione riuscita');
      
      return {
        success: true,
        user: data.user,
        token: data.token
      };
    }
    
    return {
      success: false,
      message: data.message || 'Errore durante la registrazione'
    };
  } catch (error) {
    logError('❌ [NEON AUTH] Errore durante registrazione:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Effettua il login con username e password
 */
export async function signIn(username, password) {
  try {
    log('🔐 [NEON AUTH] Inizio login:', { username });
    
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include i cookie
      body: JSON.stringify({
        username,
        password
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      logError('❌ [NEON AUTH] Errore login:', data);
      return {
        success: false,
        message: data.message || 'Credenziali non valide'
      };
    }
    
    if (data.success && data.token) {
      // Salva il token nel localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      log('✅ [NEON AUTH] Login riuscito');
      
      return {
        success: true,
        user: data.user,
        token: data.token
      };
    }
    
    return {
      success: false,
      message: data.message || 'Errore durante il login'
    };
  } catch (error) {
    logError('❌ [NEON AUTH] Errore durante login:', error);
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
export async function signOut() {
  try {
    log('🚪 [NEON AUTH] Logout...');
    
    const token = localStorage.getItem('auth_token');
    
    // Chiama l'API per invalidare la sessione
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
    } catch (error) {
      // Ignora errori se l'endpoint non esiste o il server non risponde
      logWarn('⚠️ [NEON AUTH] Errore durante logout API:', error.message);
    }
    
    // Rimuovi sempre i dati locali
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('nebula-ai-user');
    localStorage.removeItem('saved_username');
    localStorage.removeItem('saved_password');
    localStorage.removeItem('remember_credentials');
    
    log('✅ [NEON AUTH] Logout completato');
    return { success: true };
  } catch (error) {
    logError('❌ [NEON AUTH] Errore durante logout:', error);
    // Rimuovi comunque i dati locali anche in caso di errore
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('nebula-ai-user');
    localStorage.removeItem('saved_username');
    localStorage.removeItem('saved_password');
    localStorage.removeItem('remember_credentials');
    return {
      success: false,
      message: 'Errore durante il logout',
      error: error.message
    };
  }
}

/**
 * Ottiene l'utente corrente
 */
export async function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    logError('❌ [NEON AUTH] Errore getCurrentUser:', error);
    return null;
  }
}

/**
 * Ottiene la sessione corrente
 */
export async function getSession() {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      return { access_token: token };
    }
    return null;
  } catch (error) {
    logError('❌ [NEON AUTH] Errore getSession:', error);
    return null;
  }
}

/**
 * Verifica se l'utente è autenticato
 */
export function isAuthenticated() {
  return !!localStorage.getItem('auth_token');
}




