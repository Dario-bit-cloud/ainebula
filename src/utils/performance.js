// Utility per performance: debounce, throttle, memoization

/**
 * Debounce: esegue la funzione solo dopo che è passato un certo tempo dall'ultima chiamata
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle: esegue la funzione al massimo una volta ogni X millisecondi
 */
export function throttle(func, wait) {
  let timeout;
  let previous = 0;
  return function executedFunction(...args) {
    const now = Date.now();
    const remaining = wait - (now - previous);
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}

/**
 * Memoization: cachea i risultati di funzioni costose
 */
export function memoize(fn, keyGenerator = null) {
  const cache = new Map();
  return function memoized(...args) {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Cache con TTL (Time To Live)
 */
export function createCache(ttl = 5 * 60 * 1000) { // Default 5 minuti
  const cache = new Map();
  
  return {
    get(key) {
      const item = cache.get(key);
      if (!item) return null;
      if (Date.now() - item.timestamp > ttl) {
        cache.delete(key);
        return null;
      }
      return item.data;
    },
    set(key, data) {
      cache.set(key, { data, timestamp: Date.now() });
    },
    clear() {
      cache.clear();
    },
    delete(key) {
      cache.delete(key);
    }
  };
}

