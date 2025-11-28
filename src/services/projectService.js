// Servizio per gestire i progetti nel database

import { getCurrentUser } from './authService.js';

// Determina l'URL base dell'API in base all'ambiente
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Se siamo su localhost, usa localhost:3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/projects';
    }
    
    // In produzione, controlla se c'è una variabile d'ambiente per il backend
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (backendUrl) {
      return `${backendUrl}/api/projects`;
    }
    
    // Altrimenti, per Vercel, usa URL relativo
    return '/api/projects';
  }
  return 'http://localhost:3001/api/projects';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 [PROJECT SERVICE] API Base URL configurato:', API_BASE_URL);

/**
 * Ottiene tutti i progetti dell'utente dal database
 */
export async function getProjectsFromDatabase() {
  const url = API_BASE_URL;
  
  console.log('📁 [PROJECT SERVICE] Caricamento progetti dal database:', {
    url,
    timestamp: new Date().toISOString()
  });
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.warn('⚠️ [PROJECT SERVICE] Nessun token trovato');
      return { success: false, message: 'Non autenticato' };
    }
    
    console.log('📤 [PROJECT SERVICE] Invio richiesta GET:', { url });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 [PROJECT SERVICE] Risposta ricevuta:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    let data;
    const responseText = await response.text();
    console.log('📄 [PROJECT SERVICE] Body risposta (raw):', responseText.substring(0, 200));
    
    try {
      data = JSON.parse(responseText);
      console.log('✅ [PROJECT SERVICE] Progetti caricati:', {
        success: data.success,
        count: data.projects?.length || 0
      });
    } catch (parseError) {
      console.error('❌ [PROJECT SERVICE] Errore parsing JSON:', parseError);
      return {
        success: false,
        message: 'Errore nel formato della risposta del server',
        error: `Errore parsing: ${parseError.message}`,
        rawResponse: responseText
      };
    }
    
    return data;
  } catch (error) {
    console.error('❌ [PROJECT SERVICE] Errore durante la richiesta:', {
      name: error.name,
      message: error.message,
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
 * Salva un progetto nel database
 */
export async function saveProjectToDatabase(project) {
  const url = API_BASE_URL;
  
  console.log('💾 [PROJECT SERVICE] Salvataggio progetto:', {
    url,
    projectId: project.id,
    name: project.name,
    timestamp: new Date().toISOString()
  });
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.warn('⚠️ [PROJECT SERVICE] Nessun token trovato per salvare progetto');
      return { success: false, message: 'Non autenticato' };
    }
    
    const requestBody = {
      id: project.id,
      name: project.name,
      description: project.description || null,
      color: project.color || null,
      icon: project.icon || null
    };
    
    console.log('📤 [PROJECT SERVICE] Invio richiesta POST:', {
      url,
      projectId: project.id
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 [PROJECT SERVICE] Risposta salvataggio:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    let data;
    const responseText = await response.text();
    
    try {
      data = JSON.parse(responseText);
      if (data.success) {
        console.log('✅ [PROJECT SERVICE] Progetto salvato con successo:', project.id);
      } else {
        console.warn('⚠️ [PROJECT SERVICE] Salvataggio fallito:', data);
      }
    } catch (parseError) {
      console.error('❌ [PROJECT SERVICE] Errore parsing risposta:', parseError);
      return {
        success: false,
        message: 'Errore nel formato della risposta del server',
        error: `Errore parsing: ${parseError.message}`,
        rawResponse: responseText
      };
    }
    
    return data;
  } catch (error) {
    console.error('❌ [PROJECT SERVICE] Errore durante il salvataggio:', {
      name: error.name,
      message: error.message,
      projectId: project.id,
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
 * Aggiorna un progetto nel database
 */
export async function updateProjectInDatabase(projectId, updates) {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(`${API_BASE_URL}/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
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
 * Elimina un progetto dal database
 */
export async function deleteProjectFromDatabase(projectId) {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(`${API_BASE_URL}/${projectId}`, {
      method: 'DELETE',
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






