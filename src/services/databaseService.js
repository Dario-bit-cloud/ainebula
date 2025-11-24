// Servizio per interagire con il database tramite API

const API_BASE_URL = 'http://localhost:3001/api/db';

/**
 * Testa la connessione al database
 */
export async function testDatabaseConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/test`);
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
    const response = await fetch(`${API_BASE_URL}/info`);
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
    const response = await fetch(`${API_BASE_URL}/query`, {
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

