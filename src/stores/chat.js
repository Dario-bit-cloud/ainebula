import { writable, derived, get } from 'svelte/store';
import { isAuthenticatedStore } from './auth.js';
import { getChatsFromDatabase, saveChatToDatabase, deleteChatFromDatabase, updateChatInDatabase } from '../services/chatService.js';

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
export async function createNewChat(projectId = null, isTemporary = false) {
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
  
  const newChat = {
    id: Date.now().toString(),
    title: 'Nuova chat',
    messages: [],
    projectId: projectId || null,
    isTemporary: isTemporary,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  chats.update(allChats => [newChat, ...allChats]);
  currentChatId.set(newChat.id);
  
  // Salva nel database solo se autenticato E non è temporanea
  if (!isTemporary) {
    const isAuthenticated = get(isAuthenticatedStore);
    const token = localStorage.getItem('auth_token');
    
    if (isAuthenticated && token) {
      try {
        await saveChatToDatabase(newChat);
      } catch (error) {
        console.error('❌ [CHAT STORE] Errore durante salvataggio nuova chat:', error);
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
    // Non salvare chat temporanee nel database
    if (chat.isTemporary) {
      // Salva solo in localStorage per chat temporanee
      saveChatsToStorage();
    } else if (get(isAuthenticatedStore)) {
      // Verifica che il token sia disponibile prima di salvare
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Salva nel database se autenticato e non temporanea
        try {
          const result = await saveChatToDatabase(chat);
          if (!result.success) {
            console.warn('⚠️ [CHAT STORE] Salvataggio chat fallito, salvo in localStorage come backup:', result);
            saveChatsToStorage();
          }
        } catch (error) {
          console.error('❌ [CHAT STORE] Errore durante salvataggio chat:', error);
          // Salva in localStorage come backup
          saveChatsToStorage();
        }
      } else {
        console.warn('⚠️ [CHAT STORE] Token non disponibile, salvo in localStorage');
        saveChatsToStorage();
      }
    } else {
      // Salva in localStorage se non autenticato
      saveChatsToStorage();
    }
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
    // Non salvare chat temporanee nel database
    if (chat.isTemporary) {
      // Salva solo in localStorage per chat temporanee
      saveChatsToStorage();
    } else if (get(isAuthenticatedStore)) {
      // Verifica che il token sia disponibile prima di salvare
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Salva nel database se autenticato e non temporanea
        try {
          const result = await saveChatToDatabase(chat);
          if (!result.success) {
            console.warn('⚠️ [CHAT STORE] Salvataggio chat fallito, salvo in localStorage come backup:', result);
            saveChatsToStorage();
          }
        } catch (error) {
          console.error('❌ [CHAT STORE] Errore durante salvataggio chat:', error);
          // Salva in localStorage come backup
          saveChatsToStorage();
        }
      } else {
        console.warn('⚠️ [CHAT STORE] Token non disponibile, salvo in localStorage');
        saveChatsToStorage();
      }
    } else {
      // Salva in localStorage se non autenticato
      saveChatsToStorage();
    }
  }
}

export async function deleteChat(chatId) {
  if (!chatId) return;
  
  const allChats = get(chats);
  const chat = allChats.find(c => c.id === chatId);
  if (!chat) return;
  
  const isTemporary = chat.isTemporary === true;
  const currentId = get(currentChatId);
  
  // Rimuovi la chat dallo store
  chats.update(allChats => allChats.filter(c => c.id !== chatId));
  
  // Se era la chat corrente, resetta il currentChatId
  if (currentId === chatId) {
    currentChatId.set(null);
  }
  
  // Elimina dal database solo se non è temporanea e se autenticato
  if (!isTemporary && get(isAuthenticatedStore)) {
    try {
      await deleteChatFromDatabase(chatId);
    } catch (error) {
      console.error('Errore durante eliminazione chat dal database:', error);
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
    // Non salvare chat temporanee nel database
    if (chat.isTemporary) {
      // Salva solo in localStorage per chat temporanee
      saveChatsToStorage();
    } else if (get(isAuthenticatedStore)) {
      // Verifica che il token sia disponibile prima di salvare
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Salva nel database se autenticato e non temporanea
        try {
          const result = await saveChatToDatabase(chat);
          if (!result.success) {
            console.warn('⚠️ [CHAT STORE] Salvataggio chat fallito, salvo in localStorage come backup:', result);
            saveChatsToStorage();
          }
        } catch (error) {
          console.error('❌ [CHAT STORE] Errore durante salvataggio chat:', error);
          // Salva in localStorage come backup
          saveChatsToStorage();
        }
      } else {
        console.warn('⚠️ [CHAT STORE] Token non disponibile, salvo in localStorage');
        saveChatsToStorage();
      }
    } else {
      // Salva in localStorage se non autenticato
      saveChatsToStorage();
    }
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
    // Non salvare chat temporanee nel database
    if (chat.isTemporary) {
      // Salva solo in localStorage per chat temporanee
      saveChatsToStorage();
    } else if (get(isAuthenticatedStore)) {
      // Verifica che il token sia disponibile prima di salvare
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Salva nel database se autenticato e non temporanea
        try {
          const result = await saveChatToDatabase(chat);
          if (!result.success) {
            console.warn('⚠️ [CHAT STORE] Salvataggio chat fallito, salvo in localStorage come backup:', result);
            saveChatsToStorage();
          }
        } catch (error) {
          console.error('❌ [CHAT STORE] Errore durante salvataggio chat:', error);
          // Salva in localStorage come backup
          saveChatsToStorage();
        }
      } else {
        console.warn('⚠️ [CHAT STORE] Token non disponibile, salvo in localStorage');
        saveChatsToStorage();
      }
    } else {
      // Salva in localStorage se non autenticato
      saveChatsToStorage();
    }
  }
}

// Storage locale
const STORAGE_KEY = 'nebula-ai-chats';

export function saveChatsToStorage() {
  if (typeof window !== 'undefined') {
    try {
      const allChats = get(chats);
      // Salva tutte le chat (incluse temporanee) che hanno almeno un messaggio visibile
      const chatsToSave = allChats.filter(chat => {
        // Per le chat temporanee, salva anche se vuote (per mantenere lo stato)
        if (chat.isTemporary) {
          return true; // Salva tutte le chat temporanee
        }
        // Per le chat normali, salva solo quelle con messaggi
        return chat.messages && 
               chat.messages.length > 0 &&
               chat.messages.some(msg => !msg.hidden);
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatsToSave));
    } catch (error) {
      console.error('Errore durante salvataggio chat in localStorage:', error);
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
      console.error('Error loading chats from storage:', error);
    }
  }
}

// Carica le chat dal database se autenticato, altrimenti da localStorage
export async function loadChats() {
  // Evita caricamenti multipli simultanei
  if (isLoadingChats) {
    console.log('Caricamento chat già in corso, skip loadChats');
    return;
  }
  
  isLoadingChats = true;
  
  try {
    let dbChats = [];
    let localChats = [];
    
    // Carica sempre da localStorage per le chat temporanee
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Filtra solo le chat temporanee da localStorage
          localChats = parsed.filter(chat => chat.isTemporary === true);
        }
      } catch (error) {
        console.error('Error loading temporary chats from storage:', error);
      }
    }
    
    if (get(isAuthenticatedStore)) {
      // Carica dal database (solo chat non temporanee)
      const result = await getChatsFromDatabase();
      if (result.success && result.chats) {
        // Filtra le chat temporanee dal database (non dovrebbero esserci, ma per sicurezza)
        dbChats = result.chats.filter(chat => !chat.isTemporary);
      }
    } else {
      // Carica tutte le chat da localStorage se non autenticato
      loadChatsFromStorage();
      return; // loadChatsFromStorage già imposta le chat
    }
    
    // Combina chat dal database e chat temporanee da localStorage
    chats.set([...dbChats, ...localChats]);
  } finally {
    isLoadingChats = false;
  }
}

// Flag per evitare caricamenti multipli simultanei
let isLoadingChats = false;

// Sincronizza le chat quando l'utente fa login
export async function syncChatsOnLogin() {
  console.log('🔄 [CHAT STORE] syncChatsOnLogin chiamato');
  
  // Verifica che il token sia disponibile
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.warn('⚠️ [CHAT STORE] Token non disponibile, skip syncChatsOnLogin');
    return;
  }
  
  // Verifica che l'utente sia autenticato
  if (!get(isAuthenticatedStore)) {
    console.log('⚠️ [CHAT STORE] Utente non autenticato, skip syncChatsOnLogin');
    // Prova comunque se c'è un token (potrebbe essere un problema di timing)
    if (!token) {
      return;
    }
  }
  
  // Evita caricamenti multipli simultanei
  if (isLoadingChats) {
    console.log('⏸️ [CHAT STORE] Caricamento chat già in corso, skip');
    return;
  }
  
  isLoadingChats = true;
  
  try {
    console.log('📥 [CHAT STORE] Inizio caricamento chat dal database...');
    
    // Prima pulisci le chat esistenti (potrebbero essere chat locali)
    chats.set([]);
    currentChatId.set(null);
    
    // Carica dal database (solo chat non temporanee)
    const result = await getChatsFromDatabase();
    console.log('📊 [CHAT STORE] Risultato getChatsFromDatabase:', {
      success: result.success,
      chatsCount: result.chats?.length || 0,
      message: result.message,
      error: result.error
    });
    
    let dbChats = [];
    if (result.success && result.chats) {
      // Filtra le chat temporanee dal database (non dovrebbero esserci, ma per sicurezza)
      dbChats = result.chats.filter(chat => !chat.isTemporary);
      console.log(`✅ [CHAT STORE] Caricate ${dbChats.length} chat dal database (escluse temporanee)`);
    } else {
      console.warn('⚠️ [CHAT STORE] Nessuna chat trovata o errore nel caricamento:', result);
      // Se c'è un errore, prova comunque a caricare da localStorage
      if (result.error) {
        console.error('❌ [CHAT STORE] Errore dettagliato:', result.error);
      }
    }
    
    // Carica chat temporanee da localStorage
    let tempChats = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          tempChats = parsed.filter(chat => chat.isTemporary === true);
          console.log(`📦 [CHAT STORE] Caricate ${tempChats.length} chat temporanee da localStorage`);
        }
      } catch (error) {
        console.error('❌ [CHAT STORE] Error loading temporary chats from storage:', error);
      }
    }
    
    // Combina chat dal database e chat temporanee
    const allChats = [...dbChats, ...tempChats];
    chats.set(allChats);
    console.log(`✅ [CHAT STORE] Totale chat caricate: ${allChats.length} (${dbChats.length} dal DB, ${tempChats.length} temporanee)`);
    
    // Migra le chat da localStorage al database (solo se non ci sono già chat nel database)
    // Non migrare chat temporanee
    await migrateChatsFromLocalStorage();
  } catch (error) {
    console.error('❌ [CHAT STORE] Errore in syncChatsOnLogin:', error);
    // In caso di errore, prova comunque a migrare da localStorage
    try {
      await migrateChatsFromLocalStorage();
    } catch (migrationError) {
      console.error('❌ [CHAT STORE] Errore durante migrazione:', migrationError);
    }
  } finally {
    isLoadingChats = false;
    console.log('✅ [CHAT STORE] syncChatsOnLogin completato');
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
    
    console.log(`🔄 Trovate ${localChats.length} chat locali da migrare`);
    
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
      // Salta chat temporanee - non migrarle al database
      if (chat.isTemporary) {
        console.log(`⏭️ Chat temporanea ${chat.id} non migrata al database`);
        continue;
      }
      
      // Salta se la chat esiste già nel database
      if (existingChatIds.has(chat.id)) {
        console.log(`⏭️ Chat ${chat.id} già presente nel database, skip`);
        continue;
      }
      
      // Salva solo chat con messaggi
      if (chat.messages && chat.messages.length > 0 && chat.messages.some(msg => !msg.hidden)) {
        try {
          const saveResult = await saveChatToDatabase(chat);
          if (saveResult.success) {
            migratedCount++;
            console.log(`✅ Migrata chat: ${chat.title || chat.id}`);
          } else {
            failedCount++;
            console.warn(`⚠️ Errore migrazione chat ${chat.id}:`, saveResult.message);
          }
        } catch (error) {
          failedCount++;
          console.error(`❌ Errore migrazione chat ${chat.id}:`, error);
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
        console.log('🗑️ localStorage pulito dopo migrazione completa');
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingChats));
        console.log(`💾 ${remainingChats.length} chat rimaste in localStorage`);
      }
      
      // Ricarica le chat dal database dopo la migrazione
      const updatedResult = await getChatsFromDatabase();
      if (updatedResult.success && updatedResult.chats) {
        chats.set(updatedResult.chats);
        console.log(`✅ Dopo migrazione, caricate ${updatedResult.chats.length} chat totali`);
      }
      
      if (migratedCount > 0) {
        console.log(`✅ Migrazione completata: ${migratedCount} chat migrate, ${failedCount} fallite`);
      }
    } else {
      console.log(`ℹ️ Nessuna chat da migrare o tutte già presenti nel database`);
    }
  } catch (error) {
    console.error('❌ Errore durante migrazione chat:', error);
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

