// Servizio di crittografia end-to-end per i messaggi delle chat
// Usa Web Crypto API per crittografare i messaggi lato client

/**
 * Deriva una chiave di crittografia dalla password dell'utente
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
 * Genera una chiave di crittografia e la memorizza in modo sicuro
 * Questa funzione crea una chiave basata sulla password dell'utente
 * @param {string} password - Password dell'utente
 * @param {string} userId - ID dell'utente
 * @returns {Promise<CryptoKey>} - Chiave di crittografia
 */
export async function getOrCreateEncryptionKey(password, userId) {
  // Controlla se esiste già una chiave memorizzata
  const storageKey = `encryption_key_${userId}`;
  const storedKeyData = localStorage.getItem(storageKey);
  
  if (storedKeyData) {
    try {
      // Prova a importare la chiave memorizzata
      const keyData = JSON.parse(storedKeyData);
      const key = await crypto.subtle.importKey(
        'jwk',
        keyData,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['encrypt', 'decrypt']
      );
      return key;
    } catch (error) {
      console.warn('⚠️ [ENCRYPTION] Chiave memorizzata non valida, ne creo una nuova');
      // Se la chiave memorizzata non è valida, ne crea una nuova
    }
  }
  
  // Deriva una nuova chiave dalla password
  const key = await deriveEncryptionKey(password, userId);
  
  // Memorizza la chiave in formato JWK (solo per questa sessione)
  // NOTA: In produzione, potresti voler memorizzare solo un hash della password
  // e derivare la chiave ogni volta. Per ora, memorizziamo la chiave per comodità.
  try {
    const keyData = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem(storageKey, JSON.stringify(keyData));
  } catch (error) {
    console.warn('⚠️ [ENCRYPTION] Impossibile memorizzare la chiave:', error);
  }
  
  return key;
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
 * Crittografa un array di messaggi
 * @param {Array} messages - Array di messaggi da crittografare
 * @param {CryptoKey} key - Chiave di crittografia
 * @returns {Promise<Array>} - Array di messaggi crittografati
 */
export async function encryptMessages(messages, key) {
  const encryptedMessages = [];
  
  for (const message of messages) {
    if (message.content && typeof message.content === 'string') {
      try {
        const encryptedContent = await encryptMessage(message.content, key);
        encryptedMessages.push({
          ...message,
          content: encryptedContent
        });
      } catch (error) {
        console.error('❌ [ENCRYPTION] Errore crittografia messaggio:', error);
        // In caso di errore, mantieni il messaggio originale
        encryptedMessages.push(message);
      }
    } else {
      encryptedMessages.push(message);
    }
  }
  
  return encryptedMessages;
}

/**
 * Decrittografa un array di messaggi
 * @param {Array} messages - Array di messaggi crittografati
 * @param {CryptoKey} key - Chiave di crittografia
 * @returns {Promise<Array>} - Array di messaggi decrittografati
 */
export async function decryptMessages(messages, key) {
  const decryptedMessages = [];
  
  for (const message of messages) {
    if (message.content && typeof message.content === 'string') {
      try {
        const decryptedContent = await decryptMessage(message.content, key);
        decryptedMessages.push({
          ...message,
          content: decryptedContent
        });
      } catch (error) {
        console.error('❌ [ENCRYPTION] Errore decrittografia messaggio:', error);
        // In caso di errore, mantieni il messaggio originale
        decryptedMessages.push(message);
      }
    } else {
      decryptedMessages.push(message);
    }
  }
  
  return decryptedMessages;
}

/**
 * Ottiene la chiave di crittografia per l'utente corrente
 * Questa funzione cerca di ottenere la chiave dalla password memorizzata
 * o dalla sessione corrente
 * @param {string} userId - ID dell'utente
 * @returns {Promise<CryptoKey|null>} - Chiave di crittografia o null se non disponibile
 */
export async function getEncryptionKeyForUser(userId) {
  try {
    const storageKey = `encryption_key_${userId}`;
    const storedKeyData = localStorage.getItem(storageKey);
    
    if (!storedKeyData) {
      console.warn('⚠️ [ENCRYPTION] Nessuna chiave trovata per l\'utente');
      return null;
    }
    
    const keyData = JSON.parse(storedKeyData);
    const key = await crypto.subtle.importKey(
      'jwk',
      keyData,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    return key;
  } catch (error) {
    console.error('❌ [ENCRYPTION] Errore recupero chiave:', error);
    return null;
  }
}

/**
 * Inizializza la crittografia per un utente dopo il login
 * Questa funzione dovrebbe essere chiamata dopo un login riuscito
 * @param {string} password - Password dell'utente (non memorizzata)
 * @param {string} userId - ID dell'utente
 * @returns {Promise<CryptoKey>} - Chiave di crittografia
 */
export async function initializeEncryption(password, userId) {
  return await getOrCreateEncryptionKey(password, userId);
}

/**
 * Rimuove la chiave di crittografia dalla memoria locale (logout)
 * @param {string} userId - ID dell'utente
 */
export function clearEncryptionKey(userId) {
  const storageKey = `encryption_key_${userId}`;
  localStorage.removeItem(storageKey);
  console.log('🔒 [ENCRYPTION] Chiave di crittografia rimossa');
}







