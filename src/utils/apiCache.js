// Cache per API responses con TTL e LRU (Least Recently Used)
// Usa Map che mantiene l'ordine di inserimento per implementare LRU
const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minuti di default
const MAX_CACHE_SIZE = 200; // Aumentato per migliori performance

/**
 * Ottiene dati dalla cache o li recupera tramite fetcher
 * Implementa LRU (Least Recently Used) per gestire la cache in modo efficiente
 * @param {string} key - Chiave univoca per la cache
 * @param {Function} fetcher - Funzione async che recupera i dati
 * @param {number} ttl - Time to live in millisecondi
 * @returns {Promise<any>}
 */
export async function getCachedData(key, fetcher, ttl = DEFAULT_TTL) {
  const now = Date.now();
  const cached = cache.get(key);
  
  // Verifica se la cache è valida
  if (cached && now - cached.timestamp < ttl) {
    // Sposta la chiave alla fine (LRU: più recentemente usata)
    cache.delete(key);
    cache.set(key, cached);
    return cached.data;
  }
  
  // Rimuovi entry scadute prima di aggiungere nuove
  if (cache.size >= MAX_CACHE_SIZE) {
    // Rimuovi le entry più vecchie (LRU)
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  
  // Recupera i dati
  const data = await fetcher();
  
  // Salva nella cache (alla fine, più recente)
  cache.set(key, { data, timestamp: now });
  
  return data;
}

/**
 * Invalida una entry dalla cache
 */
export function invalidateCache(key) {
  cache.delete(key);
}

/**
 * Pulisce tutta la cache
 */
export function clearCache() {
  cache.clear();
}

/**
 * Ottiene tutte le chiavi nella cache
 */
export function getCacheKeys() {
  return Array.from(cache.keys());
}

