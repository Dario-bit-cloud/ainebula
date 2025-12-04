/**
 * Servizio per la generazione di immagini usando Pollinations.AI
 * API Documentation: https://github.com/pollinations/pollinations
 */

const POLLINATIONS_API_BASE = 'https://image.pollinations.ai';

// URL base del server per caricare immagini temporanee
const getServerBaseURL = () => {
  // In produzione, usa l'URL del server
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;
    
    // Se siamo su localhost, usa la porta 3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3001`;
    }
    
    // Altrimenti usa lo stesso host (per Vercel/produzione)
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  }
  
  return 'http://localhost:3001';
};

/**
 * Carica un'immagine sul server e ottiene un URL pubblico temporaneo
 * @param {string} imageDataUrl - Data URL dell'immagine (base64)
 * @returns {Promise<string>} URL pubblico dell'immagine
 */
async function uploadImageToServer(imageDataUrl) {
  try {
    const serverBaseURL = getServerBaseURL();
    const response = await fetch(`${serverBaseURL}/api/image/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageData: imageDataUrl })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Errore durante il caricamento dell\'immagine sul server');
    }

    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Errore upload immagine:', error);
    throw new Error(`Impossibile caricare l'immagine sul server: ${error.message}`);
  }
}

// Rate limit tracking
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 15000; // 15 secondi minimo tra le richieste

// Cache semplice per evitare richieste duplicate
const requestCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti

/**
 * Genera una chiave di cache per la richiesta
 */
function getCacheKey(prompt, options) {
  return JSON.stringify({
    prompt: prompt.trim(),
    model: options.model || 'flux',
    width: options.width || 1024,
    height: options.height || 1024,
    seed: options.seed || null,
    enhance: options.enhance || false,
    image: options.image || null
  });
}

/**
 * Attendi fino a quando è possibile fare una nuova richiesta
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`⏳ [RATE LIMIT] Attendo ${waitTime}ms prima della prossima richiesta`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Esegue una richiesta con retry automatico e backoff esponenziale
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Attendi prima di ogni tentativo (tranne il primo)
      if (attempt > 0) {
        // Backoff esponenziale: 2^attempt * 2 secondi (minimo 4s, massimo 32s)
        const backoffTime = Math.min(Math.pow(2, attempt) * 2000, 32000);
        console.log(`🔄 [RETRY] Tentativo ${attempt + 1}/${maxRetries + 1} dopo ${backoffTime}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
      
      // Attendi per rispettare il rate limit
      await waitForRateLimit();
      
      const response = await fetch(url, options);
      
      // Se riceviamo un 429, controlla l'header Retry-After
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const waitSeconds = parseInt(retryAfter, 10);
          console.log(`⏳ [RATE LIMIT] Server richiede attesa di ${waitSeconds} secondi`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
          // Riprova immediatamente dopo aver atteso
          continue;
        }
        
        // Se non c'è Retry-After, usa il backoff esponenziale
        if (attempt < maxRetries) {
          lastError = new Error('Rate limit raggiunto. Riprovo automaticamente...');
          continue;
        }
        
        throw new Error('Rate limit raggiunto. Attendi qualche secondo e riprova. (Rate limit: 1 richiesta ogni 15s per utenti anonimi)');
      }
      
      // Se la richiesta è andata a buon fine, ritorna la risposta
      if (response.ok) {
        return response;
      }
      
      // Per altri errori, lancia un'eccezione
      const errorText = await response.text();
      throw new Error(`Errore API: ${response.status} ${response.statusText}. ${errorText}`);
      
    } catch (error) {
      lastError = error;
      
      // Se è un AbortError, non riprovare
      if (error.name === 'AbortError') {
        throw error;
      }
      
      // Se abbiamo ancora tentativi disponibili, continua
      if (attempt < maxRetries) {
        console.warn(`⚠️ [RETRY] Errore al tentativo ${attempt + 1}:`, error.message);
        continue;
      }
    }
  }
  
  // Se tutti i tentativi sono falliti, lancia l'ultimo errore
  throw lastError;
}

/**
 * Modelli disponibili su Pollinations.AI
 */
export const AVAILABLE_MODELS = [
  { value: 'flux', label: 'Flux (Default - High Quality)' },
  { value: 'turbo', label: 'Turbo (Fast)' },
  { value: 'stable-diffusion', label: 'Stable Diffusion' },
  { value: 'sdxl-lightning', label: 'SDXL Lightning (Ultra Fast)' },
  { value: 'kontext', label: 'Kontext (Image-to-Image)' }
];

/**
 * Dimensioni supportate
 */
export const AVAILABLE_SIZES = [
  { value: '1024x1024', label: 'Square (1024x1024)' },
  { value: '1920x1080', label: 'Landscape (1920x1080)' },
  { value: '1080x1920', label: 'Portrait (1080x1920)' },
  { value: '1280x720', label: 'HD (1280x720)' },
  { value: '1920x1080', label: 'Full HD (1920x1080)' }
];

/**
 * Genera un'immagine usando Pollinations.AI
 * @param {string} prompt - Il prompt di testo per generare l'immagine
 * @param {Object} options - Opzioni per la generazione
 * @param {string} options.model - Modello da usare (flux, turbo, stable-diffusion, kontext)
 * @param {number} options.width - Larghezza in pixel
 * @param {number} options.height - Altezza in pixel
 * @param {number} options.seed - Seed per risultati consistenti (opzionale)
 * @param {boolean} options.enhance - Migliora automaticamente il prompt (default: false)
 * @param {boolean} options.private - Nascondi l'immagine dai feed pubblici (default: false)
 * @param {string} options.image - URL dell'immagine per image-to-image (solo con modello kontext)
 * @param {AbortController} abortController - Controller per annullare la richiesta
 * @returns {Promise<Object>} Oggetto con l'URL dell'immagine generata e metadati
 */
export async function generateImage(prompt, options = {}, abortController = null) {
  if (!prompt || !prompt.trim()) {
    throw new Error('Il prompt non può essere vuoto');
  }

  const {
    model = 'flux',
    width = 1024,
    height = 1024,
    seed = null,
    enhance = false,
    private: isPrivate = false,
    image = null // Per image-to-image
  } = options;

  // Valida il modello
  const validModels = AVAILABLE_MODELS.map(m => m.value);
  if (!validModels.includes(model)) {
    throw new Error(`Modello non valido: ${model}. Modelli disponibili: ${validModels.join(', ')}`);
  }

  // Per image-to-image, il modello deve essere kontext
  if (image && model !== 'kontext') {
    throw new Error('Il modello kontext è richiesto per image-to-image generation');
  }

  // Crea l'URL con il prompt codificato
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const url = new URL(`${POLLINATIONS_API_BASE}/prompt/${encodedPrompt}`);

  // Aggiungi i parametri
  url.searchParams.set('model', model);
  url.searchParams.set('width', width.toString());
  url.searchParams.set('height', height.toString());
  
  if (seed !== null && seed !== undefined) {
    url.searchParams.set('seed', seed.toString());
  }
  
  if (enhance) {
    url.searchParams.set('enhance', 'true');
  }
  
  if (isPrivate) {
    url.searchParams.set('private', 'true');
  }

  // Per image-to-image, converti il data URL in un URL pubblico se necessario
  let publicImageUrl = image;
  if (image && image.startsWith('data:image/')) {
    // Se è un data URL, caricalo sul server per ottenere un URL pubblico
    console.log('📤 [IMAGE UPLOAD] Caricamento immagine sul server...');
    publicImageUrl = await uploadImageToServer(image);
    console.log('✅ [IMAGE UPLOAD] Immagine caricata:', publicImageUrl);
  }
  
  if (publicImageUrl) {
    url.searchParams.set('image', publicImageUrl);
  }

  // Controlla la cache prima di fare la richiesta
  const cacheKey = getCacheKey(prompt, { model, width, height, seed, enhance, image });
  const cached = requestCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('✅ [CACHE] Immagine recuperata dalla cache');
    return {
      ...cached.data,
      imageUrl: URL.createObjectURL(cached.data.blob) // Ricrea l'URL dal blob
    };
  }

  console.log(`Generating image with Pollinations.AI:`, {
    model,
    width,
    height,
    prompt: prompt.substring(0, 50) + '...'
  });

  // Crea controller se non fornito
  const controller = abortController || new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minuti timeout

  try {
    // Usa fetchWithRetry per gestire automaticamente i rate limit
    const response = await fetchWithRetry(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'image/*'
      }
    });

    clearTimeout(timeoutId);

    if (response.status === 400) {
      throw new Error('Richiesta non valida. Controlla il prompt e i parametri.');
    }

    // Pollinations.AI restituisce direttamente l'immagine
    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);

    const result = {
      imageUrl,
      blob: imageBlob, // Mantieni il blob per il download
      prompt: prompt,
      model,
      width,
      height,
      seed: seed || null,
      provider: 'Pollinations.AI'
    };

    // Salva nella cache
    requestCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // Pulisci la cache vecchia (mantieni solo gli ultimi 50 elementi)
    if (requestCache.size > 50) {
      const entries = Array.from(requestCache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      requestCache.clear();
      entries.slice(0, 50).forEach(([key, value]) => {
        requestCache.set(key, value);
      });
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Generazione immagine interrotta dall\'utente.');
    }

    throw error;
  }
}

/**
 * Genera più immagini da un prompt
 * @param {string} prompt - Il prompt di testo
 * @param {number} count - Numero di immagini da generare
 * @param {Object} options - Opzioni per la generazione
 * @param {AbortController} abortController - Controller per annullare la richiesta
 * @returns {Promise<Array>} Array di oggetti con le immagini generate
 */
export async function generateMultipleImages(prompt, count = 1, options = {}, abortController = null) {
  if (count <= 0 || count > 10) {
    throw new Error('Il numero di immagini deve essere tra 1 e 10');
  }

  const images = [];
  const controller = abortController || new AbortController();

  for (let i = 0; i < count; i++) {
    try {
      // Il rate limit è già gestito automaticamente da generateImage
      // Non serve aggiungere delay manuale qui, waitForRateLimit lo gestisce

      const result = await generateImage(prompt, {
        ...options,
        seed: options.seed ? options.seed + i : null // Varia il seed per ogni immagine
      }, controller);

      images.push({
        ...result,
        index: i + 1
      });
    } catch (error) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        throw new Error('Generazione interrotta');
      }

      console.error(`Errore generazione immagine ${i + 1}:`, error);
      
      images.push({
        error: error.message,
        index: i + 1
      });
    }
  }

  return images;
}

/**
 * Ottiene la lista dei modelli disponibili
 * @returns {Promise<Array>} Array di modelli disponibili
 */
export async function getAvailableModels() {
  try {
    const response = await fetch(`${POLLINATIONS_API_BASE}/models`);
    if (!response.ok) {
      // Se l'endpoint non è disponibile, ritorna i modelli hardcoded
      return AVAILABLE_MODELS;
    }
    const models = await response.json();
    return models.map(model => ({
      value: model,
      label: model.charAt(0).toUpperCase() + model.slice(1)
    }));
  } catch (error) {
    console.warn('Impossibile recuperare i modelli, uso lista predefinita:', error);
    return AVAILABLE_MODELS;
  }
}

/**
 * Converte una dimensione stringa (es. "1024x1024") in oggetto width/height
 * @param {string} sizeString - Stringa nel formato "widthxheight"
 * @returns {Object} Oggetto con width e height
 */
export function parseSize(sizeString) {
  const [width, height] = sizeString.split('x').map(Number);
  return { width, height };
}
