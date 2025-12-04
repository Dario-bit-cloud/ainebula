import { writable, derived, get } from 'svelte/store';
import { isAuthenticatedStore } from './auth.js';
import { isIncognitoMode } from './app.js';
import { getChatsFromDatabase, saveChatToDatabase, deleteChatFromDatabase, updateChatInDatabase } from '../services/chatService.js';
import { debounce } from '../utils/performance.js';
import { log, logWarn, logError } from '../utils/logger.js';

// Store per le chat
export const chats = writable([]);
export const currentChatId = writable(null);
export const isGenerating = writable(false);

// Chat corrente derivata
export const currentChat = derived(
  [chats, currentChatId],
  ([$chats, $currentChatId]) => {
    return $chats.find(chat => chat.id === $currentChatId) || null;
  }
);

// Funzioni helper
export async function createNewChat(projectId = null) {
  const allChats = get(chats);
  const currentId = get(currentChatId);
  
  // Elimina automaticamente le chat "Nuova chat" vuote prima di crearne una nuova
  // Non eliminare la chat corrente se è "Nuova chat" (potrebbe essere quella in uso)
  const emptyNewChats = allChats.filter(chat => {
    // Seleziona solo chat con titolo "Nuova chat"
    if (chat.title !== 'Nuova chat') return false;
    
    // Non eliminare la chat corrente
    if (chat.id === currentId) return false;
    
    // Elimina solo chat vuote (senza messaggi o con solo messaggi nascosti/vuoti)
    const hasVisibleMessages = chat.messages && 
                              chat.messages.length > 0 && 
                              chat.messages.some(msg => !msg.hidden && msg.content && msg.content.trim().length > 0);
    
    return !hasVisibleMessages;
  });
  
  // Elimina le chat "Nuova chat" vuote
  for (const chatToDelete of emptyNewChats) {
    await deleteChat(chatToDelete.id);
  }
  
  const incognito = get(isIncognitoMode);
  
  const newChat = {
    id: Date.now().toString(),
    title: 'Nuova chat',
    messages: [],
    projectId: projectId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  chats.update(allChats => [newChat, ...allChats]);
  currentChatId.set(newChat.id);
  
  // Salva nel database solo se autenticato E non è in modalità incognito
  if (!incognito) {
    const isAuthenticated = get(isAuthenticatedStore);
    const token = localStorage.getItem('auth_token');
    
    if (isAuthenticated && token) {
      // Per nuove chat, salva immediatamente (non debounce)
      try {
        await saveChatToDatabase(newChat);
      } catch (error) {
        logError('❌ [CHAT STORE] Errore durante salvataggio nuova chat:', error);
      }
    } else {
      // Se non autenticato, la chat rimane solo in memoria (temporanea)
      log('ℹ️ [CHAT STORE] Utente non autenticato, chat temporanea non salvata');
    }
  }
  // Le chat temporanee rimangono solo in memoria
  
  return newChat.id;
}

export async function moveChatToProject(chatId, projectId) {
  chats.update(allChats => 
    allChats.map(chat => 
      chat.id === chatId 
        ? { ...chat, projectId, updatedAt: new Date().toISOString() }
        : chat
    )
  );
  
  const allChats = get(chats);
  const chat = allChats.find(c => c.id === chatId);
  if (chat) {
    // Usa debounce per salvataggi automatici
    debouncedSaveChat(chat);
  }
}

export function removeChatFromProject(chatId) {
  moveChatToProject(chatId, null);
}

export async function addMessage(chatId, message) {
  chats.update(allChats => {
    return allChats.map(chat => {
      if (chat.id === chatId) {
        const updatedChat = {
          ...chat,
          messages: [...chat.messages, message],
          updatedAt: new Date().toISOString()
        };
        
        // Aggiorna il titolo se è la prima domanda
        if (chat.messages.length === 0 && message.type === 'user') {
          updatedChat.title = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
        }
        
        return updatedChat;
      }
      return chat;
    });
  });
  
  // Salva solo se ha almeno un messaggio visibile
  const allChats = get(chats);
  const chat = allChats.find(c => c.id === chatId);
  if (chat && chat.messages && chat.messages.length > 0 && chat.messages.some(msg => !msg.hidden)) {
    // Usa debounce per salvataggi automatici
    debouncedSaveChat(chat);
  }
}

// Flag per prevenire eliminazioni multiple simultanee
const deletingChats = new Set();

export async function deleteChat(chatId) {
  if (!chatId) return;
  
  // Prevenire eliminazioni multiple simultanee della stessa chat
  if (deletingChats.has(chatId)) {
    logWarn(`⚠️ [CHAT STORE] Eliminazione chat ${chatId} già in corso, skip`);
    return;
  }
  
  // Prevenire eliminazioni multiple rapide (debounce)
  const allChats = get(chats);
  const chat = allChats.find(c => c.id === chatId);
  if (!chat) return;
  
  // Aggiungi alla lista delle eliminazioni in corso
  deletingChats.add(chatId);
  
  const incognito = get(isIncognitoMode);
  const currentId = get(currentChatId);
  const wasCurrentChat = currentId === chatId;
  
  // Importa il servizio toast per il feedback
  const { showSuccess, showError } = await import('../services/toastService.js');
  
  // Elimina dal database PRIMA di rimuovere dallo store (per permettere rollback)
  if (!incognito && get(isAuthenticatedStore)) {
    try {
      const result = await deleteChatFromDatabase(chatId);
      
      if (!result.success) {
        // Se l'eliminazione dal database fallisce, non rimuovere dallo store
        logError('Errore durante eliminazione chat dal database:', result.message || result.error);
        showError(result.message || 'Errore durante l\'eliminazione della chat');
        deletingChats.delete(chatId); // Rimuovi dalla lista delle eliminazioni in corso
        return;
      }
    } catch (error) {
      // Se c'è un errore di rete o altro, non rimuovere dallo store
      logError('Errore durante eliminazione chat dal database:', error);
      showError('Errore di connessione durante l\'eliminazione della chat');
      deletingChats.delete(chatId); // Rimuovi dalla lista delle eliminazioni in corso
      return;
    }
  }
  
  // Rimuovi la chat dallo store solo se l'eliminazione dal database è riuscita
  // (o se è in modalità incognito/non autenticato)
  chats.update(allChats => allChats.filter(c => c.id !== chatId));
  
  // Le chat non sono più salvate in localStorage, quindi non serve rimuoverle
  
  // Se era la chat corrente, gestisci la transizione
  if (wasCurrentChat) {
    const remainingChats = get(chats);
    
    // Se ci sono altre chat, carica la prima disponibile
    if (remainingChats.length > 0) {
      await loadChat(remainingChats[0].id);
    } else {
      // Altrimenti, crea una nuova chat
      currentChatId.set(null);
      await createNewChat();
    }
  }
  
  // Mostra feedback di successo
  showSuccess('Chat eliminata con successo');
  
  // Rimuovi dalla lista delle eliminazioni in corso
  deletingChats.delete(chatId);
}

export async function loadChat(chatId) {
  currentChatId.set(chatId);
  
  // Lazy decryption: decrittografa i messaggi della chat quando viene aperta
  const allChats = get(chats);
  const chat = allChats.find(c => c.id === chatId);
  
  if (chat && chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0) {
    // Controlla se i messaggi sono crittografati (hanno il prefisso "encrypted:")
    const hasEncryptedMessages = chat.messages.some(msg => 
      msg.content && typeof msg.content === 'string' && msg.content.startsWith('encrypted:')
    );
    
    if (hasEncryptedMessages) {
      // Decrittografa solo questa chat (lazy decryption)
      const { getCurrentUser } = await import('../services/authService.js');
      const { getEncryptionKeyForUser } = await import('../services/encryptionService.js');
      const { decryptMessages } = await import('../services/encryptionService.js');
      
      const user = getCurrentUser();
      if (user && user.id) {
        const { getCachedPassword } = await import('../services/encryptionService.js');
        const password = getCachedPassword(user.id);
        if (password) {
          const encryptionKey = await getEncryptionKeyForUser(user.id, password);
          if (encryptionKey) {
            try {
              const { decryptChatMetadata } = await import('../services/encryptionService.js');
              const decryptedChat = await decryptChatMetadata(chat, encryptionKey);
              // Aggiorna la chat con i messaggi e metadati decrittografati
              chats.update(allChats => 
                allChats.map(c => 
                  c.id === chatId 
                    ? decryptedChat
                    : c
                )
              );
            } catch (error) {
              logError(`Errore decrittografia chat ${chatId}:`, error);
            }
          }
        }
      }
    }
  }
}

// Aggiorna un messaggio specifico
export async function updateMessage(chatId, messageIndex, updates, skipSave = false) {
  chats.update(allChats => {
    return allChats.map(chat => {
      if (chat.id === chatId) {
        const updatedMessages = [...chat.messages];
        if (updatedMessages[messageIndex]) {
          updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates };
        }
        return {
          ...chat,
          messages: updatedMessages,
          updatedAt: new Date().toISOString()
        };
      }
      return chat;
    });
  });
  
  // Non salvare durante la generazione (skipSave = true) o se isGenerating è true
  // Questo evita salvataggi multipli durante lo streaming
  if (skipSave || get(isGenerating)) {
    return;
  }
  
  const allChats = get(chats);
  const chat = allChats.find(c => c.id === chatId);
  if (chat) {
    // Usa debounce per salvataggi automatici
    debouncedSaveChat(chat);
  }
}

// Elimina un messaggio specifico e tutti i messaggi successivi
export async function deleteMessage(chatId, messageIndex) {
  chats.update(allChats => {
    return allChats.map(chat => {
      if (chat.id === chatId) {
        const updatedMessages = chat.messages.slice(0, messageIndex);
        return {
          ...chat,
          messages: updatedMessages,
          updatedAt: new Date().toISOString()
        };
      }
      return chat;
    });
  });
  
  const allChats = get(chats);
  const chat = allChats.find(c => c.id === chatId);
  if (chat) {
    // Usa debounce per salvataggi automatici
    debouncedSaveChat(chat);
  }
}

// Storage locale
const STORAGE_KEY = 'nebula-ai-chats';

// Cache per debounce dei salvataggi
const saveTimeouts = new Map();
const SAVE_DEBOUNCE_MS = 2000; // 2 secondi di debounce

// Funzione helper per salvare una chat (con debounce)
async function debouncedSaveChat(chat) {
  if (!chat) return;
  
  const chatId = chat.id;
  
  // Cancella il timeout precedente per questa chat
  if (saveTimeouts.has(chatId)) {
    clearTimeout(saveTimeouts.get(chatId));
  }
  
  // Imposta un nuovo timeout
  const timeoutId = setTimeout(async () => {
    saveTimeouts.delete(chatId);
    
    const incognito = get(isIncognitoMode);
    // In modalità incognito, non salvare nulla (solo temporanee in memoria)
    if (incognito) {
      return;
    }
    
    // Se autenticato, salva SOLO su Supabase (non in localStorage)
    if (get(isAuthenticatedStore)) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const result = await saveChatToDatabase(chat);
          if (!result.success) {
            logWarn('⚠️ [CHAT STORE] Salvataggio chat fallito:', result);
          }
        } catch (error) {
          logError('❌ [CHAT STORE] Errore durante salvataggio chat:', error);
        }
      } else {
        logWarn('⚠️ [CHAT STORE] Token non disponibile, chat non salvata');
      }
    } else {
      // Se non autenticato, non salvare (solo temporanee in memoria)
      log('ℹ️ [CHAT STORE] Utente non autenticato, chat temporanea non salvata');
    }
  }, SAVE_DEBOUNCE_MS);
  
  saveTimeouts.set(chatId, timeoutId);
}

// Salva immediatamente (senza debounce) - usare solo quando necessario
export async function saveChatImmediately(chat) {
  // Cancella il debounce se presente
  if (saveTimeouts.has(chat.id)) {
    clearTimeout(saveTimeouts.get(chat.id));
    saveTimeouts.delete(chat.id);
  }
  
  const incognito = get(isIncognitoMode);
  // In modalità incognito, non salvare nulla (solo temporanee in memoria)
  if (incognito) {
    return;
  }
  
  // Se autenticato, salva SOLO su Supabase (non in localStorage)
  if (get(isAuthenticatedStore)) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const result = await saveChatToDatabase(chat);
        if (!result.success) {
          logWarn('⚠️ [CHAT STORE] Salvataggio chat fallito:', result);
        }
      } catch (error) {
        logError('❌ [CHAT STORE] Errore durante salvataggio chat:', error);
      }
    } else {
      logWarn('⚠️ [CHAT STORE] Token non disponibile, chat non salvata');
    }
  } else {
    // Se non autenticato, non salvare (solo temporanee in memoria)
    log('ℹ️ [CHAT STORE] Utente non autenticato, chat temporanea non salvata');
  }
}

// DEPRECATO: Non salvare più in localStorage
// Le chat vengono salvate solo su Supabase quando l'utente è autenticato
// Le chat temporanee rimangono solo in memoria
export function saveChatsToStorage() {
  // Funzione mantenuta per retrocompatibilità ma non fa più nulla
  // Le chat vengono salvate solo su Supabase
  log('ℹ️ [CHAT STORE] saveChatsToStorage chiamato ma deprecato - le chat vengono salvate solo su Supabase');
}

// DEPRECATO: Non caricare più da localStorage
// Le chat vengono caricate solo da Supabase quando l'utente è autenticato
export function loadChatsFromStorage() {
  // Funzione mantenuta per retrocompatibilità ma non fa più nulla
  // Le chat vengono caricate solo da Supabase
  log('ℹ️ [CHAT STORE] loadChatsFromStorage chiamato ma deprecato - le chat vengono caricate solo da Supabase');
}

// Carica le chat dal database se autenticato, altrimenti da localStorage
export async function loadChats() {
  // Evita caricamenti multipli simultanei
  if (isLoadingChats) {
    log('Caricamento chat già in corso, skip loadChats');
    return;
  }
  
  isLoadingChats = true;
  
  try {
    let dbChats = [];
    let localChats = [];
    
    const incognito = get(isIncognitoMode);
    
    // In modalità incognito, non caricare chat dal database
    if (incognito) {
      chats.set([]);
      return;
    }
    
    if (get(isAuthenticatedStore)) {
      // Carica dal database
      const result = await getChatsFromDatabase();
      if (result.success && result.chats) {
        dbChats = result.chats;
      }
    } else {
      // Carica tutte le chat da localStorage se non autenticato
      loadChatsFromStorage();
      return; // loadChatsFromStorage già imposta le chat
    }
    
    // Imposta le chat dal database
    chats.set(dbChats);
  } finally {
    isLoadingChats = false;
  }
}

// Flag per evitare caricamenti multipli simultanei
let isLoadingChats = false;

// Sincronizza le chat quando l'utente fa login
export async function syncChatsOnLogin() {
  log('🔄 [CHAT STORE] syncChatsOnLogin chiamato');
  
  // Verifica che il token sia disponibile
  const token = localStorage.getItem('auth_token');
  if (!token) {
    logWarn('⚠️ [CHAT STORE] Token non disponibile, skip syncChatsOnLogin');
    return;
  }
  
  // Verifica che l'utente sia autenticato
  if (!get(isAuthenticatedStore)) {
    log('⚠️ [CHAT STORE] Utente non autenticato, skip syncChatsOnLogin');
    // Prova comunque se c'è un token (potrebbe essere un problema di timing)
    if (!token) {
      return;
    }
  }
  
  // Evita caricamenti multipli simultanei
  if (isLoadingChats) {
    log('⏸️ [CHAT STORE] Caricamento chat già in corso, skip');
    return;
  }
  
  isLoadingChats = true;
  
  try {
    log('📥 [CHAT STORE] Inizio caricamento chat dal database...');
    
    // Prima pulisci le chat esistenti (potrebbero essere chat locali)
    chats.set([]);
    currentChatId.set(null);
    
    const incognito = get(isIncognitoMode);
    
    // In modalità incognito, non caricare chat dal database
    if (incognito) {
      chats.set([]);
      log('🔒 [CHAT STORE] Modalità incognito attiva, nessuna chat caricata');
      return;
    }
    
    // Carica dal database
    const result = await getChatsFromDatabase();
    log('📊 [CHAT STORE] Risultato getChatsFromDatabase:', {
      success: result.success,
      chatsCount: result.chats?.length || 0,
      message: result.message,
      error: result.error
    });
    
    let dbChats = [];
    if (result.success && result.chats) {
      dbChats = result.chats;
      log(`✅ [CHAT STORE] Caricate ${dbChats.length} chat dal database`);
    } else {
      logWarn('⚠️ [CHAT STORE] Nessuna chat trovata o errore nel caricamento:', result);
      if (result.error) {
        logError('❌ [CHAT STORE] Errore dettagliato:', result.error);
      }
    }
    
    // Prima di sovrascrivere, salva le chat locali che potrebbero non essere nel database
    const stored = localStorage.getItem(STORAGE_KEY);
    let localChatsToMigrate = [];
    if (stored) {
      try {
        const localChats = JSON.parse(stored);
        if (Array.isArray(localChats)) {
          const existingChatIds = new Set(dbChats.map(c => c.id));
          // Trova chat locali che non sono nel database (nuove chat da migrare)
          localChatsToMigrate = localChats.filter(chat => 
            !existingChatIds.has(chat.id) && 
            chat.messages && 
            chat.messages.length > 0 &&
            chat.messages.some(msg => !msg.hidden)
          );
        }
      } catch (error) {
        logError('Errore durante lettura localStorage per migrazione:', error);
      }
    }
    
    // Imposta le chat dal database
    chats.set(dbChats);
    log(`✅ [CHAT STORE] Totale chat caricate: ${dbChats.length}`);
    
    // Non salvare più in localStorage - le chat vengono solo da Supabase
    
    // Migra le nuove chat locali che non sono nel database (solo per retrocompatibilità)
    if (localChatsToMigrate.length > 0) {
      log(`🔄 Trovate ${localChatsToMigrate.length} nuove chat locali da migrare`);
      let migratedCount = 0;
      for (const chat of localChatsToMigrate) {
        try {
          const saveResult = await saveChatToDatabase(chat);
          if (saveResult.success) {
            migratedCount++;
            log(`✅ Migrata chat: ${chat.title || chat.id}`);
          }
        } catch (error) {
          logError(`❌ Errore migrazione chat ${chat.id}:`, error);
        }
      }
      
      // Ricarica le chat dal database dopo la migrazione
      if (migratedCount > 0) {
        const updatedResult = await getChatsFromDatabase();
        if (updatedResult.success && updatedResult.chats) {
          chats.set(updatedResult.chats);
          // Non salvare più in localStorage
          log(`✅ Dopo migrazione, caricate ${updatedResult.chats.length} chat totali`);
        }
      }
    }
  } catch (error) {
    logError('❌ [CHAT STORE] Errore in syncChatsOnLogin:', error);
    // In caso di errore, prova comunque a migrare da localStorage
    try {
      await migrateChatsFromLocalStorage();
    } catch (migrationError) {
      logError('❌ [CHAT STORE] Errore durante migrazione:', migrationError);
    }
  } finally {
    isLoadingChats = false;
    log('✅ [CHAT STORE] syncChatsOnLogin completato');
  }
}

// Migra le chat da localStorage al database
// IMPORTANTE: Questa funzione viene chiamata DOPO che syncChatsOnLogin ha già sovrascritto il localStorage
// Quindi qui dobbiamo solo gestire eventuali chat che erano in localStorage PRIMA della sincronizzazione
// e che non sono ancora nel database (nuove chat locali non ancora migrate)
export async function migrateChatsFromLocalStorage() {
  if (!get(isAuthenticatedStore)) {
    return;
  }
  
  if (typeof window === 'undefined') {
    return;
  }
  
  // Carica le chat attuali dal database
  const dbResult = await getChatsFromDatabase();
  const existingChatIds = new Set();
  if (dbResult.success && dbResult.chats) {
    dbResult.chats.forEach(chat => existingChatIds.add(chat.id));
  }
  
  // Carica le chat dal localStorage (potrebbero essere state sovrascritte da syncChatsOnLogin)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return;
  }
  
  try {
    const localChats = JSON.parse(stored);
    if (!Array.isArray(localChats) || localChats.length === 0) {
      return;
    }
    
    // Trova solo le chat che sono in localStorage ma NON nel database
    // Queste sono nuove chat locali che devono essere migrate
    const chatsToMigrate = localChats.filter(chat => {
      // Deve avere messaggi
      if (!chat.messages || chat.messages.length === 0) {
        return false;
      }
      // Non deve esistere già nel database
      return !existingChatIds.has(chat.id);
    });
    
    if (chatsToMigrate.length === 0) {
      log('ℹ️ Nessuna chat da migrare: tutte le chat in localStorage sono già nel database');
      return;
    }
    
    log(`🔄 Trovate ${chatsToMigrate.length} nuove chat locali da migrare`);
    
    let migratedCount = 0;
    let failedCount = 0;
    
    // Migra solo le nuove chat
    for (const chat of chatsToMigrate) {
      try {
        const saveResult = await saveChatToDatabase(chat);
        if (saveResult.success) {
          migratedCount++;
          log(`✅ Migrata chat: ${chat.title || chat.id}`);
        } else {
          failedCount++;
          logWarn(`⚠️ Errore migrazione chat ${chat.id}:`, saveResult.message);
        }
      } catch (error) {
        failedCount++;
        logError(`❌ Errore migrazione chat ${chat.id}:`, error);
      }
    }
    
    // Dopo la migrazione, ricarica le chat dal database
    const updatedResult = await getChatsFromDatabase();
    if (updatedResult.success && updatedResult.chats) {
      chats.set(updatedResult.chats);
      // Non salvare più in localStorage
      log(`✅ Dopo migrazione, caricate ${updatedResult.chats.length} chat totali dal database`);
    }
    
    if (migratedCount > 0) {
      log(`✅ Migrazione completata: ${migratedCount} chat migrate, ${failedCount} fallite`);
    }
  } catch (error) {
    logError('❌ Errore durante migrazione chat:', error);
  }
}

// Funzione di emergenza per recuperare chat da localStorage
export async function recoverChatsFromLocalStorage() {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Non disponibile lato server' };
  }
  
  if (!get(isAuthenticatedStore)) {
    return { success: false, message: 'Utente non autenticato' };
  }
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { success: false, message: 'Nessuna chat trovata in localStorage' };
  }
  
  try {
    const localChats = JSON.parse(stored);
    if (!Array.isArray(localChats) || localChats.length === 0) {
      return { success: false, message: 'Nessuna chat valida in localStorage' };
    }
    
    return await migrateChatsFromLocalStorage();
  } catch (error) {
    return { 
      success: false, 
      message: 'Errore durante il recupero',
      error: error.message 
    };
  }
}

// Pulisci le chat quando l'utente esce (rimuove solo quelle salvate sull'account)
export function clearChatsOnLogout() {
  // Rimuovi tutte le chat dallo store
  chats.set([]);
  // Resetta il currentChatId
  currentChatId.set(null);
  // Le chat non sono più salvate in localStorage
}

// Non caricare più da localStorage all'avvio - le chat vengono caricate solo da Supabase quando autenticato

