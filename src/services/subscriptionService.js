// Servizio per gestire gli abbonamenti

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
 * Ottiene l'abbonamento corrente dell'utente
 */
export async function getSubscription() {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/user/subscription`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore durante il recupero dell\'abbonamento:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Salva o aggiorna l'abbonamento dell'utente
 */
export async function saveSubscription(subscriptionData) {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/user/subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionData)
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore durante il salvataggio dell\'abbonamento:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}

/**
 * Cancella l'abbonamento dell'utente
 */
export async function cancelSubscription(subscriptionId) {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return {
      success: false,
      message: 'Nessun token di autenticazione trovato'
    };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/user/subscription/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Errore durante la cancellazione dell\'abbonamento:', error);
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}


