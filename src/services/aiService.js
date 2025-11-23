import { API_CONFIG, MODEL_MAPPING } from '../config/api.js';
import { get } from 'svelte/store';
import { aiSettings } from '../stores/aiSettings.js';

/**
 * Converte la storia della chat nel formato richiesto dall'API OpenAI/Electron Hub
 */
function formatChatHistory(chatHistory, systemPrompt) {
  const messages = [];
  
  // Messaggio di sistema personalizzabile
  const settings = get(aiSettings);
  const currentSystemPrompt = systemPrompt || settings.systemPrompt || 'Sei Nebula AI, un assistente AI utile, amichevole e professionale. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.';
  
  messages.push({
    role: 'system',
    content: currentSystemPrompt
  });
  
  // Converti la cronologia della chat
  for (const msg of chatHistory) {
    if (msg.type === 'user') {
      const hasImages = msg.images && msg.images.length > 0;
      const hasText = msg.content && msg.content.trim();
      
      if (hasImages) {
        // Se ci sono immagini, il content deve essere un array
        const content = [];
        
        // Aggiungi il testo se presente
        if (hasText) {
          content.push({
            type: 'text',
            text: msg.content
          });
        }
        
        // Aggiungi le immagini
        for (const img of msg.images) {
          // Il formato per OpenAI/AIMLAPI richiede che l'immagine sia in formato base64 data URL
          let imageUrl = img.url;
          if (!imageUrl.startsWith('data:')) {
            // Se non è già un data URL, crealo
            const mimeType = img.type || 'image/jpeg';
            imageUrl = `data:${mimeType};base64,${imageUrl}`;
          }
          content.push({
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          });
        }
        
        messages.push({
          role: 'user',
          content: content
        });
      } else {
        // Se non ci sono immagini, il content può essere una semplice stringa
        messages.push({
          role: 'user',
          content: msg.content || ''
        });
      }
    } else if (msg.type === 'ai' && msg.content) {
      messages.push({
        role: 'assistant',
        content: msg.content
      });
    }
  }
  
  return messages;
}

/**
 * Genera una risposta con streaming utilizzando l'API Electron Hub o ZukiJourney
 */
export async function* generateResponseStream(message, modelId = 'nebula-5.1-instant', chatHistory = [], images = [], abortController = null) {
  try {
    // Verifica se è un modello thinking che usa ZukiJourney
    const isThinkingModel = modelId === 'nebula-5.1-thinking' || modelId === 'nebula-5-thinking';
    
    // Mappa il modello locale al modello API
    const apiModel = MODEL_MAPPING[modelId] || MODEL_MAPPING['nebula-5.1-instant'];
    
    // Prepara il messaggio corrente
    const currentMessage = {
      type: 'user',
      content: message || '',
      images: images.length > 0 ? images : undefined
    };
    
    // Combina la cronologia con il messaggio corrente
    const allMessages = [...chatHistory, currentMessage];
    
    // Formatta i messaggi per l'API
    const formattedMessages = formatChatHistory(allMessages);
    
    // Ottieni le impostazioni AI
    const settings = get(aiSettings);
    
    // Prepara la richiesta con streaming
    const requestBody = {
      model: apiModel,
      messages: formattedMessages,
      temperature: settings.temperature || 0.7,
      max_tokens: settings.maxTokens || 2000,
      top_p: settings.topP || 1.0,
      frequency_penalty: settings.frequencyPenalty || 0.0,
      presence_penalty: settings.presencePenalty || 0.0,
      stream: true
    };
    
    // Crea controller se non fornito
    const controller = abortController || new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    // Determina URL e headers in base al modello
    let apiUrl, headers;
    
    if (isThinkingModel) {
      // Usa ZukiJourney API per i modelli thinking
      // Nota: ZukiJourney non supporta CORS, quindi usiamo un proxy CORS
      // In produzione, dovresti usare un backend proxy invece di un servizio pubblico
      const zukiUrl = 'https://zukijourney.com/api/v1/chat/completions';
      // Usa un proxy CORS pubblico (per sviluppo)
      // In produzione, sostituisci con il tuo backend proxy
      apiUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(zukiUrl)}`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer zu-6c87d9a495bbda6c71ebbe7bc17f6c4a`
      };
    } else {
      // Usa Electron Hub API per gli altri modelli
      apiUrl = `${API_CONFIG.baseURL}/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.apiKey}`
      };
    }
    
    console.log(`Calling ${isThinkingModel ? 'ZukiJourney' : 'Electron Hub'} API (Streaming):`, {
      url: apiUrl,
      model: apiModel,
      messageCount: formattedMessages.length,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens
    });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('API Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
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
        errorMessage = 'Troppe richieste. Limite di rate (5 RPM) raggiunto. Aspetta un attimo e riprova.';
      } else if (response.status === 402) {
        errorMessage = 'Crediti insufficienti. Piano Free: 0.25 crediti giornalieri disponibili.';
      }
      
      throw new Error(errorMessage);
    }
    
    // Leggi lo stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Mantieni l'ultima riga incompleta
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          const dataStr = trimmedLine.slice(6); // Rimuovi "data: "
          
          if (dataStr === '[DONE]') {
            return;
          }
          
          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices?.[0]?.delta?.content;
            
            if (delta) {
              yield delta;
            }
          } catch (e) {
            // Ignora errori di parsing per linee non JSON
            console.warn('Error parsing stream data:', e, dataStr);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
  } catch (error) {
    console.error('❌ Error calling Electron Hub API:', error);
    
    // Se è un errore di timeout o rete, ritorna un messaggio specifico
    if (error.name === 'AbortError') {
      throw new Error('Generazione interrotta dall\'utente.');
    }
    
    if (error.message.includes('API Error')) {
      throw error;
    }
    
    // Per altri errori, rigenera l'errore con un messaggio più chiaro
    throw new Error(`Errore nella comunicazione con l'AI: ${error.message}`);
  }
}

/**
 * Genera una risposta senza streaming (compatibilità backward)
 */
export async function generateResponse(message, modelId = 'nebula-5.1-instant', chatHistory = [], images = [], abortController = null) {
  let fullResponse = '';
  
  try {
    for await (const chunk of generateResponseStream(message, modelId, chatHistory, images, abortController)) {
      fullResponse += chunk;
    }
    
    return fullResponse;
  } catch (error) {
    throw error;
  }
}
