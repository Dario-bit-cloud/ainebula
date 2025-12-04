// Servizio per interagire con il database tramite API

// Determina l'URL base dell'API in base all'ambiente
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Se siamo su localhost, usa localhost:3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/db';
    }
    
    // In produzione, controlla se c'è una variabile d'ambiente per il backend
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (backendUrl) {
      return `${backendUrl}/api/db`;
    }
    
    // Altrimenti, per Vercel, usa URL relativo
    return '/api/db';
  }
  return 'http://localhost:3001/api/db';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Testa la connessione al database
 */
export async function testDatabaseConnection() {
  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/test`);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Errore nella comunicazione con il server API',
      error: error.message
    };
  }
}

/**
 * Ottiene informazioni sul database
 */
export async function getDatabaseInfo() {
  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/info`);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Errore nella comunicazione con il server API',
      error: error.message
    };
  }
}

/**
 * Esegue una query SELECT
 */
export async function executeQuery(query) {
  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Errore nella comunicazione con il server API',
      error: error.message
    };
  }
}

