import { IMAGE_GENERATION_CONFIG } from '../config/api.js';

/**
 * Genera un'immagine da un prompt di testo utilizzando l'API di generazione immagini
 * @param {string} prompt - Il prompt di testo per generare l'immagine
 * @param {Object} options - Opzioni per la generazione
 * @param {string} options.size - Dimensioni dell'immagine (1024x1024, 1024x1792, 1792x1024)
 * @param {string} options.quality - Qualità dell'immagine ('standard' o 'hd')
 * @param {string} options.style - Stile dell'immagine ('vivid' o 'natural')
 * @param {number} options.seed - Seed per la generazione (opzionale)
 * @param {AbortController} abortController - Controller per annullare la richiesta
 * @returns {Promise<Object>} Oggetto con l'URL dell'immagine generata e il prompt utilizzato
 */
/**
 * Prova a generare un'immagine con un provider specifico
 */
async function tryGenerateWithProvider(provider, prompt, options, controller) {
  const {
    size = IMAGE_GENERATION_CONFIG.defaultSize,
    quality = IMAGE_GENERATION_CONFIG.defaultQuality,
    style = IMAGE_GENERATION_CONFIG.defaultStyle,
    seed = null
  } = options;

  const requestBody = {
    model: 'dall-e-3',
    prompt: prompt.trim(),
    n: 1,
    size: size,
    quality: quality,
    style: style
  };

  if (seed !== null && seed !== -1) {
    requestBody.seed = seed;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.apiKey}`
  };

  console.log(`Trying image generation with ${provider.name}:`, {
    url: `${provider.baseURL}/images/generations`,
    prompt: prompt
  });

  const response = await fetch(`${provider.baseURL}/images/generations`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody),
    signal: controller.signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      errorData = { error: { message: errorText || `HTTP ${response.status}: ${response.statusText}` } };
    }

    // Se è un errore di crediti (402) o autenticazione (401), prova il prossimo provider
    if (response.status === 402 || response.status === 401) {
      throw new Error('PROVIDER_ERROR'); // Errore speciale per indicare di provare il prossimo provider
    }

    // Per altri errori, lancia l'errore normale
    const errorMessage = errorData.error?.message || `API Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  if (!data.data || !data.data[0] || !data.data[0].url) {
    throw new Error('Risposta API non valida: URL immagine non trovato');
  }

  return {
    imageUrl: data.data[0].url,
    prompt: data.data[0].revised_prompt || prompt,
    originalPrompt: prompt,
    size: size,
    quality: quality,
    style: style,
    seed: seed,
    provider: provider.name
  };
}

export async function generateImage(prompt, options = {}, abortController = null) {
  if (!prompt || !prompt.trim()) {
    throw new Error('Il prompt non può essere vuoto');
  }

  // Ordina i provider per priorità
  const providers = [...IMAGE_GENERATION_CONFIG.providers].sort((a, b) => a.priority - b.priority);

  // Crea controller se non fornito
  const controller = abortController || new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_GENERATION_CONFIG.timeout);

  let lastError = null;

  // Prova ogni provider in ordine di priorità
  for (const provider of providers) {
    try {
      clearTimeout(timeoutId);
      const newTimeoutId = setTimeout(() => controller.abort(), IMAGE_GENERATION_CONFIG.timeout);
      
      const result = await tryGenerateWithProvider(provider, prompt, options, controller);
      
      clearTimeout(newTimeoutId);
      
      console.log(`✅ Image generated successfully with ${provider.name}:`, {
        url: result.imageUrl,
        revisedPrompt: result.prompt
      });

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      console.warn(`⚠️ Provider ${provider.name} failed:`, error.message);
      
      // Se è un errore di provider (402/401), continua con il prossimo
      if (error.message === 'PROVIDER_ERROR') {
        lastError = error;
        continue;
      }

      // Se è un errore di abort, lancialo immediatamente
      if (error.name === 'AbortError') {
        throw new Error('Generazione immagine interrotta dall\'utente.');
      }

      // Se è l'ultimo provider, lancia l'errore
      if (provider === providers[providers.length - 1]) {
        lastError = error;
        break;
      }

      // Altrimenti continua con il prossimo provider
      lastError = error;
    }
  }

  // Se tutti i provider hanno fallito
  console.error('❌ All image generation providers failed');
  
  // Messaggio più user-friendly
  if (lastError?.message?.includes('402') || lastError?.message?.includes('Crediti')) {
    throw new Error('Tutti i provider di generazione immagini hanno esaurito i crediti. Riprova più tardi o contatta il supporto.');
  }

  throw new Error(`Errore nella generazione dell'immagine: ${lastError?.message || 'Tutti i provider hanno fallito'}`);
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
  if (count <= 0 || count > 4) {
    throw new Error('Il numero di immagini deve essere tra 1 e 4');
  }

  const images = [];
  for (let i = 0; i < count; i++) {
    try {
      const result = await generateImage(prompt, options, abortController);
      images.push(result);
    } catch (error) {
      // Se una generazione fallisce, aggiungi l'errore all'array
      images.push({
        error: error.message,
        index: i
      });
    }
  }

  return images;
}

