import { log, logWarn, logError } from '../utils/logger.js';
import { API_BASE_URL } from '../config/api.js';

/**
 * Salva un backup completo di tutte le chat nel database
 */
export async function saveChatsBackup(chats) {
  const url = `${API_BASE_URL}/api/chat/backup`;
  
  log('💾 [BACKUP SERVICE] Salvataggio backup chat:', {
    url,
    chatsCount: chats?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      logWarn('⚠️ [BACKUP SERVICE] Nessun token trovato per salvare backup');
      return { success: false, message: 'Non autenticato' };
    }
    
    // Prepara il backup con metadati
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        chatsCount: chats?.length || 0
      },
      chats: chats || []
    };
    
    log('📤 [BACKUP SERVICE] Invio richiesta POST backup:', {
      url,
      chatsCount: backup.chats.length
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backup)
    });
    
    log('📥 [BACKUP SERVICE] Risposta salvataggio backup:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    let data;
    const responseText = await response.text();
    
    try {
      data = JSON.parse(responseText);
      if (data.success) {
        log('✅ [BACKUP SERVICE] Backup salvato con successo');
      } else {
        logWarn('⚠️ [BACKUP SERVICE] Salvataggio backup fallito:', data);
      }
    } catch (parseError) {
      logError('❌ [BACKUP SERVICE] Errore parsing risposta:', parseError);
      return {
        success: false,
        message: 'Errore nel formato della risposta del server',
        error: `Errore parsing: ${parseError.message}`,
        rawResponse: responseText
      };
    }
    
    return data;
  } catch (error) {
    console.error('❌ [BACKUP SERVICE] Errore durante il salvataggio backup:', {
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
 * Carica l'ultimo backup delle chat dal database
 */
export async function loadChatsBackup() {
  const url = `${API_BASE_URL}/api/chat/backup`;
  
  log('📥 [BACKUP SERVICE] Caricamento backup chat:', {
    url,
    timestamp: new Date().toISOString()
  });
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      logWarn('⚠️ [BACKUP SERVICE] Nessun token trovato per caricare backup');
      return { success: false, message: 'Non autenticato', chats: [] };
    }
    
    log('📤 [BACKUP SERVICE] Invio richiesta GET backup');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    log('📥 [BACKUP SERVICE] Risposta caricamento backup:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        log('ℹ️ [BACKUP SERVICE] Nessun backup trovato');
        return { success: true, chats: [], message: 'Nessun backup disponibile' };
      }
      
      const errorText = await response.text();
      logWarn('⚠️ [BACKUP SERVICE] Errore caricamento backup:', errorText);
      return {
        success: false,
        message: 'Errore durante il caricamento del backup',
        chats: []
      };
    }
    
    let data;
    const responseText = await response.text();
    
    try {
      data = JSON.parse(responseText);
      if (data.success && data.backup) {
        const chats = data.backup.chats || [];
        log(`✅ [BACKUP SERVICE] Backup caricato con successo: ${chats.length} chat`);
        return {
          success: true,
          chats: chats,
          metadata: data.backup.metadata
        };
      } else {
        logWarn('⚠️ [BACKUP SERVICE] Backup non valido:', data);
        return {
          success: false,
          message: data.message || 'Backup non valido',
          chats: []
        };
      }
    } catch (parseError) {
      logError('❌ [BACKUP SERVICE] Errore parsing risposta:', parseError);
      return {
        success: false,
        message: 'Errore nel formato della risposta del server',
        error: `Errore parsing: ${parseError.message}`,
        chats: []
      };
    }
  } catch (error) {
    console.error('❌ [BACKUP SERVICE] Errore durante il caricamento backup:', {
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
      chats: []
    };
  }
}

/**
 * Esporta il backup come file JSON per download
 */
export function exportChatsBackup(chats) {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        chatsCount: chats?.length || 0
      },
      chats: chats || []
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chats-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    log('✅ [BACKUP SERVICE] Backup esportato come file');
  } catch (error) {
    logError('❌ [BACKUP SERVICE] Errore durante esportazione backup:', error);
  }
}

/**
 * Importa un backup da file JSON
 */
export function importChatsBackup(file) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Non disponibile lato server'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const backup = JSON.parse(content);
        
        if (!backup.chats || !Array.isArray(backup.chats)) {
          reject(new Error('Formato backup non valido: chats non trovato'));
          return;
        }
        
        log(`✅ [BACKUP SERVICE] Backup importato: ${backup.chats.length} chat`);
        resolve({
          success: true,
          chats: backup.chats,
          metadata: backup.metadata
        });
      } catch (error) {
        logError('❌ [BACKUP SERVICE] Errore durante importazione backup:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Errore durante la lettura del file'));
    };
    
    reader.readAsText(file);
  });
}

