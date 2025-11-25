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
export async function createNewChat(projectId = null) {
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
  
  // Salva nel database se autenticato (anche se vuota, per avere la chat nella lista)
  if (get(isAuthenticatedStore)) {
    await saveChatToDatabase(newChat);
  }
  
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
  
  if (get(isAuthenticatedStore)) {
    // Salva nel database se autenticato
    const allChats = get(chats);
    const chat = allChats.find(c => c.id === chatId);
    if (chat) {
      await saveChatToDatabase(chat);
    }
  } else {
    // Salva in localStorage se non autenticato
    saveChatsToStorage();
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
    if (get(isAuthenticatedStore)) {
      // Salva nel database se autenticato
      await saveChatToDatabase(chat);
    } else {
      // Salva in localStorage se non autenticato
      saveChatsToStorage();
    }
  }
}

export async function deleteChat(chatId) {
  let currentId = null;
  const unsubscribe = currentChatId.subscribe(id => {
    currentId = id;
  });
  unsubscribe();
  
  chats.update(allChats => allChats.filter(chat => chat.id !== chatId));
  if (currentId === chatId) {
    currentChatId.set(null);
  }
  
  // Elimina dal database se autenticato
  if (get(isAuthenticatedStore)) {
    await deleteChatFromDatabase(chatId);
  } else {
    // Salva in localStorage se non autenticato
    saveChatsToStorage();
  }
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
  
  if (get(isAuthenticatedStore)) {
    // Salva nel database se autenticato
    const allChats = get(chats);
    const chat = allChats.find(c => c.id === chatId);
    if (chat) {
      await saveChatToDatabase(chat);
    }
  } else {
    // Salva in localStorage se non autenticato
    saveChatsToStorage();
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
  
  if (get(isAuthenticatedStore)) {
    // Salva nel database se autenticato
    const allChats = get(chats);
    const chat = allChats.find(c => c.id === chatId);
    if (chat) {
      await saveChatToDatabase(chat);
    }
  } else {
    // Salva in localStorage se non autenticato
    saveChatsToStorage();
  }
}

// Storage locale
const STORAGE_KEY = 'nebula-ai-chats';

export function saveChatsToStorage() {
  if (typeof window !== 'undefined') {
    let currentChats = [];
    const unsubscribe = chats.subscribe(value => {
      // Filtra quelle senza messaggi - non salviamo quelle
      currentChats = value.filter(chat => 
        chat.messages && 
        chat.messages.length > 0 &&
        chat.messages.some(msg => !msg.hidden) // Almeno un messaggio visibile
      );
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentChats));
    unsubscribe();
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
  if (get(isAuthenticatedStore)) {
    // Carica dal database
    const result = await getChatsFromDatabase();
    if (result.success && result.chats) {
      chats.set(result.chats);
    }
  } else {
    // Carica da localStorage
    loadChatsFromStorage();
  }
}

// Sincronizza le chat quando l'utente fa login
export async function syncChatsOnLogin() {
  if (!get(isAuthenticatedStore)) {
    console.log('Utente non autenticato, skip syncChatsOnLogin');
    return;
  }
  
  try {
    // Prima pulisci le chat esistenti (potrebbero essere chat locali)
    chats.set([]);
    currentChatId.set(null);
    
    // Carica dal database
    const result = await getChatsFromDatabase();
    console.log('Risultato getChatsFromDatabase:', result);
    
    if (result.success && result.chats) {
      console.log(`Caricate ${result.chats.length} chat dal database`);
      chats.set(result.chats);
    } else {
      console.warn('Nessuna chat trovata o errore nel caricamento:', result);
      chats.set([]);
    }
    
    // Migra le chat da localStorage al database (solo se non ci sono già chat nel database)
    await migrateChatsFromLocalStorage();
  } catch (error) {
    console.error('Errore in syncChatsOnLogin:', error);
    // In caso di errore, prova comunque a migrare da localStorage
    await migrateChatsFromLocalStorage();
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

