// Servizio di crittografia end-to-end per i messaggi delle chat
// Usa Web Crypto API per crittografare i messaggi lato client
// SICUREZZA: La chiave NON viene mai memorizzata in localStorage, solo in memoria temporanea

// Cache temporanea della password in memoria (non in localStorage)
// La password viene rimossa automaticamente dopo 5 minuti di inattività
const passwordCache = new Map();
const CACHE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minuti

// Timeout per rimuovere la password dalla cache
const passwordTimeouts = new Map();

// Chiave per sessionStorage (si cancella quando si chiude il tab/browser)
const SESSION_STORAGE_KEY = 'nebula_encryption_password';

/**
 * Memorizza temporaneamente la password in memoria e sessionStorage
 * @param {string} userId - ID dell'utente
 * @param {string} password - Password dell'utente
 */
export function cachePassword(userId, password) {
  // Rimuovi il timeout precedente se esiste
  if (passwordTimeouts.has(userId)) {
    clearTimeout(passwordTimeouts.get(userId));
  }
  
  // Memorizza la password in cache in memoria
  passwordCache.set(userId, password);
  
  // Memorizza anche in sessionStorage per persistere durante la sessione del browser
  // sessionStorage si cancella automaticamente quando si chiude il tab/browser
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessionData = {
        userId,
        password,
        timestamp: Date.now()
      };
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      console.log(`✅ [ENCRYPTION] Password memorizzata in sessionStorage per utente ${userId}`);
    }
  } catch (error) {
    console.warn('⚠️ [ENCRYPTION] Impossibile salvare password in sessionStorage:', error);
    // Continua comunque con la cache in memoria
  }
  
  // Rimuovi la password dalla cache dopo il timeout (solo dalla memoria, sessionStorage rimane)
  const timeoutId = setTimeout(() => {
    passwordCache.delete(userId);
    passwordTimeouts.delete(userId);
    console.log(`🔒 [ENCRYPTION] Password rimossa dalla cache in memoria per utente ${userId} (sessionStorage rimane)`);
  }, CACHE_TIMEOUT_MS);
  
  passwordTimeouts.set(userId, timeoutId);
  console.log(`✅ [ENCRYPTION] Password memorizzata in cache per utente ${userId}`);
}

/**
 * Ottiene la password dalla cache se disponibile
 * Cerca prima in memoria, poi in sessionStorage
 * @param {string} userId - ID dell'utente
 * @returns {string|null} - Password o null se non disponibile
 */
export function getCachedPassword(userId) {
  // Prima cerca in memoria (più veloce)
  const memoryPassword = passwordCache.get(userId);
  if (memoryPassword) {
    return memoryPassword;
  }
  
  // Se non in memoria, cerca in sessionStorage
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessionDataStr = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionDataStr) {
        const sessionData = JSON.parse(sessionDataStr);
        // Verifica che sia per lo stesso utente
        if (sessionData.userId === userId && sessionData.password) {
          // Ripristina anche in memoria per performance
          passwordCache.set(userId, sessionData.password);
          // Rinnova il timeout
          if (passwordTimeouts.has(userId)) {
            clearTimeout(passwordTimeouts.get(userId));
          }
          const timeoutId = setTimeout(() => {
            passwordCache.delete(userId);
            passwordTimeouts.delete(userId);
            console.log(`🔒 [ENCRYPTION] Password rimossa dalla cache in memoria per utente ${userId}`);
          }, CACHE_TIMEOUT_MS);
          passwordTimeouts.set(userId, timeoutId);
          console.log(`✅ [ENCRYPTION] Password recuperata da sessionStorage per utente ${userId}`);
          return sessionData.password;
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ [ENCRYPTION] Errore lettura sessionStorage:', error);
  }
  
  return null;
}

/**
 * Rimuove la password dalla cache (memoria e sessionStorage)
 * @param {string} userId - ID dell'utente
 */
export function clearCachedPassword(userId) {
  passwordCache.delete(userId);
  if (passwordTimeouts.has(userId)) {
    clearTimeout(passwordTimeouts.get(userId));
    passwordTimeouts.delete(userId);
  }
  
  // Rimuovi anche da sessionStorage
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessionDataStr = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionDataStr) {
        const sessionData = JSON.parse(sessionDataStr);
        // Rimuovi solo se è per lo stesso utente
        if (sessionData.userId === userId) {
          window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ [ENCRYPTION] Errore rimozione da sessionStorage:', error);
  }
  
  console.log(`🔒 [ENCRYPTION] Password rimossa dalla cache per utente ${userId}`);
}

/**
 * Richiede la password all'utente se non è in cache
 * Questa funzione dovrebbe essere chiamata quando serve la password per decrittografare
 * @param {string} userId - ID dell'utente
 * @returns {Promise<string>} - Password dell'utente
 * @throws {Error} - Se la password non è disponibile
 */
export async function requestPasswordIfNeeded(userId) {
  // Se la password è già in cache, usala
  const cachedPassword = getCachedPassword(userId);
  if (cachedPassword) {
    return cachedPassword;
  }
  
  // Altrimenti, lancia un errore che dovrebbe essere gestito dall'UI
  // L'UI dovrebbe mostrare un modal per richiedere la password
  throw new Error('PASSWORD_REQUIRED');
}

/**
 * Deriva una chiave di crittografia dalla password dell'utente
 * NON memorizza la chiave, la deriva sempre dalla password
 * @param {string} password - Password dell'utente
 * @param {string} userId - ID dell'utente (per salt unico)
 * @returns {Promise<CryptoKey>} - Chiave di crittografia
 */
export async function deriveEncryptionKey(password, userId) {
  try {
    // Crea un salt unico basato sull'ID utente
    const encoder = new TextEncoder();
    const salt = encoder.encode(`nebula-encryption-salt-${userId}`);
    
    // Importa la password come materiale chiave
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Deriva la chiave usando PBKDF2
    const encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // Numero di iterazioni per sicurezza
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    return encryptionKey;
  } catch (error) {
    console.error('❌ [ENCRYPTION] Errore derivazione chiave:', error);
    throw new Error('Errore nella derivazione della chiave di crittografia');
  }
}

/**
 * Deriva una chiave specifica per una chat dalla chiave master
 * Questo permette di isolare le chat crittograficamente
 * @param {CryptoKey} masterKey - Chiave master derivata dalla password
 * @param {string} chatId - ID della chat
 * @returns {Promise<CryptoKey>} - Chiave specifica per la chat
 */
export async function deriveChatKey(masterKey, chatId) {
  try {
    const encoder = new TextEncoder();
    const chatIdBytes = encoder.encode(`chat-${chatId}`);
    
    // Esporta la chiave master come raw bytes
    const masterKeyBytes = await crypto.subtle.exportKey('raw', masterKey);
    
    // Importa come materiale chiave per PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      masterKeyBytes,
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Deriva una chiave specifica per questa chat
    const chatKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: chatIdBytes,
        iterations: 1, // Solo 1 iterazione per derivazione rapida (la sicurezza è già garantita dalla chiave master)
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    return chatKey;
  } catch (error) {
    console.error('❌ [ENCRYPTION] Errore derivazione chiave chat:', error);
    throw new Error('Errore nella derivazione della chiave per la chat');
  }
}

/**
 * Ottiene la chiave di crittografia per l'utente corrente
 * Deriva sempre la chiave dalla password (non memorizza la chiave)
 * @param {string} userId - ID dell'utente
 * @param {string} password - Password dell'utente (opzionale, se non fornita cerca in cache)
 * @returns {Promise<CryptoKey|null>} - Chiave di crittografia o null se non disponibile
 */
export async function getEncryptionKeyForUser(userId, password = null) {
  try {
    // Se la password non è fornita, prova a recuperarla dalla cache
    if (!password) {
      password = getCachedPassword(userId);
      if (!password) {
        console.warn('⚠️ [ENCRYPTION] Password non disponibile per utente', userId);
        return null;
      }
    }
    
    // Deriva sempre la chiave dalla password (non memorizzarla)
    const key = await deriveEncryptionKey(password, userId);
    return key;
  } catch (error) {
    console.error('❌ [ENCRYPTION] Errore recupero chiave:', error);
    return null;
  }
}

/**
 * Inizializza la crittografia per un utente dopo il login
 * Memorizza la password in cache (non la chiave)
 * @param {string} password - Password dell'utente (non memorizzata permanentemente)
 * @param {string} userId - ID dell'utente
 * @returns {Promise<CryptoKey>} - Chiave di crittografia
 */
export async function initializeEncryption(password, userId) {
  // Memorizza la password in cache (non la chiave)
  cachePassword(userId, password);
  
  // Deriva e restituisce la chiave
  return await deriveEncryptionKey(password, userId);
}

/**
 * Rimuove la password dalla cache (logout)
 * @param {string} userId - ID dell'utente
 */
export function clearEncryptionKey(userId) {
  clearCachedPassword(userId);
  console.log('🔒 [ENCRYPTION] Password rimossa dalla cache');
}

/**
 * Crittografa un messaggio
 * @param {string} message - Messaggio da crittografare
 * @param {CryptoKey} key - Chiave di crittografia
 * @returns {Promise<string>} - Messaggio crittografato in formato base64
 */
export async function encryptMessage(message, key) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Genera un IV (Initialization Vector) casuale per ogni messaggio
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Crittografa il messaggio
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );
    
    // Combina IV e dati crittografati
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Converti in base64 per il trasporto
    const base64 = btoa(String.fromCharCode(...combined));
    
    // Aggiungi un prefisso per identificare i messaggi crittografati
    return `encrypted:${base64}`;
  } catch (error) {
    console.error('❌ [ENCRYPTION] Errore crittografia:', error);
    throw new Error('Errore nella crittografia del messaggio');
  }
}

/**
 * Decrittografa un messaggio
 * @param {string} encryptedMessage - Messaggio crittografato in formato base64
 * @param {CryptoKey} key - Chiave di crittografia
 * @returns {Promise<string>} - Messaggio decrittografato
 */
export async function decryptMessage(encryptedMessage, key) {
  try {
    // Controlla se il messaggio è crittografato
    if (!encryptedMessage.startsWith('encrypted:')) {
      // Se non è crittografato, restituiscilo così com'è (per retrocompatibilità)
      return encryptedMessage;
    }
    
    // Rimuovi il prefisso
    const base64 = encryptedMessage.substring(10);
    
    // Converti da base64
    const binaryString = atob(base64);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    // Estrai IV e dati crittografati
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    // Decrittografa il messaggio
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );
    
    // Converti in stringa
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('❌ [ENCRYPTION] Errore decrittografia:', error);
    // Se la decrittografia fallisce, potrebbe essere un messaggio non crittografato
    // o una chiave errata. Restituiamo il messaggio originale con un avviso.
    console.warn('⚠️ [ENCRYPTION] Impossibile decrittografare, restituisco il messaggio originale');
    return encryptedMessage;
  }
}

/**
 * Crittografa un array di messaggi (parallelizzato per performance)
 * @param {Array} messages - Array di messaggi da crittografare
 * @param {CryptoKey} key - Chiave di crittografia
 * @returns {Promise<Array>} - Array di messaggi crittografati
 */
export async function encryptMessages(messages, key) {
  // Parallelizza la crittografia per migliorare le performance
  const encryptionPromises = messages.map(async (message) => {
    if (message.content && typeof message.content === 'string') {
      try {
        const encryptedContent = await encryptMessage(message.content, key);
        return {
          ...message,
          content: encryptedContent
        };
      } catch (error) {
        console.error('❌ [ENCRYPTION] Errore crittografia messaggio:', error);
        // In caso di errore, mantieni il messaggio originale
        return message;
      }
    } else {
      return message;
    }
  });
  
  // Esegui tutte le crittografie in parallelo
  return await Promise.all(encryptionPromises);
}

/**
 * Decrittografa un array di messaggi (parallelizzato per performance)
 * @param {Array} messages - Array di messaggi crittografati
 * @param {CryptoKey} key - Chiave di crittografia
 * @returns {Promise<Array>} - Array di messaggi decrittografati
 */
export async function decryptMessages(messages, key) {
  // Parallelizza la decrittografia per migliorare le performance
  const decryptionPromises = messages.map(async (message) => {
    if (message.content && typeof message.content === 'string') {
      try {
        const decryptedContent = await decryptMessage(message.content, key);
        return {
          ...message,
          content: decryptedContent
        };
      } catch (error) {
        console.error('❌ [ENCRYPTION] Errore decrittografia messaggio:', error);
        // In caso di errore, mantieni il messaggio originale
        return message;
      }
    } else {
      return message;
    }
  });
  
  // Esegui tutte le decrittografie in parallelo
  return await Promise.all(decryptionPromises);
}

/**
 * Crittografa anche i metadati della chat (titolo, ecc.)
 * @param {Object} chat - Oggetto chat con titolo e messaggi
 * @param {CryptoKey} key - Chiave di crittografia
 * @returns {Promise<Object>} - Chat con metadati crittografati
 */
export async function encryptChatMetadata(chat, key) {
  const encryptedChat = { ...chat };
  
  // Crittografa il titolo se presente
  if (chat.title && typeof chat.title === 'string' && !chat.title.startsWith('encrypted:')) {
    try {
      encryptedChat.title = await encryptMessage(chat.title, key);
    } catch (error) {
      console.error('❌ [ENCRYPTION] Errore crittografia titolo:', error);
      // In caso di errore, mantieni il titolo originale
    }
  }
  
  // Crittografa i messaggi se presenti
  if (chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0) {
    encryptedChat.messages = await encryptMessages(chat.messages, key);
  }
  
  return encryptedChat;
}

/**
 * Decrittografa anche i metadati della chat (titolo, ecc.)
 * @param {Object} chat - Oggetto chat con metadati crittografati
 * @param {CryptoKey} key - Chiave di crittografia
 * @returns {Promise<Object>} - Chat con metadati decrittografati
 */
export async function decryptChatMetadata(chat, key) {
  const decryptedChat = { ...chat };
  
  // Decrittografa il titolo se presente
  if (chat.title && typeof chat.title === 'string' && chat.title.startsWith('encrypted:')) {
    try {
      decryptedChat.title = await decryptMessage(chat.title, key);
    } catch (error) {
      console.error('❌ [ENCRYPTION] Errore decrittografia titolo:', error);
      // In caso di errore, mantieni il titolo originale
    }
  }
  
  // Decrittografa i messaggi se presenti
  if (chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0) {
    decryptedChat.messages = await decryptMessages(chat.messages, key);
  }
  
  return decryptedChat;
}

/**
 * Crea una chiave di recupero per i messaggi vecchi dopo il cambio password
 * Questa funzione permette di mantenere l'accesso ai messaggi crittografati con la vecchia password
 * @param {string} oldPassword - Vecchia password
 * @param {string} newPassword - Nuova password
 * @param {string} userId - ID dell'utente
 * @returns {Promise<Object>} - Chiave di recupero crittografata con la nuova password
 */
export async function createRecoveryKey(oldPassword, newPassword, userId) {
  try {
    // Deriva la vecchia chiave
    const oldKey = await deriveEncryptionKey(oldPassword, userId);
    
    // Deriva la nuova chiave
    const newKey = await deriveEncryptionKey(newPassword, userId);
    
    // Esporta la vecchia chiave come raw bytes
    const oldKeyBytes = await crypto.subtle.exportKey('raw', oldKey);
    
    // Converti in base64 per memorizzazione
    const oldKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(oldKeyBytes)));
    
    // Crittografa la vecchia chiave con la nuova password
    // Usa un salt specifico per la chiave di recupero
    const encoder = new TextEncoder();
    const recoverySalt = encoder.encode(`recovery-key-${userId}`);
    
    const recoveryKeyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(newPassword),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const recoveryKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: recoverySalt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      recoveryKeyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Crittografa la vecchia chiave con la chiave di recupero
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedOldKey = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      recoveryKey,
      encoder.encode(oldKeyBase64)
    );
    
    // Combina IV e dati crittografati
    const combined = new Uint8Array(iv.length + encryptedOldKey.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedOldKey), iv.length);
    
    const recoveryKeyBase64 = btoa(String.fromCharCode(...combined));
    
    return {
      encryptedOldKey: `recovery:${recoveryKeyBase64}`,
      userId: userId
    };
  } catch (error) {
    console.error('❌ [ENCRYPTION] Errore creazione chiave di recupero:', error);
    throw new Error('Errore nella creazione della chiave di recupero');
  }
}

/**
 * Decrittografa la vecchia chiave usando la chiave di recupero
 * @param {string} encryptedRecoveryKey - Chiave di recupero crittografata
 * @param {string} newPassword - Nuova password
 * @param {string} userId - ID dell'utente
 * @returns {Promise<CryptoKey>} - Vecchia chiave di crittografia
 */
export async function decryptRecoveryKey(encryptedRecoveryKey, newPassword, userId) {
  try {
    if (!encryptedRecoveryKey.startsWith('recovery:')) {
      throw new Error('Formato chiave di recupero non valido');
    }
    
    // Deriva la chiave di recupero dalla nuova password
    const encoder = new TextEncoder();
    const recoverySalt = encoder.encode(`recovery-key-${userId}`);
    
    const recoveryKeyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(newPassword),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const recoveryKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: recoverySalt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      recoveryKeyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Decrittografa la vecchia chiave
    const base64 = encryptedRecoveryKey.substring(9);
    const binaryString = atob(base64);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const decryptedOldKeyBase64 = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      recoveryKey,
      encryptedData
    );
    
    // Converti da base64 a raw bytes
    const oldKeyBase64 = new TextDecoder().decode(decryptedOldKeyBase64);
    const oldKeyBinary = atob(oldKeyBase64);
    const oldKeyBytes = new Uint8Array(oldKeyBinary.length);
    for (let i = 0; i < oldKeyBinary.length; i++) {
      oldKeyBytes[i] = oldKeyBinary.charCodeAt(i);
    }
    
    // Importa la vecchia chiave
    const oldKey = await crypto.subtle.importKey(
      'raw',
      oldKeyBytes,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    return oldKey;
  } catch (error) {
    console.error('❌ [ENCRYPTION] Errore decrittografia chiave di recupero:', error);
    throw new Error('Errore nella decrittografia della chiave di recupero');
  }
}
