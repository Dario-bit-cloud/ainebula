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
 * Verifica la sessione corrente
 */
export async function verifySession() {
  try {
    let token = localStorage.getItem('auth_token');
    
    console.log('🔍 [VERIFY SESSION] Verifica sessione:', {
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
      apiUrl: API_BASE_URL
    });
    
    // Se non c'è token, non c'è sessione da verificare
    if (!token) {
      console.log('ℹ️ [VERIFY SESSION] Nessun token trovato');
      return {
        success: false,
        message: 'Nessun token trovato',
        user: null
      };
    }
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        method: 'GET',
        headers,
        credentials: 'include', // Importante: include i cookie nella richiesta
        // Timeout per evitare attese infinite
        signal: AbortSignal.timeout(5000) // 5 secondi
      });
      
      console.log('📥 [VERIFY SESSION] Risposta:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        // Se la risposta non è ok, la sessione non è valida
        const errorText = await response.text();
        console.log('⚠️ [VERIFY SESSION] Sessione non valida:', response.status);
        
        // Pulisci i dati locali
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('nebula-ai-user');
        
        try {
          const errorData = JSON.parse(errorText);
          return {
            success: false,
            message: errorData.message || `Errore ${response.status}`,
            user: null
          };
        } catch {
          return {
            success: false,
            message: `Errore ${response.status}: ${response.statusText}`,
            user: null
          };
        }
      }
      
      const data = await response.json();
      
      // Verifica che la risposta sia valida e contenga un utente con ID
      if (data && data.success && data.user && data.user.id) {
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
                key: user.subscription?.key || null
              }
            }));
          }).catch(() => {
            // Ignora errori se il modulo non è disponibile
          });
        }
        
        return data;
      } else {
        // Risposta non valida
        console.log('⚠️ [VERIFY SESSION] Risposta non valida, pulizia dati');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('nebula-ai-user');
        
        return {
          success: false,
          message: 'Nessuna sessione valida',
          user: null
        };
      }
    } catch (fetchError) {
      // Gestisci errori di rete (server non disponibile, timeout, etc.)
      if (fetchError.name === 'AbortError' || fetchError.name === 'TypeError') {
        console.log('⚠️ [VERIFY SESSION] Server non disponibile o timeout:', fetchError.message);
        
        // Se c'è un token ma il server non risponde, mantieni i dati locali
        // ma segna che la verifica non è riuscita
        const localUser = localStorage.getItem('user');
        if (localUser && token) {
          try {
            const userData = JSON.parse(localUser);
            if (userData && userData.id) {
              console.log('ℹ️ [VERIFY SESSION] Usando dati locali (server non disponibile)');
              return {
                success: true,
                user: userData,
                token: token,
                offline: true // Flag per indicare che è in modalità offline
              };
            }
          } catch (e) {
            // Ignora errori di parsing
          }
        }
      }
      
      // Se non ci sono dati locali validi, restituisci errore
      return {
        success: false,
        message: 'Errore nella comunicazione con il server',
        error: fetchError.message,
        offline: true
      };
    }
  } catch (error) {
    console.error('❌ [VERIFY SESSION] Errore generale:', error);
    return {
      success: false,
      message: 'Errore durante la verifica della sessione',
      error: error.message,
      user: null
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

