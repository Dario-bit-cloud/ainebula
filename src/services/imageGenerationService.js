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
export async function generateImage(prompt, options = {}, abortController = null) {
  if (!prompt || !prompt.trim()) {
    throw new Error('Il prompt non può essere vuoto');
  }

  const {
    size = IMAGE_GENERATION_CONFIG.defaultSize,
    quality = IMAGE_GENERATION_CONFIG.defaultQuality,
    style = IMAGE_GENERATION_CONFIG.defaultStyle,
    seed = null
  } = options;

  // Crea controller se non fornito
  const controller = abortController || new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_GENERATION_CONFIG.timeout);

  try {
    // Prepara la richiesta
    const requestBody = {
      model: 'dall-e-3',
      prompt: prompt.trim(),
      n: 1, // Numero di immagini da generare
      size: size,
      quality: quality,
      style: style
    };

    // Aggiungi seed se fornito (solo per alcuni modelli)
    if (seed !== null && seed !== -1) {
      requestBody.seed = seed;
    }

    // Headers per API (compatibile OpenAI)
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${IMAGE_GENERATION_CONFIG.apiKey}`
    };

    console.log('Calling Image Generation API:', {
      url: `${IMAGE_GENERATION_CONFIG.baseURL}/images/generations`,
      prompt: prompt,
      size: size,
      quality: quality,
      style: style
    });

    const response = await fetch(`${IMAGE_GENERATION_CONFIG.baseURL}/images/generations`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('Image Generation API Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image Generation API Error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: errorText || `HTTP ${response.status}: ${response.statusText}` } };
      }

      // Messaggio più chiaro per errori comuni
      let errorMessage = errorData.error?.message || `API Error: ${response.status} ${response.statusText}`;

      if (response.status === 401) {
        errorMessage = 'API Key non valida o scaduta. Verifica la tua API key in src/config/api.js';
      } else if (response.status === 429) {
        errorMessage = 'Troppe richieste. Limite di rate raggiunto. Aspetta un attimo e riprova.';
      } else if (response.status === 402) {
        errorMessage = 'Crediti insufficienti per la generazione di immagini.';
      } else if (response.status === 400) {
        // Errore di validazione del prompt
        if (errorMessage.includes('prompt')) {
          errorMessage = 'Il prompt contiene contenuti non consentiti o è troppo lungo. Prova con un prompt diverso.';
        }
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      throw new Error('Risposta API non valida: URL immagine non trovato');
    }

    const imageUrl = data.data[0].url;
    const revisedPrompt = data.data[0].revised_prompt || prompt; // Il prompt rivisto dall'API

    console.log('Image generated successfully:', {
      url: imageUrl,
      revisedPrompt: revisedPrompt
    });

    return {
      imageUrl: imageUrl,
      prompt: revisedPrompt,
      originalPrompt: prompt,
      size: size,
      quality: quality,
      style: style,
      seed: seed
    };

  } catch (error) {
    console.error('❌ Error calling Image Generation API:', error);

    // Se è un errore di timeout o rete, ritorna un messaggio specifico
    if (error.name === 'AbortError') {
      throw new Error('Generazione immagine interrotta dall\'utente.');
    }

    if (error.message.includes('API Error') || error.message.includes('API Key')) {
      throw error;
    }

    // Per altri errori, rigenera l'errore con un messaggio più chiaro
    throw new Error(`Errore nella generazione dell'immagine: ${error.message}`);
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

