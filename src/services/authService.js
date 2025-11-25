// Servizio per gestire l'autenticazione

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
export async function register(username, password) {
  const url = `${API_BASE_URL}/register`;
  const requestBody = { username, password };
  
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

