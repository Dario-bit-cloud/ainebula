// Servizio per gestire le chat nel database

// Determina l'URL base dell'API in base all'ambiente
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Se siamo su localhost, usa localhost:3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/chat';
    }
    
    // In produzione, controlla se c'è una variabile d'ambiente per il backend
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (backendUrl) {
      return `${backendUrl}/api/chat`;
    }
    
    // Altrimenti, per Vercel, usa URL relativo
    return '/api/chat';
  }
  return 'http://localhost:3001/api/chat';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 [CHAT SERVICE] API Base URL configurato:', API_BASE_URL);

/**
 * Ottiene tutte le chat dell'utente dal database
 */
export async function getChatsFromDatabase() {
  const url = API_BASE_URL;
  
  console.log('💬 [CHAT SERVICE] Caricamento chat dal database:', {
    url,
    timestamp: new Date().toISOString()
  });
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.warn('⚠️ [CHAT SERVICE] Nessun token trovato');
      return { success: false, message: 'Non autenticato' };
    }
    
    console.log('📤 [CHAT SERVICE] Invio richiesta GET:', { url });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 [CHAT SERVICE] Risposta ricevuta:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    let data;
    const responseText = await response.text();
    console.log('📄 [CHAT SERVICE] Body risposta (raw):', responseText.substring(0, 200));
    
    try {
      data = JSON.parse(responseText);
      console.log('✅ [CHAT SERVICE] Chat caricate:', {
        success: data.success,
        count: data.chats?.length || 0
      });
    } catch (parseError) {
      console.error('❌ [CHAT SERVICE] Errore parsing JSON:', parseError);
      return {
        success: false,
        message: 'Errore nel formato della risposta del server',
        error: `Errore parsing: ${parseError.message}`,
        rawResponse: responseText
      };
    }
    
    return data;
  } catch (error) {
    console.error('❌ [CHAT SERVICE] Errore durante la richiesta:', {
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
 * Salva una chat nel database
 */
export async function saveChatToDatabase(chat) {
  const url = API_BASE_URL;
  
  console.log('💾 [CHAT SERVICE] Salvataggio chat:', {
    url,
    chatId: chat.id,
    title: chat.title,
    messagesCount: chat.messages?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.warn('⚠️ [CHAT SERVICE] Nessun token trovato per salvare chat');
      return { success: false, message: 'Non autenticato' };
    }
    
    const requestBody = {
      id: chat.id,
      title: chat.title,
      messages: chat.messages || [],
      projectId: chat.projectId || null,
      isTemporary: false
    };
    
    console.log('📤 [CHAT SERVICE] Invio richiesta POST:', {
      url,
      chatId: chat.id,
      messagesCount: requestBody.messages.length
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 [CHAT SERVICE] Risposta salvataggio:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    let data;
    const responseText = await response.text();
    
    try {
      data = JSON.parse(responseText);
      if (data.success) {
        console.log('✅ [CHAT SERVICE] Chat salvata con successo:', chat.id);
      } else {
        console.warn('⚠️ [CHAT SERVICE] Salvataggio fallito:', data);
      }
    } catch (parseError) {
      console.error('❌ [CHAT SERVICE] Errore parsing risposta:', parseError);
      return {
        success: false,
        message: 'Errore nel formato della risposta del server',
        error: `Errore parsing: ${parseError.message}`,
        rawResponse: responseText
      };
    }
    
    return data;
  } catch (error) {
    console.error('❌ [CHAT SERVICE] Errore durante il salvataggio:', {
      name: error.name,
      message: error.message,
      chatId: chat.id,
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
 * Elimina una chat dal database
 */
export async function deleteChatFromDatabase(chatId) {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(`${API_BASE_URL}/${chatId}`, {
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

/**
 * Aggiorna una chat nel database
 */
export async function updateChatInDatabase(chatId, updates) {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(`${API_BASE_URL}/${chatId}`, {
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

