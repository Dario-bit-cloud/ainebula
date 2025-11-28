// Cache per API responses con TTL
const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minuti di default

/**
 * Ottiene dati dalla cache o li recupera tramite fetcher
 * @param {string} key - Chiave univoca per la cache
 * @param {Function} fetcher - Funzione async che recupera i dati
 * @param {number} ttl - Time to live in millisecondi
 * @returns {Promise<any>}
 */
export async function getCachedData(key, fetcher, ttl = DEFAULT_TTL) {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  
  // Limita la dimensione della cache (rimuove i più vecchi se supera 100 entry)
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  
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

