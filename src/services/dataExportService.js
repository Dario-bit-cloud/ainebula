// Servizio per gestire l'esportazione dati

// Determina l'URL base dell'API in base all'ambiente
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/data';
    }
    
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    if (backendUrl) {
      return `${backendUrl}/api/data`;
    }
    
    return '/api/data';
  }
  return 'http://localhost:3001/api/data';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Crea una richiesta di esportazione dati
 */
export async function createDataExport() {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(`${API_BASE_URL}/export`, {
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
 * Scarica i dati esportati
 */
export async function downloadDataExport(exportToken) {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(`${API_BASE_URL}/export/${exportToken}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { success: false, message: error.message || 'Errore nel download' };
    }
    
    const data = await response.json();
    
    // Crea e scarica il file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nebula-ai-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: 'Errore nella comunicazione con il server',
      error: error.message
    };
  }
}










