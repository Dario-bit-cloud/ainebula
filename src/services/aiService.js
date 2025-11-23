import { API_CONFIG, MODEL_MAPPING } from '../config/api.js';

/**
 * Converte la storia della chat nel formato richiesto dall'API OpenAI/Electron Hub
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
 * Genera una risposta utilizzando l'API Electron Hub
 */
export async function generateResponse(message, modelId = 'nebula-5.1-instant', chatHistory = [], images = []) {
  try {
    // Mappa il modello locale al modello Electron Hub
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
    
    // Headers per Electron Hub (compatibile OpenAI)
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_CONFIG.apiKey}`
    };
    
    console.log('Calling Electron Hub API:', {
      url: `${API_CONFIG.baseURL}/chat/completions`,
      model: apiModel,
      messageCount: formattedMessages.length
    });
    
    const response = await fetch(`${API_CONFIG.baseURL}/chat/completions`, {
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
    
    const data = await response.json();
    
    // Estrai la risposta
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    
    throw new Error('Nessuna risposta ricevuta dall\'API');
    
  } catch (error) {
    console.error('❌ Error calling Electron Hub API:', error);
    console.error('📍 API Config:', {
      baseURL: API_CONFIG.baseURL,
      apiKey: API_CONFIG.apiKey.substring(0, 20) + '...',
      model: apiModel
    });
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
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

