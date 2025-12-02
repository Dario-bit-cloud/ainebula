// Servizio per gestire le chat nel database

import { 
  encryptMessages, 
  decryptMessages, 
  decryptChatMetadata,
  encryptChatMetadata,
  getEncryptionKeyForUser,
  getCachedPassword,
  decryptRecoveryKey
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
    
    // Decrittografa i messaggi quando vengono caricati dal database
    if (data && data.success && data.chats && Array.isArray(data.chats)) {
      const user = getCurrentUser();
      if (user && user.id) {
        // Ottieni la password dalla cache
        console.log(`🔍 [CHAT SERVICE] Ricerca password per utente ${user.id}...`);
        const password = getCachedPassword(user.id);
        if (password) {
          console.log(`✅ [CHAT SERVICE] Password trovata per utente ${user.id}`);
          const encryptionKey = await getEncryptionKeyForUser(user.id, password);
          if (encryptionKey) {
            console.log('🔓 [CHAT SERVICE] Decrittografia messaggi e metadati delle chat...');
            try {
              // Decrittografa tutti i messaggi e metadati di tutte le chat
              const decryptedChats = await Promise.all(
                data.chats.map(async (chat) => {
                  // Controlla se ci sono dati crittografati (messaggi o titolo)
                  const hasEncryptedData = 
                    (chat.messages && Array.isArray(chat.messages) && chat.messages.some(msg => 
                      msg.content && typeof msg.content === 'string' && msg.content.startsWith('encrypted:')
                    )) ||
                    (chat.title && typeof chat.title === 'string' && chat.title.startsWith('encrypted:'));
                  
                  if (hasEncryptedData) {
                    try {
                      // Prova prima con la chiave corrente
                      return await decryptChatMetadata(chat, encryptionKey);
                    } catch (error) {
                      // Se fallisce, prova con la chiave di recupero (per messaggi vecchi)
                      console.log(`⚠️ [CHAT SERVICE] Decrittografia fallita, provo con chiave di recupero per chat ${chat.id}`);
                      try {
                        const recoveryKeys = JSON.parse(localStorage.getItem('recovery_keys') || '{}');
                        const recoveryKey = recoveryKeys[user.id];
                        if (recoveryKey) {
                          const currentPassword = getCachedPassword(user.id);
                          if (currentPassword) {
                            const oldKey = await decryptRecoveryKey(recoveryKey, currentPassword, user.id);
                            return await decryptChatMetadata(chat, oldKey);
                          }
                        }
                      } catch (recoveryError) {
                        console.error('❌ [CHAT SERVICE] Errore decrittografia con chiave di recupero:', recoveryError);
                      }
                      // Se anche la chiave di recupero fallisce, restituisci la chat originale
                      return chat;
                    }
                  }
                  return chat;
                })
              );
              
              // Sostituisci le chat con quelle decrittografate
              data.chats = decryptedChats;
              console.log(`✅ [CHAT SERVICE] Decrittografate ${data.chats.length} chat`);
            } catch (error) {
              console.error('❌ [CHAT SERVICE] Errore durante decrittografia messaggi:', error);
              // In caso di errore, mantieni le chat originali (potrebbero essere in chiaro)
            }
          } else {
            console.log('ℹ️ [CHAT SERVICE] Chiave di crittografia non disponibile, messaggi potrebbero essere in chiaro');
          }
        } else {
          console.log(`⚠️ [CHAT SERVICE] Password non in cache per utente ${user.id}, messaggi rimangono crittografati`);
          console.log(`💡 [CHAT SERVICE] Suggerimento: fai logout e login per ripristinare la password in cache`);
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
    
    // Crittografa i messaggi e i metadati se la crittografia è disponibile
    const user = getCurrentUser();
    if (user && user.id) {
      console.log(`🔍 [CHAT SERVICE] Ricerca password per crittografia, utente ${user.id}...`);
      const password = getCachedPassword(user.id);
      if (password) {
        console.log(`✅ [CHAT SERVICE] Password trovata per crittografia, utente ${user.id}`);
        const encryptionKey = await getEncryptionKeyForUser(user.id, password);
        if (encryptionKey) {
          console.log('🔒 [CHAT SERVICE] Crittografia messaggi e metadati prima del salvataggio...');
          try {
            // Crittografa sia i metadati (titolo) che i messaggi
            const chatToEncrypt = {
              ...chat,
              messages: messagesToSave
            };
            
            const encryptedChat = await encryptChatMetadata(chatToEncrypt, encryptionKey);
            
            // Aggiorna i messaggi e il titolo con quelli crittografati
            messagesToSave = encryptedChat.messages || messagesToSave;
            if (encryptedChat.title) {
              chat.title = encryptedChat.title;
            }
            
            console.log(`✅ [CHAT SERVICE] Crittografati messaggi e metadati della chat`);
          } catch (error) {
            console.error('❌ [CHAT SERVICE] Errore crittografia messaggi:', error);
            // Continua comunque con il salvataggio (per retrocompatibilità)
          }
        } else {
          console.log('ℹ️ [CHAT SERVICE] Chiave di crittografia non disponibile, salvataggio in chiaro');
        }
      } else {
        console.log(`⚠️ [CHAT SERVICE] Password non in cache per utente ${user.id}, salvataggio in chiaro`);
        console.log(`💡 [CHAT SERVICE] Suggerimento: fai logout e login per ripristinare la password in cache`);
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
  console.log('🗑️ [CHAT SERVICE] Eliminazione chat dal database:', {
    chatId,
    timestamp: new Date().toISOString()
  });
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.warn('⚠️ [CHAT SERVICE] Nessun token trovato per eliminare chat');
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(`${API_BASE_URL}/${chatId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 [CHAT SERVICE] Risposta eliminazione:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Errore sconosciuto');
      console.error('❌ [CHAT SERVICE] Risposta non OK:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      return {
        success: false,
        message: errorData.message || `Errore server: ${response.status} ${response.statusText}`,
        error: errorText
      };
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ [CHAT SERVICE] Chat eliminata con successo:', chatId);
    } else {
      console.warn('⚠️ [CHAT SERVICE] Eliminazione fallita:', data);
    }
    
    return data;
  } catch (error) {
    console.error('❌ [CHAT SERVICE] Errore durante eliminazione chat:', {
      name: error.name,
      message: error.message,
      chatId,
      timestamp: new Date().toISOString()
    });
    
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

