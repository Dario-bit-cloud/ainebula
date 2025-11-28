import { IMAGE_GENERATION_CONFIG, IMAGE_GENERATION_CONFIG_FAST, IMAGE_GENERATION_CONFIG_FLUX, MODEL_MAPPING } from '../config/api.js';
import { get } from 'svelte/store';
import { user as userStore } from '../stores/user.js';
import { hasActiveSubscription } from '../stores/user.js';
import { selectedModel } from '../stores/models.js';

/**
 * Verifica se l'utente può generare immagini
 * @returns {Object} { allowed: boolean, message: string }
 */
function checkImageGenerationPermission() {
  try {
    const user = get(userStore);
    const hasSubscription = hasActiveSubscription();
    const subscription = user?.subscription;
    
    // Se non ha abbonamento
    if (!hasSubscription || !subscription || !subscription.active) {
      return {
        allowed: false,
        message: 'La generazione di immagini è disponibile solo per gli utenti con abbonamento Premium. Passa a Premium per sbloccare questa funzionalità!'
      };
    }
    
    // Verifica se è in trial gratuito (controlla se c'è un campo trial o se expiresAt è molto vicino)
    const isTrial = subscription.status === 'trial' || 
                    subscription.status === 'free_trial' || 
                    (subscription.expiresAt && new Date(subscription.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Se scade tra meno di 7 giorni potrebbe essere trial
    
    if (isTrial) {
      return {
        allowed: false,
        message: 'La generazione di immagini non è disponibile durante la prova gratuita. Attiva un abbonamento Premium per utilizzare questa funzionalità.'
      };
    }
    
    // Se ha abbonamento attivo ma non è Premium/Max/Pro
    if (subscription.plan !== 'premium' && subscription.plan !== 'max' && subscription.plan !== 'pro') {
      return {
        allowed: false,
        message: 'La generazione di immagini è disponibile solo per gli utenti con abbonamento Premium. Passa a Premium per sbloccare questa funzionalità!'
      };
    }
    
    // Se ha abbonamento Premium/Max/Pro attivo
    if (subscription.active && (subscription.plan === 'premium' || subscription.plan === 'max' || subscription.plan === 'pro')) {
      return {
        allowed: true,
        message: null
      };
    }
    
    // Default: non permesso
    return {
      allowed: false,
      message: 'La generazione di immagini è disponibile solo per gli utenti con abbonamento Premium attivo.'
    };
  } catch (error) {
    console.error('Errore verifica permessi generazione immagini:', error);
    return {
      allowed: false,
      message: 'Errore di rete: impossibile verificare i permessi. La generazione di immagini è temporaneamente non disponibile.'
    };
  }
}

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
  // Controllo di sicurezza aggiuntivo: verifica permessi anche qui
  const permissionCheck = checkImageGenerationPermission();
  if (!permissionCheck.allowed) {
    // Simula errore di rete per prevenire bypass
    const networkError = new Error('NETWORK_ERROR');
    networkError.message = permissionCheck.message;
    networkError.isPermissionError = true;
    throw networkError;
  }

  // Determina quale configurazione usare in base al provider
  const configToUse = provider.imageModel === 'flux' ? IMAGE_GENERATION_CONFIG_FLUX : IMAGE_GENERATION_CONFIG_FAST;
  
  const {
    size = configToUse.defaultSize,
    quality = configToUse.defaultQuality,
    style = configToUse.defaultStyle,
    seed = null
  } = options;

  // Usa il modello del provider
  const modelToUse = provider.imageModel;

  // Seguendo la guida LLM7.io: https://docs.llm7.io/
  // Formato corretto secondo la documentazione ufficiale
  // Secondo il tutorial: client.images.generate(model="flux", prompt=prompt, size="1024x1024", extra_body={"seed": 42, "nologo": True})
  const requestBody = {
    model: modelToUse, // 'flux' o 'turbo' (o alias '1', '2', 'image-model-1', 'image-model-2')
    prompt: prompt.trim(),
    size: size,
    response_format: 'url'
  };

  // LLM7 usa extra_body per parametri aggiuntivi come seed e nologo
  // Secondo la documentazione: extra_body={"seed": 42, "nologo": True}
  // Per richieste HTTP dirette, extra_body viene incluso come campo nel body JSON
  const extraBody = {};
  if (seed !== null && seed !== -1) {
    extraBody.seed = seed;
  }
  
  // nologo è disponibile solo su piani a pagamento
  // Per ora non lo includiamo di default (richiede piano pagato)
  // if (options.nologo === true) {
  //   extraBody.nologo = true;
  // }
  
  // Aggiungi extra_body se ci sono parametri
  // Il formato HTTP richiede extra_body come campo separato nel body JSON
  if (Object.keys(extraBody).length > 0) {
    requestBody.extra_body = extraBody;
  }
  
  // Nota: quality e style non sono supportati da LLM7 secondo la documentazione
  // Rimossi per seguire il formato ufficiale

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

  // BLOCCA LA GENERAZIONE: Verifica permessi prima di procedere
  const permissionCheck = checkImageGenerationPermission();
  if (!permissionCheck.allowed) {
    // Simula un errore di rete per prevenire bypass
    const networkError = new Error('NETWORK_ERROR');
    networkError.message = permissionCheck.message;
    networkError.isPermissionError = true;
    throw networkError;
  }

  // Determina quale modello usare per le immagini
  // Usa il modello specificato nelle opzioni o 'fast' come default
  const currentModelId = get(selectedModel);
  const modelConfig = MODEL_MAPPING[currentModelId];
  let imageModel = options.imageModel;
  
  // Se il modello selezionato ha imageModel configurato, usalo
  if (modelConfig?.imageModel) {
    imageModel = modelConfig.imageModel;
  }
  
  // Default a 'fast' se non specificato
  imageModel = imageModel || 'fast';
  
  // Determina quale configurazione usare
  const configToUse = imageModel === 'flux' ? IMAGE_GENERATION_CONFIG_FLUX : IMAGE_GENERATION_CONFIG_FAST;
  
  // Ordina i provider per priorità
  const providers = [...configToUse.providers].sort((a, b) => a.priority - b.priority);

  // Crea controller se non fornito
  const controller = abortController || new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), configToUse.timeout);

  let lastError = null;

  // Prova ogni provider in ordine di priorità
  for (const provider of providers) {
    try {
      clearTimeout(timeoutId);
      const newTimeoutId = setTimeout(() => controller.abort(), configToUse.timeout);
      
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
  
  // Se è un errore di permessi, usa il messaggio personalizzato
  if (lastError?.isPermissionError) {
    throw lastError;
  }
  
  // Se è un errore di rete (potrebbe essere un bypass), mostra messaggio di errore di rete
  if (lastError?.message === 'NETWORK_ERROR' || lastError?.name === 'NetworkError' || lastError?.name === 'TypeError') {
    throw new Error('Errore di rete: La generazione di immagini non è disponibile. Questa funzionalità è riservata agli utenti Premium.');
  }
  
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

