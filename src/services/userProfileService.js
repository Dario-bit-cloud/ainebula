// Servizio per gestire il profilo utente e statistiche dal database

import { getCachedData, invalidateCache } from '../utils/apiCache.js';
import { log, logWarn, logError } from '../utils/logger.js';

// Determina l'URL base dell'API in base all'ambiente
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    
    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    if (backendUrl) {
      return `${backendUrl}/api`;
    }
    
    return '/api';
  }
  return '/api';
};

/**
 * Ottiene le statistiche dell'utente dal database
 * Include: numero chat, storage utilizzato, ultimo accesso, ecc.
 */
export async function getUserStats() {
  const cacheKey = 'user_stats';
  
  return getCachedData(cacheKey, async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return { success: false, message: 'Non autenticato' };
      }
      
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/chat`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { success: false, message: 'Errore nel caricamento statistiche' };
      }
      
      const data = await response.json();
      
      if (data.success && data.chats) {
        // Calcola statistiche
        const totalChats = data.chats.length;
        const totalMessages = data.chats.reduce((acc, chat) => {
          return acc + (chat.messages?.length || 0);
        }, 0);
        
        // Stima storage (JSON stringify delle chat)
        const storageBytes = new Blob([JSON.stringify(data.chats)]).size;
        const storageMB = (storageBytes / (1024 * 1024)).toFixed(2);
        
        // Trova ultima attività
        const lastActivity = data.chats.reduce((latest, chat) => {
          const chatDate = new Date(chat.updated_at || chat.created_at);
          return chatDate > latest ? chatDate : latest;
        }, new Date(0));
        
        return {
          success: true,
          stats: {
            totalChats,
            totalMessages,
            storageMB,
            storageBytes,
            lastActivity: lastActivity.toISOString(),
            lastActivityFormatted: formatRelativeTime(lastActivity)
          }
        };
      }
      
      return { success: true, stats: { totalChats: 0, totalMessages: 0, storageMB: '0.00' } };
    } catch (error) {
      logError('❌ [USER PROFILE] Errore caricamento statistiche:', error);
      return { success: false, message: error.message };
    }
  }, 60000); // Cache per 60 secondi
}

/**
 * Ottiene i workspace dell'utente dal database
 */
export async function getUserWorkspaces() {
  const cacheKey = 'user_workspaces';
  
  return getCachedData(cacheKey, async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        return { success: false, message: 'Non autenticato', workspaces: [] };
      }
      
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/projects`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { success: false, message: 'Errore caricamento workspace', workspaces: [] };
      }
      
      const data = await response.json();
      
      if (data.success && data.projects) {
        return {
          success: true,
          workspaces: data.projects.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            chatCount: p.chat_count || 0,
            createdAt: p.created_at,
            color: p.color || generateColorFromName(p.name)
          }))
        };
      }
      
      return { success: true, workspaces: [] };
    } catch (error) {
      logError('❌ [USER PROFILE] Errore caricamento workspace:', error);
      return { success: false, message: error.message, workspaces: [] };
    }
  }, 30000); // Cache per 30 secondi
}

/**
 * Verifica lo stato della connessione al database
 */
export async function checkDatabaseConnection() {
  try {
    const token = localStorage.getItem('auth_token');
    const apiBase = getApiBaseUrl();
    
    const startTime = performance.now();
    const response = await fetch(`${apiBase}/chat`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const latency = Math.round(performance.now() - startTime);
    
    return {
      connected: response.ok,
      latency,
      status: response.ok ? 'online' : 'offline'
    };
  } catch (error) {
    return {
      connected: false,
      latency: null,
      status: 'offline',
      error: error.message
    };
  }
}

/**
 * Invalida la cache delle statistiche utente
 */
export function invalidateUserStatsCache() {
  invalidateCache('user_stats');
}

/**
 * Invalida la cache dei workspace
 */
export function invalidateWorkspacesCache() {
  invalidateCache('user_workspaces');
}

// Utility per formattare tempo relativo
function formatRelativeTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return 'Mai';
  
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'Adesso';
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffHour < 24) return `${diffHour} ore fa`;
  if (diffDay < 7) return `${diffDay} giorni fa`;
  
  return date.toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'short' 
  });
}

// Utility per generare colore da nome
function generateColorFromName(name) {
  if (!name) return '#6366f1';
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#84cc16', '#22c55e', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

