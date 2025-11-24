// Servizio per gestire le chat nel database

const API_BASE_URL = 'http://localhost:3001/api/chat';

/**
 * Ottiene tutte le chat dell'utente dal database
 */
export async function getChatsFromDatabase() {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(`${API_BASE_URL}`, {
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

/**
 * Salva una chat nel database
 */
export async function saveChatToDatabase(chat) {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: chat.id,
        title: chat.title,
        messages: chat.messages || [],
        projectId: chat.projectId || null,
        isTemporary: chat.isTemporary || false
      })
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

