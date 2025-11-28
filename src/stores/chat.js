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
        // Salva in localStorage come backup
        saveChatsToStorage();
      }
    } else {
      // Salva in localStorage se non autenticato o token non disponibile
      saveChatsToStorage();
    }
  }
  // Non salvare chat temporanee vuote in localStorage
  // Verranno salvate solo quando avranno almeno un messaggio
  
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

export async function deleteChat(chatId) {
  if (!chatId) return;
  
  const allChats = get(chats);
  const chat = allChats.find(c => c.id === chatId);
  if (!chat) return;
  
  const incognito = get(isIncognitoMode);
  const currentId = get(currentChatId);
  
  // Rimuovi la chat dallo store
  chats.update(allChats => allChats.filter(c => c.id !== chatId));
  
  // Se era la chat corrente, resetta il currentChatId
  if (currentId === chatId) {
    currentChatId.set(null);
  }
  
  // Elimina dal database solo se non è in modalità incognito e se autenticato
  if (!incognito && get(isAuthenticatedStore)) {
    try {
      await deleteChatFromDatabase(chatId);
    } catch (error) {
      logError('Errore durante eliminazione chat dal database:', error);
    }
  }
  
  // Aggiorna localStorage per rimuovere la chat eliminata
  // (importante per le chat temporanee)
  saveChatsToStorage();
}

export function loadChat(chatId) {
  currentChatId.set(chatId);
}

// Aggiorna un messaggio specifico
export async function updateMessage(chatId, messageIndex, updates) {
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
    if (incognito) {
      saveChatsToStorage();
      return;
    }
    
    if (get(isAuthenticatedStore)) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const result = await saveChatToDatabase(chat);
          if (!result.success) {
            logWarn('⚠️ [CHAT STORE] Salvataggio chat fallito, salvo in localStorage come backup:', result);
            saveChatsToStorage();
          }
        } catch (error) {
          logError('❌ [CHAT STORE] Errore durante salvataggio chat:', error);
          saveChatsToStorage();
        }
      } else {
        logWarn('⚠️ [CHAT STORE] Token non disponibile, salvo in localStorage');
        saveChatsToStorage();
      }
    } else {
      saveChatsToStorage();
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
  if (incognito) {
    saveChatsToStorage();
    return;
  }
  
  if (get(isAuthenticatedStore)) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const result = await saveChatToDatabase(chat);
        if (!result.success) {
          logWarn('⚠️ [CHAT STORE] Salvataggio chat fallito, salvo in localStorage come backup:', result);
          saveChatsToStorage();
        }
      } catch (error) {
        logError('❌ [CHAT STORE] Errore durante salvataggio chat:', error);
        saveChatsToStorage();
      }
    } else {
      logWarn('⚠️ [CHAT STORE] Token non disponibile, salvo in localStorage');
      saveChatsToStorage();
    }
  } else {
    saveChatsToStorage();
  }
}

export function saveChatsToStorage() {
  if (typeof window !== 'undefined') {
    try {
      const allChats = get(chats);
      const incognito = get(isIncognitoMode);
      // Salva tutte le chat che hanno almeno un messaggio visibile
      // In modalità incognito, salva solo in memoria (non in localStorage persistente)
      const chatsToSave = allChats.filter(chat => {
        // Per le chat normali, salva solo quelle con messaggi
        return chat.messages && 
               chat.messages.length > 0 &&
               chat.messages.some(msg => !msg.hidden);
      });
      
      // In modalità incognito, non salvare nulla in localStorage
      if (incognito) {
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatsToSave));
    } catch (error) {
      logError('Errore durante salvataggio chat in localStorage:', error);
    }
  }
}

export function loadChatsFromStorage() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        chats.set(parsed);
      }
    } catch (error) {
      logError('Error loading chats from storage:', error);
    }
  }
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
    
    // Imposta le chat dal database
    chats.set(dbChats);
    log(`✅ [CHAT STORE] Totale chat caricate: ${dbChats.length}`);
    
    // Migra le chat da localStorage al database (solo se non ci sono già chat nel database)
    // Non migrare chat temporanee
    await migrateChatsFromLocalStorage();
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
export async function migrateChatsFromLocalStorage() {
  if (!get(isAuthenticatedStore)) {
    return;
  }
  
  if (typeof window === 'undefined') {
    return;
  }
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return;
  }
  
  try {
    const localChats = JSON.parse(stored);
    if (!Array.isArray(localChats) || localChats.length === 0) {
      return;
    }
    
    log(`🔄 Trovate ${localChats.length} chat locali da migrare`);
    
    // Carica le chat attuali dal database per evitare duplicati
    const dbResult = await getChatsFromDatabase();
    const existingChatIds = new Set();
    if (dbResult.success && dbResult.chats) {
      dbResult.chats.forEach(chat => existingChatIds.add(chat.id));
    }
    
    let migratedCount = 0;
    let failedCount = 0;
    
    // Salva ogni chat locale nel database
    for (const chat of localChats) {
      // Salta chat senza messaggi
      if (!chat.messages || chat.messages.length === 0) {
        continue;
      }
      
      // Salta se la chat esiste già nel database
      if (existingChatIds.has(chat.id)) {
        log(`⏭️ Chat ${chat.id} già presente nel database, skip`);
        continue;
      }
      
      // Salva solo chat con messaggi
      if (chat.messages && chat.messages.length > 0 && chat.messages.some(msg => !msg.hidden)) {
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
    }
    
    // Pulisci localStorage solo se la migrazione è andata a buon fine per almeno una chat
    if (migratedCount > 0) {
      // Rimuovi solo le chat migrate con successo
      const remainingChats = localChats.filter(chat => {
        if (existingChatIds.has(chat.id)) {
          return false; // Già presente nel database
        }
        // Se la migrazione è fallita, mantieni la chat in localStorage
        return true;
      });
      
      if (remainingChats.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        log('🗑️ localStorage pulito dopo migrazione completa');
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingChats));
        log(`💾 ${remainingChats.length} chat rimaste in localStorage`);
      }
      
      // Ricarica le chat dal database dopo la migrazione
      const updatedResult = await getChatsFromDatabase();
      if (updatedResult.success && updatedResult.chats) {
        chats.set(updatedResult.chats);
        log(`✅ Dopo migrazione, caricate ${updatedResult.chats.length} chat totali`);
      }
      
      if (migratedCount > 0) {
        log(`✅ Migrazione completata: ${migratedCount} chat migrate, ${failedCount} fallite`);
      }
    } else {
      log(`ℹ️ Nessuna chat da migrare o tutte già presenti nel database`);
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
  // Non toccare il localStorage - quelle sono le chat locali, non quelle dell'account
}

// Inizializza caricando da storage (per utenti non autenticati)
loadChatsFromStorage();

