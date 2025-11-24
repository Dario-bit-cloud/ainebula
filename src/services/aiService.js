import { API_CONFIG, LLM7_CONFIG, MODEL_MAPPING } from '../config/api.js';
import { get } from 'svelte/store';
import { aiSettings } from '../stores/aiSettings.js';

/**
 * Converte la storia della chat nel formato richiesto dall'API OpenAI/Electron Hub
 */
function formatChatHistory(chatHistory, systemPrompt, modelId = null) {
  const messages = [];
  
  // Messaggio di sistema personalizzabile
  const settings = get(aiSettings);
  
  // System prompt specifico per Nebula Pro
  let currentSystemPrompt;
  if (modelId === 'nebula-pro') {
    currentSystemPrompt = 'Sei Nebula AI, un assistente AI avanzato e professionale. Ti chiami Nebula AI e sei parte della famiglia Nebula AI. Rispondi sempre identificandoti come Nebula AI. Sei utile, amichevole e professionale. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.';
  } else {
    currentSystemPrompt = systemPrompt || settings.systemPrompt || 'Sei Nebula AI, un assistente AI utile, amichevole e professionale. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.';
  }
  
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
 * Genera una risposta con streaming utilizzando l'API Electron Hub
 */
export async function* generateResponseStream(message, modelId = 'nebula-1.0', chatHistory = [], images = [], abortController = null) {
  // Mappa il modello locale al modello API e provider (definito all'inizio per essere disponibile nel catch)
  const modelConfig = MODEL_MAPPING[modelId] || MODEL_MAPPING['nebula-1.0'];
  const apiModel = typeof modelConfig === 'string' ? modelConfig : modelConfig.model;
  const provider = typeof modelConfig === 'string' ? 'electronhub' : (modelConfig.provider || 'electronhub');
  
  // Seleziona la configurazione API in base al provider
  const apiConfig = provider === 'llm7' ? LLM7_CONFIG : API_CONFIG;
  
  try {
    
    // Prepara il messaggio corrente
    const currentMessage = {
      type: 'user',
      content: message || '',
      images: images.length > 0 ? images : undefined
    };
    
    // Per Nebula Pro, aggiungi un messaggio nascosto di identificazione se non è già presente
    let allMessages = [...chatHistory];
    if (modelId === 'nebula-pro') {
      // Verifica se esiste già un messaggio nascosto di identificazione
      const hasIdentityMessage = chatHistory.some(msg => 
        msg.hidden === true && 
        msg.content && 
        msg.content.includes('Sei Nebula AI')
      );
      
      // Se non esiste, aggiungilo all'inizio della cronologia
      if (!hasIdentityMessage) {
        const identityMessage = {
          type: 'user',
          content: 'Sei Nebula AI, un assistente AI avanzato e professionale. Ti chiami Nebula AI e sei parte della famiglia Nebula AI. Rispondi sempre identificandoti come Nebula AI. Sei utile, amichevole e professionale come ChatGPT 5.1. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.',
          hidden: true, // Flag per nascondere il messaggio nell'interfaccia
          timestamp: new Date().toISOString()
        };
        allMessages = [identityMessage, ...allMessages];
      }
    }
    
    // Aggiungi il messaggio corrente
    allMessages = [...allMessages, currentMessage];
    
    // Formatta i messaggi per l'API (passa anche modelId per system prompt personalizzato)
    const formattedMessages = formatChatHistory(allMessages, null, modelId);
    
    // Ottieni le impostazioni AI
    const settings = get(aiSettings);
    
    // Configurazione speciale per Nebula Pro
    const isNebulaPro = modelId === 'nebula-pro';
    const maxTokens = isNebulaPro ? 50000 : (settings.maxTokens || 2000);
    const temperature = isNebulaPro ? (settings.temperature || 0.7) : (settings.temperature || 0.7);
    
    // Prepara la richiesta con streaming
    const requestBody = {
      model: apiModel,
      messages: formattedMessages,
      temperature: temperature,
      max_tokens: maxTokens,
      top_p: settings.topP || 1.0,
      frequency_penalty: settings.frequencyPenalty || 0.0,
      presence_penalty: settings.presencePenalty || 0.0,
      stream: true
    };
    
    // Crea controller se non fornito
    const controller = abortController || new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout);
    
    // Headers per API (compatibile OpenAI)
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.apiKey}`
    };
    
    console.log(`Calling ${provider.toUpperCase()} API (Streaming):`, {
      url: `${apiConfig.baseURL}/chat/completions`,
      model: apiModel,
      provider: provider,
      messageCount: formattedMessages.length,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens
    });
    
    const response = await fetch(`${apiConfig.baseURL}/chat/completions`, {
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
    console.error(`❌ Error calling ${provider.toUpperCase()} API:`, error);
    
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
export async function generateResponse(message, modelId = 'nebula-1.0', chatHistory = [], images = [], abortController = null) {
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
