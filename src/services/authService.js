// Servizio per gestire l'autenticazione

import { initializeEncryption, clearEncryptionKey, cachePassword } from './encryptionService.js';

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
      credentials: 'include', // Importante: include i cookie nella richiesta
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
export async function login(username, password) {
  const url = `${API_BASE_URL}/login`;
  const requestBody = { username, password };
  
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
    let token = localStorage.getItem('auth_token');
    
    console.log('🔍 [VERIFY SESSION] Verifica sessione:', {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null
    });
    
    // Se non c'è token nel localStorage, prova a recuperarlo dal cookie
    // (il cookie viene inviato automaticamente dal browser)
    // Se il token è nel localStorage, usalo; altrimenti il server controllerà il cookie
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers,
      credentials: 'include' // Importante: include i cookie nella richiesta
    });
    
    console.log('📥 [VERIFY SESSION] Risposta:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [VERIFY SESSION] Errore risposta:', errorText);
      try {
        const errorData = JSON.parse(errorText);
        return errorData;
      } catch {
        return {
          success: false,
          message: `Errore ${response.status}: ${response.statusText}`,
          error: errorText
        };
      }
    }
    
    const data = await response.json();
    
    if (data.success && data.user) {
      // Se il server ha restituito un token (potrebbe essere dal cookie), salviamolo
      if (data.token && !token) {
        token = data.token;
        localStorage.setItem('auth_token', token);
      }
      
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
    
    await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Importante: include i cookie nella richiesta
    });
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
 * Aggiorna lo username dell'utente corrente
 */
export async function updateUsername(username) {
  const url = `${API_BASE_URL}/update-username`;
  const token = getToken();
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Importante: include i cookie nella richiesta
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Aggiorna i dati utente nel localStorage
      const user = getCurrentUser();
      if (user) {
        user.username = data.username;
        localStorage.setItem('user', JSON.stringify(user));
      }
    }
    
    return data;
  } catch (error) {
    console.error('Errore durante aggiornamento username:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Aggiorna la password dell'utente corrente
 * Gestisce anche le chiavi di recupero per i messaggi crittografati
 */
export async function updatePassword(currentPassword, newPassword) {
  const url = `${API_BASE_URL}/update-password`;
  const token = getToken();
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const user = getCurrentUser();
    if (!user || !user.id) {
      return {
        success: false,
        message: 'Utente non trovato'
      };
    }
    
    // Crea una chiave di recupero per i messaggi vecchi
    let recoveryKey = null;
    try {
      const { createRecoveryKey } = await import('./encryptionService.js');
      recoveryKey = await createRecoveryKey(currentPassword, newPassword, user.id);
      console.log('✅ [UPDATE PASSWORD] Chiave di recupero creata');
    } catch (error) {
      console.error('❌ [UPDATE PASSWORD] Errore creazione chiave di recupero:', error);
      // Non bloccare il cambio password se la chiave di recupero fallisce
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Importante: include i cookie nella richiesta
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        recovery_key: recoveryKey ? recoveryKey.encryptedOldKey : null
      })
    });
    
    const data = await response.json();
    
    // Se il cambio password è riuscito, aggiorna la cache
    if (data.success) {
      // Aggiorna la password in cache
      const { cachePassword } = await import('./encryptionService.js');
      cachePassword(user.id, newPassword);
      
      // Salva la chiave di recupero in localStorage (per decrittografare messaggi vecchi)
      if (recoveryKey) {
        const recoveryKeyStorage = JSON.parse(localStorage.getItem('recovery_keys') || '{}');
        recoveryKeyStorage[user.id] = recoveryKey.encryptedOldKey;
        localStorage.setItem('recovery_keys', JSON.stringify(recoveryKeyStorage));
        console.log('✅ [UPDATE PASSWORD] Chiave di recupero salvata');
      }
    }
    
    return data;
  } catch (error) {
    console.error('Errore durante aggiornamento password:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Elimina l'account dell'utente corrente e tutti i dati associati
 */
export async function deleteAccount() {
  const url = `${API_BASE_URL}/delete-account`;
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
      },
      credentials: 'include' // Importante: include i cookie nella richiesta
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

