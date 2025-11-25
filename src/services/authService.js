// Servizio per gestire l'autenticazione

import { initializeEncryption, clearEncryptionKey } from './encryptionService.js';

// Determina l'URL base dell'API in base all'ambiente
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Se siamo su localhost, usa localhost:3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/auth';
    }
    
    // In produzione, controlla se c'è una variabile d'ambiente per il backend
    // Se il backend è deployato separatamente (es. Railway, Render), usa quella URL
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (backendUrl) {
      // Se c'è una variabile d'ambiente configurata, usala
      console.log('🔧 [AUTH SERVICE] Usando backend URL da variabile d\'ambiente:', backendUrl);
      return `${backendUrl}/api/auth`;
    }
    
    // Altrimenti, per Vercel, usa URL relativo
    // NOTA: Questo funziona solo se le API routes sono deployate su Vercel
    // Se il backend è separato, devi configurare VITE_API_BASE_URL
    return '/api/auth';
  }
  return 'http://localhost:3001/api/auth';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 [AUTH SERVICE] API Base URL configurato:', API_BASE_URL);

/**
 * Registra un nuovo utente
 */
export async function register(username, password, referralCode = null) {
  const url = `${API_BASE_URL}/register`;
  const requestBody = { username, password };
  if (referralCode) {
    requestBody.referralCode = referralCode;
  }
  
  console.log('📝 [REGISTER] Inizio registrazione:', {
    url,
    username,
    timestamp: new Date().toISOString()
  });
  
  try {
    console.log('📤 [REGISTER] Invio richiesta:', {
      method: 'POST',
      url,
      headers: { 'Content-Type': 'application/json' },
      body: { username, password: '***' }
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 [REGISTER] Risposta ricevuta:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    let data;
    const responseText = await response.text();
    console.log('📄 [REGISTER] Body risposta (raw):', responseText);
    
    try {
      data = JSON.parse(responseText);
      console.log('✅ [REGISTER] Body risposta (parsed):', data);
    } catch (parseError) {
      console.error('❌ [REGISTER] Errore parsing JSON:', parseError);
      return {
        success: false,
        message: 'Errore nel formato della risposta del server',
        error: `Errore parsing: ${parseError.message}`,
        rawResponse: responseText
      };
    }
    
    if (data.success && data.token) {
      console.log('✅ [REGISTER] Registrazione riuscita, salvataggio token');
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Carica l'abbonamento dal database (dovrebbe essere free di default)
      if (data.user && data.user.id) {
        try {
          const { verifySession } = await import('./authService.js');
          const sessionResult = await verifySession();
          if (sessionResult.success && sessionResult.user?.subscription) {
            // Sincronizza l'abbonamento con lo store utente
            import('../stores/user.js').then(module => {
              module.user.update(user => ({
                ...user,
                subscription: {
                  active: sessionResult.user.subscription.active,
                  plan: sessionResult.user.subscription.plan,
                  expiresAt: sessionResult.user.subscription.expiresAt,
                  key: user.subscription?.key || null // Mantieni la chiave locale se presente
                }
              }));
            });
          }
        } catch (error) {
          console.error('❌ [REGISTER] Errore caricamento abbonamento:', error);
          // Non bloccare la registrazione se il caricamento abbonamento fallisce
        }
      }
      
      // Inizializza la crittografia end-to-end per i messaggi
      if (data.user && data.user.id) {
        try {
          console.log('🔒 [REGISTER] Inizializzazione crittografia end-to-end...');
          await initializeEncryption(password, data.user.id);
          console.log('✅ [REGISTER] Crittografia inizializzata con successo');
        } catch (error) {
          console.error('❌ [REGISTER] Errore inizializzazione crittografia:', error);
          // Non bloccare la registrazione se la crittografia fallisce
        }
      }
      
      // Salva l'account nel sistema account multipli
      if (typeof window !== 'undefined' && data.user) {
        import('../stores/accounts.js').then(module => {
          module.addAccount({
            username: data.user.username,
            email: data.user.email || '',
            token: data.token,
            userId: data.user.id
          });
        });
      }
    } else {
      console.warn('⚠️ [REGISTER] Registrazione fallita:', data);
    }
    
    return data;
  } catch (error) {
    console.error('❌ [REGISTER] Errore durante la richiesta:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      url,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message,
      errorType: error.name,
      url
    };
  }
}

/**
 * Effettua il login
 */
export async function login(username, password, twoFactorCode = null) {
  const url = `${API_BASE_URL}/login`;
  const requestBody = { username, password };
  if (twoFactorCode) {
    requestBody.twoFactorCode = twoFactorCode;
  }
  
  console.log('🔐 [LOGIN] Inizio login:', {
    url,
    username,
    timestamp: new Date().toISOString()
  });
  
  try {
    console.log('📤 [LOGIN] Invio richiesta:', {
      method: 'POST',
      url,
      headers: { 'Content-Type': 'application/json' },
      body: { username, password: '***' } // Non loggare la password reale
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 [LOGIN] Risposta ricevuta:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    let data;
    const responseText = await response.text();
    console.log('📄 [LOGIN] Body risposta (raw):', responseText);
    
    try {
      data = JSON.parse(responseText);
      console.log('✅ [LOGIN] Body risposta (parsed):', data);
    } catch (parseError) {
      console.error('❌ [LOGIN] Errore parsing JSON:', parseError);
      console.error('📄 [LOGIN] Testo ricevuto:', responseText);
      return {
        success: false,
        message: 'Errore nel formato della risposta del server',
        error: `Errore parsing: ${parseError.message}`,
        rawResponse: responseText
      };
    }
    
    if (data.success && data.token) {
      console.log('✅ [LOGIN] Login riuscito, salvataggio token');
      // Salva il token nel localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Carica l'abbonamento dal database
      if (data.user && data.user.id) {
        try {
          const { verifySession } = await import('./authService.js');
          const sessionResult = await verifySession();
          if (sessionResult.success && sessionResult.user?.subscription) {
            // Sincronizza l'abbonamento con lo store utente
            import('../stores/user.js').then(module => {
              module.user.update(user => ({
                ...user,
                subscription: {
                  active: sessionResult.user.subscription.active,
                  plan: sessionResult.user.subscription.plan,
                  expiresAt: sessionResult.user.subscription.expiresAt,
                  key: user.subscription?.key || null // Mantieni la chiave locale se presente
                }
              }));
            });
          }
        } catch (error) {
          console.error('❌ [LOGIN] Errore caricamento abbonamento:', error);
          // Non bloccare il login se il caricamento abbonamento fallisce
        }
      }
      
      // Inizializza la crittografia end-to-end per i messaggi
      if (data.user && data.user.id) {
        try {
          console.log('🔒 [LOGIN] Inizializzazione crittografia end-to-end...');
          await initializeEncryption(password, data.user.id);
          console.log('✅ [LOGIN] Crittografia inizializzata con successo');
        } catch (error) {
          console.error('❌ [LOGIN] Errore inizializzazione crittografia:', error);
          // Non bloccare il login se la crittografia fallisce
        }
      }
      
      // Salva l'account nel sistema account multipli
      if (typeof window !== 'undefined' && data.user) {
        import('../stores/accounts.js').then(module => {
          module.addAccount({
            username: data.user.username,
            email: data.user.email || '',
            token: data.token,
            userId: data.user.id
          });
        });
      }
    } else {
      console.warn('⚠️ [LOGIN] Login fallito:', data);
    }
    
    return data;
  } catch (error) {
    console.error('❌ [LOGIN] Errore durante la richiesta:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      url,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message,
      errorType: error.name,
      url
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
    
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Sincronizza l'abbonamento con lo store utente
      if (data.user.subscription) {
        import('../stores/user.js').then(module => {
          module.user.update(user => ({
            ...user,
            subscription: {
              active: data.user.subscription.active,
              plan: data.user.subscription.plan,
              expiresAt: data.user.subscription.expiresAt,
              key: user.subscription?.key || null // Mantieni la chiave locale se presente
            }
          }));
        });
      }
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
      await fetch(`${API_BASE_URL}`, {
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
    const user = getCurrentUser();
    if (user && user.id) {
      // Rimuovi la chiave di crittografia
      clearEncryptionKey(user.id);
    }
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

/**
 * Elimina l'account dell'utente corrente e tutti i dati associati
 */
export async function deleteAccount() {
  const url = `${API_BASE_URL}?action=delete-account`;
  const token = getToken();
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  console.log('🗑️ [DELETE ACCOUNT] Inizio eliminazione account');
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ [DELETE ACCOUNT] Errore parsing JSON:', parseError);
      return {
        success: false,
        message: 'Errore nel formato della risposta del server',
        error: `Errore parsing: ${parseError.message}`,
        rawResponse: responseText
      };
    }
    
    if (data.success) {
      console.log('✅ [DELETE ACCOUNT] Account eliminato con successo');
      
      // Rimuovi la chiave di crittografia
      const user = getCurrentUser();
      if (user && user.id) {
        clearEncryptionKey(user.id);
      }
      
      // Rimuovi tutti i dati dal localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('nebula-ai-user');
      localStorage.removeItem('nebula-ai-chats');
      localStorage.removeItem('nebula-auth-token');
      localStorage.removeItem('nebula-session');
      
      // Rimuovi l'account dal sistema account multipli
      if (typeof window !== 'undefined') {
        import('../stores/accounts.js').then(module => {
          const currentAccount = module.getCurrentAccount();
          if (currentAccount) {
            module.removeAccount(currentAccount.id);
          }
        });
      }
    } else {
      console.warn('⚠️ [DELETE ACCOUNT] Eliminazione fallita:', data);
    }
    
    return data;
  } catch (error) {
    console.error('❌ [DELETE ACCOUNT] Errore durante la richiesta:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      url,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message,
      errorType: error.name,
      url
    };
  }
}

/**
 * Genera QR code per 2FA
 */
export async function generate2FA() {
  const url = `${API_BASE_URL}/2fa?action=generate`;
  const token = getToken();
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
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
 * Verifica e abilita 2FA
 */
export async function verify2FA(code) {
  const url = `${API_BASE_URL}/2fa?action=verify`;
  const token = getToken();
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
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
 * Disabilita 2FA
 */
export async function disable2FA(code) {
  const url = `${API_BASE_URL}/2fa?action=disable`;
  const token = getToken();
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
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
 * Verifica lo stato del 2FA
 */
export async function get2FAStatus() {
  const url = `${API_BASE_URL}/2fa?action=status`;
  const token = getToken();
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

