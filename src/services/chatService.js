// Servizio per gestire le chat nel database

import { 
  encryptMessages, 
  decryptMessages, 
  getEncryptionKeyForUser 
} from './encryptionService.js';
import { getCurrentUser } from './authService.js';

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
 * Ottiene tutte le chat dell'utente dal database e le decrittografa
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
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'identity' // Disabilita compressione per evitare ERR_CONTENT_DECODING_FAILED
      }
    });
    
    console.log('📥 [CHAT SERVICE] Risposta ricevuta:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Errore sconosciuto');
      console.error('❌ [CHAT SERVICE] Risposta non OK:', errorText);
      return {
        success: false,
        message: `Errore server: ${response.status} ${response.statusText}`,
        error: errorText
      };
    }
    
    let data;
    let responseText;
    
    try {
      // Prova prima a leggere come JSON direttamente
      try {
        data = await response.json();
        console.log('✅ [CHAT SERVICE] Chat caricate (JSON diretto):', {
          success: data.success,
          count: data.chats?.length || 0
        });
      } catch (jsonError) {
        // Se fallisce, prova a leggere come testo e poi parsare
        console.log('⚠️ [CHAT SERVICE] Tentativo lettura come testo...');
        responseText = await response.text();
        console.log('📄 [CHAT SERVICE] Body risposta (raw):', responseText.substring(0, 200));
        data = JSON.parse(responseText);
        console.log('✅ [CHAT SERVICE] Chat caricate (parsing testo):', {
          success: data.success,
          count: data.chats?.length || 0
        });
      }
    } catch (readError) {
      console.error('❌ [CHAT SERVICE] Errore lettura risposta:', readError);
      // Se anche questo fallisce, prova a clonare la risposta
      try {
        const clonedResponse = response.clone();
        responseText = await clonedResponse.text();
        console.log('📄 [CHAT SERVICE] Body risposta (clonata):', responseText.substring(0, 200));
        data = JSON.parse(responseText);
      } catch (cloneError) {
        console.error('❌ [CHAT SERVICE] Errore anche con clone:', cloneError);
        return {
          success: false,
          message: 'Errore nella lettura della risposta del server',
          error: readError.message || cloneError.message,
          errorType: readError.name || cloneError.name
        };
      }
    }
    
    // Decrittografa i messaggi se la crittografia è disponibile
    if (data && data.success && data.chats && Array.isArray(data.chats)) {
      const user = getCurrentUser();
      if (user && user.id) {
        const encryptionKey = await getEncryptionKeyForUser(user.id);
        if (encryptionKey) {
          console.log('🔓 [CHAT SERVICE] Decrittografia messaggi...');
          for (const chat of data.chats) {
            if (chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0) {
              try {
                chat.messages = await decryptMessages(chat.messages, encryptionKey);
                console.log(`✅ [CHAT SERVICE] Decrittografati ${chat.messages.length} messaggi per chat ${chat.id}`);
              } catch (error) {
                console.error(`❌ [CHAT SERVICE] Errore decrittografia chat ${chat.id}:`, error);
                // Continua anche se la decrittografia fallisce (per retrocompatibilità)
              }
            }
          }
          console.log('🔓 [CHAT SERVICE] Decrittografia completata');
        } else {
          console.log('ℹ️ [CHAT SERVICE] Chiave di crittografia non disponibile, messaggi potrebbero essere in chiaro');
        }
      }
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
 * Salva una chat nel database dopo aver crittografato i messaggi
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
    
    // Prepara i messaggi per il salvataggio
    let messagesToSave = chat.messages || [];
    
    // Crittografa i messaggi se la crittografia è disponibile
    const user = getCurrentUser();
    if (user && user.id) {
      const encryptionKey = await getEncryptionKeyForUser(user.id);
      if (encryptionKey && messagesToSave.length > 0) {
        console.log('🔒 [CHAT SERVICE] Crittografia messaggi prima del salvataggio...');
        try {
          // Crittografa solo i messaggi che non sono già crittografati
          const messagesToEncrypt = [];
          const messageIndices = [];
          
          messagesToSave.forEach((msg, index) => {
            if (msg.content && 
                typeof msg.content === 'string' && 
                !msg.content.startsWith('encrypted:')) {
              messagesToEncrypt.push(msg);
              messageIndices.push(index);
            }
          });
          
          if (messagesToEncrypt.length > 0) {
            const encryptedMessages = await encryptMessages(messagesToEncrypt, encryptionKey);
            // Sostituisci i messaggi originali con quelli crittografati
            messageIndices.forEach((originalIndex, encryptedIndex) => {
              messagesToSave[originalIndex] = encryptedMessages[encryptedIndex];
            });
            console.log(`✅ [CHAT SERVICE] Crittografati ${encryptedMessages.length} messaggi`);
          } else {
            console.log('ℹ️ [CHAT SERVICE] Tutti i messaggi sono già crittografati');
          }
        } catch (error) {
          console.error('❌ [CHAT SERVICE] Errore crittografia messaggi:', error);
          // Continua comunque con il salvataggio (per retrocompatibilità)
        }
      } else {
        console.log('ℹ️ [CHAT SERVICE] Chiave di crittografia non disponibile, salvataggio in chiaro');
      }
    }
    
    // Non salvare chat temporanee nel database
    if (chat.isTemporary) {
      console.log('ℹ️ [CHAT SERVICE] Chat temporanea, non salvata nel database');
      return { success: true, message: 'Chat temporanea non salvata nel database' };
    }
    
    const requestBody = {
      id: chat.id,
      title: chat.title,
      messages: messagesToSave,
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

/**
 * Elimina tutte le chat dell'utente dal database
 */
export async function deleteAllChatsFromDatabase() {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(API_BASE_URL, {
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

