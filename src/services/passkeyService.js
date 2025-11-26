// Servizio per gestire le passkeys (WebAuthn)

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// Determina l'URL base dell'API
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/auth';
    }
    
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (backendUrl) {
      return `${backendUrl}/api/auth`;
    }
    
    return '/api/auth';
  }
  return 'http://localhost:3001/api/auth';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Verifica se le passkeys sono supportate dal browser
 */
export function isPasskeySupported() {
  if (typeof window === 'undefined') return false;
  
  return (
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials !== 'undefined' &&
    typeof navigator.credentials.create !== 'undefined'
  );
}

/**
 * Registra una nuova passkey per l'utente
 */
export async function registerPasskey(username) {
  try {
    if (!isPasskeySupported()) {
      return {
        success: false,
        message: 'Le passkeys non sono supportate dal tuo browser'
      };
    }
    
    // Inizia la registrazione
    const startResponse = await fetch(`${API_BASE_URL}/passkey/register/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });
    
    if (!startResponse.ok) {
      const error = await startResponse.json();
      return {
        success: false,
        message: error.message || 'Errore durante l\'inizio della registrazione'
      };
    }
    
    const { options } = await startResponse.json();
    
    // Crea la passkey usando il browser
    let credential;
    try {
      credential = await startRegistration(options);
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Errore durante la creazione della passkey'
      };
    }
    
    // Completa la registrazione
    const finishResponse = await fetch(`${API_BASE_URL}/passkey/register/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        credential
      })
    });
    
    const result = await finishResponse.json();
    
    return result;
  } catch (error) {
    console.error('Errore registrazione passkey:', error);
    return {
      success: false,
      message: 'Errore durante la registrazione della passkey',
      error: error.message
    };
  }
}

/**
 * Effettua il login con passkey
 */
export async function loginWithPasskey(username) {
  try {
    if (!isPasskeySupported()) {
      return {
        success: false,
        message: 'Le passkeys non sono supportate dal tuo browser'
      };
    }
    
    // Inizia l'autenticazione
    const startResponse = await fetch(`${API_BASE_URL}/passkey/login/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });
    
    if (!startResponse.ok) {
      const error = await startResponse.json();
      return {
        success: false,
        message: error.message || 'Errore durante l\'inizio del login'
      };
    }
    
    const { options } = await startResponse.json();
    
    // Autentica usando il browser
    let credential;
    try {
      credential = await startAuthentication(options);
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Errore durante l\'autenticazione'
      };
    }
    
    // Completa il login
    const finishResponse = await fetch(`${API_BASE_URL}/passkey/login/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        credential
      })
    });
    
    const result = await finishResponse.json();
    
    if (result.success && result.token) {
      // Salva il token come nel login normale
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    
    return result;
  } catch (error) {
    console.error('Errore login passkey:', error);
    return {
      success: false,
      message: 'Errore durante il login con passkey',
      error: error.message
    };
  }
}

