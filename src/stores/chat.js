import { writable, derived, get } from 'svelte/store';
import { isAuthenticatedStore } from './auth.js';
import { isIncognitoMode } from './app.js';
import { saveChatsBackup, loadChatsBackup } from '../services/backupChatService.js';
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
  
  // Salva in localStorage e backup solo se non è in modalità incognito
  if (!incognito) {
    // Salva immediatamente in localStorage
    try {
      saveChatsToStorage();
      log('✅ [CHAT STORE] Nuova chat salvata in localStorage');
    } catch (error) {
      logError('❌ [CHAT STORE] Errore durante salvataggio nuova chat in localStorage:', error);
    }
    
    // Salva anche nel backup se autenticato
    if (get(isAuthenticatedStore)) {
      try {
        const allChats = get(chats);
        const chatsToBackup = allChats.filter(c => 
          c.messages && 
          c.messages.length > 0 && 
          c.messages.some(msg => !msg.hidden)
        );
        
        if (chatsToBackup.length > 0) {
          await saveChatsBackup(chatsToBackup);
          log('✅ [CHAT STORE] Nuova chat sincronizzata nel backup');
        }
      } catch (error) {
        logWarn('⚠️ [CHAT STORE] Errore durante salvataggio backup nuova chat:', error);
      }
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
  
  // Rimuovi la chat dallo store
  chats.update(allChats => allChats.filter(c => c.id !== chatId));
  
  // Salva in localStorage dopo l'eliminazione
  if (!incognito) {
    try {
      saveChatsToStorage();
    } catch (error) {
      logError('❌ [CHAT STORE] Errore durante salvataggio dopo eliminazione:', error);
    }
  }
  
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

// Funzione helper per salvare tutte le chat come backup (con debounce)
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
    
    // Salva in localStorage per backup locale
    try {
      saveChatsToStorage();
      log('✅ [CHAT STORE] Chat salvata in localStorage');
    } catch (error) {
      logError('❌ [CHAT STORE] Errore durante salvataggio chat in localStorage:', error);
    }
    
    // Salva backup completo nel database (sincronizzazione tra dispositivi)
    try {
      const allChats = get(chats);
      // Salva solo le chat che hanno almeno un messaggio visibile
      const chatsToBackup = allChats.filter(c => 
        c.messages && 
        c.messages.length > 0 && 
        c.messages.some(msg => !msg.hidden)
      );
      
      if (chatsToBackup.length > 0) {
        const result = await saveChatsBackup(chatsToBackup);
        if (result.success) {
          log(`✅ [CHAT STORE] Backup salvato nel database: ${chatsToBackup.length} chat`);
        } else {
          logWarn('⚠️ [CHAT STORE] Salvataggio backup fallito:', result.message);
        }
      }
    } catch (error) {
      logError('❌ [CHAT STORE] Errore durante salvataggio backup:', error);
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
  
  // Salva in localStorage per backup locale
  try {
    saveChatsToStorage();
    log('✅ [CHAT STORE] Chat salvata immediatamente in localStorage');
  } catch (error) {
    logError('❌ [CHAT STORE] Errore durante salvataggio chat in localStorage:', error);
  }
  
  // Salva backup completo nel database (sincronizzazione tra dispositivi)
  try {
    const allChats = get(chats);
    // Salva solo le chat che hanno almeno un messaggio visibile
    const chatsToBackup = allChats.filter(c => 
      c.messages && 
      c.messages.length > 0 && 
      c.messages.some(msg => !msg.hidden)
    );
    
    if (chatsToBackup.length > 0) {
      const result = await saveChatsBackup(chatsToBackup);
      if (result.success) {
        log(`✅ [CHAT STORE] Backup salvato immediatamente nel database: ${chatsToBackup.length} chat`);
      } else {
        logWarn('⚠️ [CHAT STORE] Salvataggio backup fallito:', result.message);
      }
    }
  } catch (error) {
    logError('❌ [CHAT STORE] Errore durante salvataggio backup:', error);
  }
}

// Salva tutte le chat in localStorage
export function saveChatsToStorage() {
  if (typeof window === 'undefined') {
    return;
  }
  
  const incognito = get(isIncognitoMode);
  // In modalità incognito, non salvare nulla
  if (incognito) {
    return;
  }
  
  try {
    const allChats = get(chats);
    // Salva solo le chat che hanno almeno un messaggio visibile
    const chatsToSave = allChats.filter(chat => 
      chat.messages && 
      chat.messages.length > 0 && 
      chat.messages.some(msg => !msg.hidden)
    );
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatsToSave));
    log(`✅ [CHAT STORE] Salvate ${chatsToSave.length} chat in localStorage`);
  } catch (error) {
    logError('❌ [CHAT STORE] Errore durante salvataggio in localStorage:', error);
  }
}

// Carica tutte le chat da localStorage
export function loadChatsFromStorage() {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const localChats = JSON.parse(stored);
      if (Array.isArray(localChats)) {
        chats.set(localChats);
        log(`✅ [CHAT STORE] Caricate ${localChats.length} chat da localStorage`);
        return localChats;
      }
    }
  } catch (error) {
    logError('❌ [CHAT STORE] Errore durante caricamento da localStorage:', error);
  }
  
  return [];
}

// Carica le chat dal backup nel database (sincronizzazione tra dispositivi)
export async function loadChats() {
  // Evita caricamenti multipli simultanei
  if (isLoadingChats) {
    log('⏸️ [CHAT STORE] Caricamento chat già in corso, skip loadChats');
    return;
  }
  
  isLoadingChats = true;
  
  try {
    const incognito = get(isIncognitoMode);
    
    // In modalità incognito, non caricare chat
    if (incognito) {
      log('🔒 [CHAT STORE] Modalità incognito, nessuna chat caricata');
      chats.set([]);
      return;
    }
    
    // Prima prova a caricare dal backup nel database (sincronizzazione tra dispositivi)
    if (get(isAuthenticatedStore)) {
      log('📥 [CHAT STORE] Caricamento chat dal backup nel database...');
      
      try {
        const backupResult = await loadChatsBackup();
        
        if (backupResult.success && backupResult.chats && backupResult.chats.length > 0) {
          chats.set(backupResult.chats);
          // Sincronizza anche localStorage con il backup
          saveChatsToStorage();
          log(`✅ [CHAT STORE] Caricate ${backupResult.chats.length} chat dal backup nel database`);
          return;
        } else {
          log('ℹ️ [CHAT STORE] Nessun backup trovato nel database, provo localStorage...');
        }
      } catch (error) {
        logWarn('⚠️ [CHAT STORE] Errore durante caricamento backup, provo localStorage:', error);
      }
    }
    
    // Fallback: carica da localStorage se il backup non è disponibile
    log('📥 [CHAT STORE] Caricamento chat da localStorage...');
    
    const localChats = loadChatsFromStorage();
    
    if (Array.isArray(localChats) && localChats.length > 0) {
      chats.set(localChats);
      log(`✅ [CHAT STORE] Caricate ${localChats.length} chat da localStorage`);
      
      // Se autenticato, sincronizza il backup nel database con localStorage
      if (get(isAuthenticatedStore)) {
        try {
          await saveChatsBackup(localChats);
          log('✅ [CHAT STORE] Backup sincronizzato con localStorage');
        } catch (error) {
          logWarn('⚠️ [CHAT STORE] Errore durante sincronizzazione backup:', error);
        }
      }
    } else {
      chats.set([]);
      log('ℹ️ [CHAT STORE] Nessuna chat trovata');
    }
  } catch (error) {
    logError('❌ [CHAT STORE] Errore durante loadChats:', error);
    chats.set([]);
  } finally {
    isLoadingChats = false;
  }
}

// Flag per evitare caricamenti multipli simultanei
let isLoadingChats = false;

// Sincronizza le chat quando l'utente fa login (carica dal backup nel database)
export async function syncChatsOnLogin() {
  log('🔄 [CHAT STORE] syncChatsOnLogin chiamato');
  
  // Evita caricamenti multipli simultanei
  if (isLoadingChats) {
    log('⏸️ [CHAT STORE] Caricamento chat già in corso, skip');
    return;
  }
  
  isLoadingChats = true;
  
  try {
    const incognito = get(isIncognitoMode);
    
    // In modalità incognito, non caricare chat
    if (incognito) {
      chats.set([]);
      log('🔒 [CHAT STORE] Modalità incognito attiva, nessuna chat caricata');
      return;
    }
    
    // Prima prova a caricare dal backup nel database (sincronizzazione tra dispositivi)
    log('📥 [CHAT STORE] Caricamento chat dal backup nel database...');
    
    try {
      const backupResult = await loadChatsBackup();
      
      if (backupResult.success && backupResult.chats && backupResult.chats.length > 0) {
        chats.set(backupResult.chats);
        // Sincronizza anche localStorage con il backup
        saveChatsToStorage();
        log(`✅ [CHAT STORE] Caricate ${backupResult.chats.length} chat dal backup nel database`);
        return;
      } else {
        log('ℹ️ [CHAT STORE] Nessun backup trovato nel database, provo localStorage...');
      }
    } catch (error) {
      logWarn('⚠️ [CHAT STORE] Errore durante caricamento backup, provo localStorage:', error);
    }
    
    // Fallback: carica da localStorage se il backup non è disponibile
    const localChats = loadChatsFromStorage();
    
    if (Array.isArray(localChats) && localChats.length > 0) {
      chats.set(localChats);
      log(`✅ [CHAT STORE] Caricate ${localChats.length} chat da localStorage`);
      
      // Sincronizza il backup nel database con localStorage
      try {
        await saveChatsBackup(localChats);
        log('✅ [CHAT STORE] Backup sincronizzato con localStorage');
      } catch (error) {
        logWarn('⚠️ [CHAT STORE] Errore durante sincronizzazione backup:', error);
      }
    } else {
      chats.set([]);
      log('ℹ️ [CHAT STORE] Nessuna chat trovata');
    }
  } catch (error) {
    logError('❌ [CHAT STORE] Errore in syncChatsOnLogin:', error);
    chats.set([]);
  } finally {
    isLoadingChats = false;
    log('✅ [CHAT STORE] syncChatsOnLogin completato');
  }
}

// Funzione di emergenza per recuperare chat da localStorage
export async function recoverChatsFromLocalStorage() {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Non disponibile lato server' };
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
    
    // Carica le chat da localStorage
    chats.set(localChats);
    log(`✅ [CHAT STORE] Recuperate ${localChats.length} chat da localStorage`);
    
    return { success: true, message: `Recuperate ${localChats.length} chat` };
  } catch (error) {
    logError('❌ [CHAT STORE] Errore durante recupero chat:', error);
    return { 
      success: false, 
      message: 'Errore durante il recupero',
      error: error.message 
    };
  }
}

// Pulisci le chat quando l'utente esce
export function clearChatsOnLogout() {
  // Rimuovi tutte le chat dallo store
  chats.set([]);
  // Resetta il currentChatId
  currentChatId.set(null);
  // Pulisci anche localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

