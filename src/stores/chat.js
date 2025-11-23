import { writable, derived } from 'svelte/store';

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
export function createNewChat() {
  const newChat = {
    id: Date.now().toString(),
    title: 'Nuova chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  chats.update(allChats => [newChat, ...allChats]);
  currentChatId.set(newChat.id);
  return newChat.id;
}

export function addMessage(chatId, message) {
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
  
  saveChatsToStorage();
}

export function deleteChat(chatId) {
  let currentId = null;
  const unsubscribe = currentChatId.subscribe(id => {
    currentId = id;
  });
  unsubscribe();
  
  chats.update(allChats => allChats.filter(chat => chat.id !== chatId));
  if (currentId === chatId) {
    currentChatId.set(null);
  }
  saveChatsToStorage();
}

export function loadChat(chatId) {
  currentChatId.set(chatId);
}

// Storage locale
const STORAGE_KEY = 'nebula-ai-chats';

export function saveChatsToStorage() {
  if (typeof window !== 'undefined') {
    let currentChats = [];
    const unsubscribe = chats.subscribe(value => {
      currentChats = value;
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

// Inizializza caricando da storage
loadChatsFromStorage();

