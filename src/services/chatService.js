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
import { log, logWarn, logError } from '../utils/logger.js';
import { getCachedData, invalidateCache } from '../utils/apiCache.js';

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

// Log solo quando necessario (non a livello di modulo per evitare problemi di bundling)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    log('🔧 [CHAT SERVICE] API Base URL configurato:', API_BASE_URL);
  }, 0);
}

/**
 * Decrittografa le chat in batch usando requestIdleCallback per non bloccare l'UI
 * Decrittografa solo i metadati (titolo), non i messaggi (lazy loading)
 */
async function batchDecryptChats(chats, encryptionKey, userId) {
  // Su mobile, usa setTimeout per batchizzare meglio
  const useIdleCallback = typeof requestIdleCallback !== 'undefined' && !/mobile|android|iphone|ipad|ipod/i.test(navigator.userAgent);
  
  const decryptedChats = [];
  const batchSize = 3; // Decrittografa 3 chat alla volta per non bloccare
  
  for (let i = 0; i < chats.length; i += batchSize) {
    const batch = chats.slice(i, i + batchSize);
    
    // Decrittografa il batch
    const batchPromises = batch.map(async (chat) => {
      // Controlla se ci sono dati crittografati (solo titolo, non messaggi)
      const hasEncryptedTitle = chat.title && typeof chat.title === 'string' && chat.title.startsWith('encrypted:');
      
      if (hasEncryptedTitle) {
        try {
          // Decrittografa solo il titolo, non i messaggi
          const { decryptChatMetadata } = await import('./encryptionService.js');
          const decrypted = await decryptChatMetadata(chat, encryptionKey);
          // Mantieni i messaggi crittografati per decrittografia lazy
          return {
            ...decrypted,
            messages: chat.messages // Mantieni messaggi crittografati
          };
        } catch (error) {
          logWarn(`⚠️ [CHAT SERVICE] Decrittografia titolo fallita per chat ${chat.id}, provo con chiave di recupero`);
          try {
            const recoveryKeys = JSON.parse(localStorage.getItem('recovery_keys') || '{}');
            const recoveryKey = recoveryKeys[userId];
            if (recoveryKey) {
              const { getCachedPassword, decryptRecoveryKey, decryptChatMetadata } = await import('./encryptionService.js');
              const currentPassword = getCachedPassword(userId);
              if (currentPassword) {
                const oldKey = await decryptRecoveryKey(recoveryKey, currentPassword, userId);
                const decrypted = await decryptChatMetadata(chat, oldKey);
                return {
                  ...decrypted,
                  messages: chat.messages
                };
              }
            }
          } catch (recoveryError) {
            logError('❌ [CHAT SERVICE] Errore decrittografia con chiave di recupero:', recoveryError);
          }
          return chat;
        }
      }
      return chat;
    });
    
    const batchResults = await Promise.all(batchPromises);
    decryptedChats.push(...batchResults);
    
    // Su mobile, usa setTimeout per dare respiro al browser
    if (!useIdleCallback && i + batchSize < chats.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    } else if (useIdleCallback) {
      // Su desktop, usa requestIdleCallback se disponibile
      await new Promise(resolve => {
        requestIdleCallback(() => resolve(), { timeout: 100 });
      });
    }
  }
  
  return decryptedChats;
}

/**
 * Ottiene tutte le chat dell'utente dal database e le decrittografa
 * Usa cache per evitare richieste duplicate
 */
export async function getChatsFromDatabase() {
  const url = API_BASE_URL;
  const cacheKey = 'chats_list';
  
  // Usa cache con TTL di 30 secondi per le chat
  return getCachedData(cacheKey, async () => {
    log('💬 [CHAT SERVICE] Caricamento chat dal database:', {
      url,
      timestamp: new Date().toISOString()
    });
    
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        logWarn('⚠️ [CHAT SERVICE] Nessun token trovato');
        return { success: false, message: 'Non autenticato' };
      }
      
      log('📤 [CHAT SERVICE] Invio richiesta GET:', { url });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'identity' // Disabilita compressione per evitare ERR_CONTENT_DECODING_FAILED
        }
      });
    
    log('📥 [CHAT SERVICE] Risposta ricevuta:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
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
        log('✅ [CHAT SERVICE] Chat caricate (JSON diretto):', {
          success: data.success,
          count: data.chats?.length || 0
        });
      } catch (jsonError) {
        // Se fallisce, prova a leggere come testo e poi parsare
        logWarn('⚠️ [CHAT SERVICE] Tentativo lettura come testo...');
        responseText = await response.text();
        log('📄 [CHAT SERVICE] Body risposta (raw):', responseText.substring(0, 200));
        data = JSON.parse(responseText);
        log('✅ [CHAT SERVICE] Chat caricate (parsing testo):', {
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
        log('📄 [CHAT SERVICE] Body risposta (clonata):', responseText.substring(0, 200));
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
    
    // Decrittografia LAZY e BATCHIZZATA per performance mobile
    // Non decrittografare tutte le chat subito, ma solo quando necessario
    if (data && data.success && data.chats && Array.isArray(data.chats)) {
      const user = getCurrentUser();
      if (user && user.id) {
        // Ottieni la password dalla cache
        log(`🔍 [CHAT SERVICE] Ricerca password per utente ${user.id}...`);
        const password = getCachedPassword(user.id);
        if (password) {
          log(`✅ [CHAT SERVICE] Password trovata per utente ${user.id}`);
          const encryptionKey = await getEncryptionKeyForUser(user.id, password);
          if (encryptionKey) {
            log('🔓 [CHAT SERVICE] Decrittografia lazy e batchizzata delle chat...');
            try {
              // Decrittografa solo i titoli e metadati (non i messaggi) per performance
              // I messaggi verranno decrittografati lazy quando la chat viene aperta
              const decryptedChats = await batchDecryptChats(data.chats, encryptionKey, user.id);
              
              // Sostituisci le chat con quelle decrittografate
              data.chats = decryptedChats;
              log(`✅ [CHAT SERVICE] Decrittografati metadati di ${data.chats.length} chat`);
            } catch (error) {
              logError('❌ [CHAT SERVICE] Errore durante decrittografia messaggi:', error);
              // In caso di errore, mantieni le chat originali (potrebbero essere in chiaro)
            }
          } else {
            log('ℹ️ [CHAT SERVICE] Chiave di crittografia non disponibile, messaggi potrebbero essere in chiaro');
          }
        } else {
          logWarn(`⚠️ [CHAT SERVICE] Password non in cache per utente ${user.id}, messaggi rimangono crittografati`);
          log('💡 [CHAT SERVICE] Suggerimento: fai logout e login per ripristinare la password in cache');
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
  }, 30000); // Cache per 30 secondi
}

/**
 * Invalida la cache delle chat (da chiamare dopo salvataggio/eliminazione)
 */
export function invalidateChatsCache() {
  invalidateCache('chats_list');
}

/**
 * Carica i messaggi di una singola chat dal database (lazy loading)
 * Usa cache per evitare richieste duplicate
 */
export async function getChatMessagesFromDatabase(chatId) {
  const url = `${API_BASE_URL}/${chatId}`;
  const cacheKey = `chat_messages_${chatId}`;
  
  // Usa cache con TTL di 60 secondi per i messaggi
  return getCachedData(cacheKey, async () => {
    log('💬 [CHAT SERVICE] Caricamento messaggi chat:', {
      url,
      chatId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        logWarn('⚠️ [CHAT SERVICE] Nessun token trovato');
        return { success: false, message: 'Non autenticato' };
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Errore sconosciuto');
        return {
          success: false,
          message: `Errore server: ${response.status} ${response.statusText}`,
          error: errorText
        };
      }
      
      const data = await response.json();
      
      // Decrittografa i messaggi se necessario
      if (data && data.success && data.messages && Array.isArray(data.messages)) {
        const user = getCurrentUser();
        if (user && user.id) {
          const password = getCachedPassword(user.id);
          if (password) {
            const encryptionKey = await getEncryptionKeyForUser(user.id, password);
            if (encryptionKey) {
              try {
                const { decryptMessages } = await import('./encryptionService.js');
                const decryptedMessages = await decryptMessages(data.messages, encryptionKey);
                data.messages = decryptedMessages;
                log(`✅ [CHAT SERVICE] Decrittografati ${data.messages.length} messaggi`);
              } catch (error) {
                logError('❌ [CHAT SERVICE] Errore durante decrittografia messaggi:', error);
              }
            }
          }
        }
      }
      
      return data;
    } catch (error) {
      logError('❌ [CHAT SERVICE] Errore durante caricamento messaggi:', {
        name: error.name,
        message: error.message,
        chatId,
        url
      });
      
      return {
        success: false,
        message: 'Errore nella comunicazione con il server',
        error: error.message
      };
    }
  }, 60000); // Cache per 60 secondi
}

/**
 * Invalida la cache dei messaggi di una chat (da chiamare dopo salvataggio)
 */
export function invalidateChatMessagesCache(chatId) {
  invalidateCache(`chat_messages_${chatId}`);
}

/**
 * Salva una chat nel database dopo aver crittografato i messaggi
 */
export async function saveChatToDatabase(chat) {
  const url = API_BASE_URL;
  
  log('💾 [CHAT SERVICE] Salvataggio chat:', {
    url,
    chatId: chat.id,
    title: chat.title,
    messagesCount: chat.messages?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      logWarn('⚠️ [CHAT SERVICE] Nessun token trovato per salvare chat');
      return { success: false, message: 'Non autenticato' };
    }
    
    // Prepara i messaggi per il salvataggio
    let messagesToSave = chat.messages || [];
    
    // Crittografa i messaggi e i metadati se la crittografia è disponibile
    const user = getCurrentUser();
    if (user && user.id) {
      log(`🔍 [CHAT SERVICE] Ricerca password per crittografia, utente ${user.id}...`);
      const password = getCachedPassword(user.id);
      if (password) {
        log(`✅ [CHAT SERVICE] Password trovata per crittografia, utente ${user.id}`);
        const encryptionKey = await getEncryptionKeyForUser(user.id, password);
        if (encryptionKey) {
          log('🔒 [CHAT SERVICE] Crittografia messaggi e metadati prima del salvataggio...');
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
            
            log(`✅ [CHAT SERVICE] Crittografati messaggi e metadati della chat`);
          } catch (error) {
            logError('❌ [CHAT SERVICE] Errore crittografia messaggi:', error);
            // Continua comunque con il salvataggio (per retrocompatibilità)
          }
        } else {
          log('ℹ️ [CHAT SERVICE] Chiave di crittografia non disponibile, salvataggio in chiaro');
        }
      } else {
        logWarn(`⚠️ [CHAT SERVICE] Password non in cache per utente ${user.id}, salvataggio in chiaro`);
        log('💡 [CHAT SERVICE] Suggerimento: fai logout e login per ripristinare la password in cache');
      }
    }
    
    // Non salvare chat temporanee nel database
    if (chat.isTemporary) {
      log('ℹ️ [CHAT SERVICE] Chat temporanea, non salvata nel database');
      return { success: true, message: 'Chat temporanea non salvata nel database' };
    }
    
    const requestBody = {
      id: chat.id,
      title: chat.title,
      messages: messagesToSave,
      projectId: chat.projectId || null,
      isTemporary: false
    };
    
    log('📤 [CHAT SERVICE] Invio richiesta POST:', {
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
    
    log('📥 [CHAT SERVICE] Risposta salvataggio:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    let data;
    const responseText = await response.text();
    
    try {
      data = JSON.parse(responseText);
      if (data.success) {
        log('✅ [CHAT SERVICE] Chat salvata con successo:', chat.id);
        // Invalida la cache dopo il salvataggio
        invalidateChatsCache();
        invalidateChatMessagesCache(chat.id);
      } else {
        logWarn('⚠️ [CHAT SERVICE] Salvataggio fallito:', data);
      }
    } catch (parseError) {
      logError('❌ [CHAT SERVICE] Errore parsing risposta:', parseError);
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
  log('🗑️ [CHAT SERVICE] Eliminazione chat dal database:', {
    chatId,
    timestamp: new Date().toISOString()
  });
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      logWarn('⚠️ [CHAT SERVICE] Nessun token trovato per eliminare chat');
      return { success: false, message: 'Non autenticato' };
    }
    
    const response = await fetch(`${API_BASE_URL}/${chatId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    log('📥 [CHAT SERVICE] Risposta eliminazione:', {
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
      log('✅ [CHAT SERVICE] Chat eliminata con successo:', chatId);
      // Invalida la cache dopo l'eliminazione
      invalidateChatsCache();
      invalidateChatMessagesCache(chatId);
    } else {
      logWarn('⚠️ [CHAT SERVICE] Eliminazione fallita:', data);
    }
    
    return data;
  } catch (error) {
    logError('❌ [CHAT SERVICE] Errore durante eliminazione chat:', {
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

