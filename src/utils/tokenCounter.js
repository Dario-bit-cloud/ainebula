// Stima approssimativa dei token basata su caratteri
// Regola generale: 1 token ≈ 4 caratteri per testo inglese
// Per italiano è leggermente diverso ma usiamo questa approssimazione

// Cache per memoization
const tokenCache = new Map();
const MAX_CACHE_SIZE = 1000; // Limita la dimensione della cache

// Genera una chiave per la cache basata sul contenuto
function generateCacheKey(messages) {
  return messages.map(m => ({
    len: m.content?.length || 0,
    img: m.images?.length || 0,
    type: m.type
  })).join('|');
}

export function estimateTokens(text) {
  if (!text) return 0;
  // Rimuovi spazi extra e conta caratteri
  const cleanText = text.trim();
  // Stima: ~1 token per 3-4 caratteri (più conservativo per italiano)
  return Math.ceil(cleanText.length / 3.5);
}

export function estimateMessageTokens(message) {
  let tokens = 0;
  
  if (message.content) {
    tokens += estimateTokens(message.content);
  }
  
  // Immagini aggiungono token (approssimativamente ~85 token per immagine per vision models)
  if (message.images && message.images.length > 0) {
    tokens += message.images.length * 85;
  }
  
  return tokens;
}

export function estimateChatTokens(chatHistory) {
  if (!chatHistory || chatHistory.length === 0) {
    return 100; // Solo overhead
  }
  
  // Usa cache per evitare ricalcoli
  const cacheKey = generateCacheKey(chatHistory);
  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey);
  }
  
  let totalTokens = 0;
  
  for (const message of chatHistory) {
    totalTokens += estimateMessageTokens(message);
  }
  
  // Aggiungi overhead per system prompt e formattazione
  totalTokens += 100; // Overhead approssimativo
  
  // Limita la dimensione della cache
  if (tokenCache.size >= MAX_CACHE_SIZE) {
    // Rimuovi il primo elemento (FIFO)
    const firstKey = tokenCache.keys().next().value;
    tokenCache.delete(firstKey);
  }
  
  tokenCache.set(cacheKey, totalTokens);
  return totalTokens;
}

// Funzione per pulire la cache se necessario
export function clearTokenCache() {
  tokenCache.clear();
}

