import { API_CONFIG, MODEL_MAPPING } from '../config/api.js';

/**
 * Converte la storia della chat nel formato richiesto dall'API OpenAI/OpenRouter
 */
function formatChatHistory(chatHistory) {
  const messages = [];
  
  // Messaggio di sistema per impostare il comportamento dell'AI
  messages.push({
    role: 'system',
    content: 'Sei Nebula AI, un assistente AI utile, amichevole e professionale. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.'
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
 * Genera una risposta utilizzando l'API OpenRouter
 */
export async function generateResponse(message, modelId = 'nebula-5.1-instant', chatHistory = [], images = []) {
  try {
    // Mappa il modello locale al modello AIMLAPI
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
    
    // Prepara la richiesta
    const requestBody = {
      model: apiModel,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2000
    };
    
    // Esegui la chiamata API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    // Headers per OpenRouter (richiede HTTP-Referer e X-Title opzionali)
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_CONFIG.apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://nebula-ai.app',
      'X-Title': 'Nebula AI'
    };
    
    const response = await fetch(`${API_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Estrai la risposta
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    
    throw new Error('Nessuna risposta ricevuta dall\'API');
    
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    
    // Se è un errore di timeout o rete, ritorna un messaggio specifico
    if (error.name === 'AbortError') {
      throw new Error('Timeout: la richiesta ha impiegato troppo tempo. Riprova.');
    }
    
    if (error.message.includes('API Error')) {
      throw error;
    }
    
    // Per altri errori, rigenera l'errore con un messaggio più chiaro
    throw new Error(`Errore nella comunicazione con l'AI: ${error.message}`);
  }
}

