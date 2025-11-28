/**
 * Servizio per la generazione di immagini usando Pollinations.AI
 * API Documentation: https://github.com/pollinations/pollinations
 */

const POLLINATIONS_API_BASE = 'https://image.pollinations.ai';

/**
 * Modelli disponibili su Pollinations.AI
 */
export const AVAILABLE_MODELS = [
  { value: 'flux', label: 'Flux (Default - High Quality)' },
  { value: 'turbo', label: 'Turbo (Fast)' },
  { value: 'stable-diffusion', label: 'Stable Diffusion' },
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

  // Per image-to-image
  if (image) {
    url.searchParams.set('image', image);
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
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'image/*'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      
      // Gestisci errori specifici
      if (response.status === 429) {
        throw new Error('Troppe richieste. Attendi qualche secondo e riprova. (Rate limit: 1 richiesta ogni 15s per utenti anonimi)');
      }
      
      if (response.status === 400) {
        throw new Error('Richiesta non valida. Controlla il prompt e i parametri.');
      }

      throw new Error(`Errore API: ${response.status} ${response.statusText}. ${errorText}`);
    }

    // Pollinations.AI restituisce direttamente l'immagine
    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);

    return {
      imageUrl,
      blob: imageBlob, // Mantieni il blob per il download
      prompt: prompt,
      model,
      width,
      height,
      seed: seed || null,
      provider: 'Pollinations.AI'
    };
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
      // Aggiungi delay tra le richieste per rispettare i rate limits
      // Pollinations.AI ha un rate limit di 1 richiesta ogni 15s per utenti anonimi
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 16000)); // 16 secondi per sicurezza
      }

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
