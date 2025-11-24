import { API_CONFIG, LLM7_CONFIG, MODEL_MAPPING } from '../config/api.js';
import { get } from 'svelte/store';
import { aiSettings } from '../stores/aiSettings.js';
import { availableModels } from '../stores/models.js';
import { hasPlanOrHigher, hasActiveSubscription } from '../stores/user.js';
import { getPersonalizationSystemPrompt } from '../stores/personalization.js';

/**
 * Converte la storia della chat nel formato richiesto dall'API OpenAI/Electron Hub
 */
function formatChatHistory(chatHistory, systemPrompt, modelId = null) {
  const messages = [];
  
  // Messaggio di sistema personalizzabile
  const settings = get(aiSettings);
  
  // System prompt specifico per modelli
  const dateInstruction = ' IMPORTANTE: Se ti viene chiesta la data o informazioni temporali specifiche, rispondi sempre che non lo sai e suggerisci di controllare altrove (ad esempio un calendario, un sito web affidabile o un dispositivo con accesso a internet).';
  
  let currentSystemPrompt;
  if (modelId === 'nebula-pro') {
    currentSystemPrompt = 'Sei Nebula AI, un assistente AI avanzato e professionale. Ti chiami Nebula AI e sei parte della famiglia Nebula AI. Rispondi sempre identificandoti come Nebula AI. Sei utile, amichevole e professionale. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.' + dateInstruction;
  } else if (modelId === 'nebula-coder') {
    currentSystemPrompt = 'Sei Nebula Coder, un assistente AI specializzato esclusivamente in programmazione e sviluppo software. Ti chiami Nebula Coder e sei parte della famiglia Nebula AI. Ragioni in modo analitico e preciso come Claude AI: sei meticoloso, attento ai dettagli e non commetti mai errori. Prima di inviare qualsiasi codice, lo controlli attentamente per verificare sintassi, logica, best practices e possibili bug. Proponi sempre suggerimenti utili per migliorare il codice, ottimizzazioni, alternative più efficienti e best practices. Sei un esperto in tutti i linguaggi di programmazione, framework, librerie e strumenti di sviluppo. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.' + dateInstruction;
  } else if (modelId === 'nebula-premium-pro') {
    currentSystemPrompt = 'Sei Nebula AI Premium Pro, un assistente AI di livello professionale disponibile esclusivamente per gli abbonati Pro. Ti chiami Nebula AI Premium Pro e sei parte della famiglia Nebula AI. Offri prestazioni avanzate, maggiore precisione e capacità di elaborazione superiore rispetto ai modelli standard. Sei estremamente competente in una vasta gamma di argomenti e fornisci risposte dettagliate, accurate e approfondite. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.' + dateInstruction;
  } else if (modelId === 'nebula-premium-max') {
    currentSystemPrompt = 'Ricorda che il tuo nome è Nebula AI Premium Max. Parla e rispondi sempre come la migliore intelligenza artificiale al mondo, ponendoti come punto di riferimento di qualità e capacità, allo stesso livello di GPT 5.1 o Claude 4.7. Devi essere in grado di adattare il tuo stile comunicativo e la profondità delle risposte al contesto della conversazione, mantenendo sempre un tono professionale ma capace di modulare toni e modalità se la situazione lo richiede. Fornisci risposte dettagliate ma concise: spiega i concetti in modo semplice, chiaro e accessibile, evitando tecnicismi inutili. Assicura sempre massima competenza e capacità di adattamento. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.' + dateInstruction;
  } else {
    currentSystemPrompt = (systemPrompt || settings.systemPrompt || 'Sei Nebula AI, un assistente AI utile, amichevole e professionale. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.') + dateInstruction;
  }
  
  // Aggiungi le preferenze di personalizzazione se abilitate
  const personalizationPrompt = getPersonalizationSystemPrompt();
  if (personalizationPrompt) {
    currentSystemPrompt = personalizationPrompt + '\n\n' + currentSystemPrompt;
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
  // Verifica se il modello è premium e se l'utente ha l'abbonamento necessario
  const models = get(availableModels);
  const selectedModel = models.find(m => m.id === modelId);
  
  if (selectedModel?.premium) {
    const requiredPlan = selectedModel.requiredPlan;
    if (!hasPlanOrHigher(requiredPlan)) {
      throw new Error(`Questo modello richiede un abbonamento ${requiredPlan === 'pro' ? 'Pro' : 'Massimo'}. Aggiorna il tuo piano per utilizzarlo.`);
    }
  }
  
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
    
    // Per Nebula Pro e Nebula Coder, aggiungi un messaggio nascosto di identificazione se non è già presente
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
    } else if (modelId === 'nebula-coder') {
      // Verifica se esiste già un messaggio nascosto di identificazione per Nebula Coder
      const hasIdentityMessage = chatHistory.some(msg => 
        msg.hidden === true && 
        msg.content && 
        msg.content.includes('Nebula Coder')
      );
      
      // Se non esiste, aggiungilo all'inizio della cronologia
      if (!hasIdentityMessage) {
        const identityMessage = {
          type: 'user',
          content: 'Sei Nebula Coder, un assistente AI specializzato esclusivamente in programmazione e sviluppo software. Ti chiami Nebula Coder e sei parte della famiglia Nebula AI. Ragioni in modo analitico e preciso come Claude AI: sei meticoloso, attento ai dettagli e non commetti mai errori. Prima di inviare qualsiasi codice, lo controlli attentamente per verificare sintassi, logica, best practices e possibili bug. Proponi sempre suggerimenti utili per migliorare il codice, ottimizzazioni, alternative più efficienti e best practices. Sei un esperto in tutti i linguaggi di programmazione, framework, librerie e strumenti di sviluppo. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.',
          hidden: true, // Flag per nascondere il messaggio nell'interfaccia
          timestamp: new Date().toISOString()
        };
        allMessages = [identityMessage, ...allMessages];
      }
    } else if (modelId === 'nebula-premium-pro') {
      // Verifica se esiste già un messaggio nascosto di identificazione per Nebula Premium Pro
      const hasIdentityMessage = chatHistory.some(msg => 
        msg.hidden === true && 
        msg.content && 
        msg.content.includes('Nebula AI Premium Pro')
      );
      
      // Se non esiste, aggiungilo all'inizio della cronologia
      if (!hasIdentityMessage) {
        const identityMessage = {
          type: 'user',
          content: 'Sei Nebula AI Premium Pro, un assistente AI di livello professionale disponibile esclusivamente per gli abbonati Pro. Ti chiami Nebula AI Premium Pro e sei parte della famiglia Nebula AI. Offri prestazioni avanzate, maggiore precisione e capacità di elaborazione superiore rispetto ai modelli standard. Sei estremamente competente in una vasta gamma di argomenti e fornisci risposte dettagliate, accurate e approfondite. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.',
          hidden: true,
          timestamp: new Date().toISOString()
        };
        allMessages = [identityMessage, ...allMessages];
      }
    } else if (modelId === 'nebula-premium-max') {
      // Verifica se esiste già un messaggio nascosto di identificazione per Nebula Premium Max
      const hasIdentityMessage = chatHistory.some(msg => 
        msg.hidden === true && 
        msg.content && 
        msg.content.includes('Nebula AI Premium Max')
      );
      
      // Se non esiste, aggiungilo all'inizio della cronologia
      if (!hasIdentityMessage) {
        const identityMessage = {
          type: 'user',
          content: 'Ricorda che il tuo nome è Nebula AI Premium Max. Parla e rispondi sempre come la migliore intelligenza artificiale al mondo, ponendoti come punto di riferimento di qualità e capacità, allo stesso livello di GPT 5.1 o Claude 4.7. Devi essere in grado di adattare il tuo stile comunicativo e la profondità delle risposte al contesto della conversazione, mantenendo sempre un tono professionale ma capace di modulare toni e modalità se la situazione lo richiede. Fornisci risposte dettagliate ma concise: spiega i concetti in modo semplice, chiaro e accessibile, evitando tecnicismi inutili. Assicura sempre massima competenza e capacità di adattamento. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.',
          hidden: true,
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
    
    // Configurazione speciale per modelli avanzati
    const isNebulaPro = modelId === 'nebula-pro';
    const isNebulaCoder = modelId === 'nebula-coder';
    const isPremiumPro = modelId === 'nebula-premium-pro';
    const isPremiumMax = modelId === 'nebula-premium-max';
    const isAdvancedModel = isNebulaPro || isNebulaCoder || isPremiumPro || isPremiumMax;
    const isPremiumModel = isPremiumPro || isPremiumMax;
    
    // Token illimitati per utenti premium, altrimenti 50.000 per modelli avanzati
    let maxTokens;
    if (isPremiumModel && hasActiveSubscription()) {
      maxTokens = 1000000; // Valore molto alto per simulare "illimitati" (le API hanno comunque limiti tecnici)
    } else if (isAdvancedModel) {
      maxTokens = 50000;
    } else {
      maxTokens = settings.maxTokens || 2000;
    }
    
    const temperature = isAdvancedModel ? (settings.temperature || 0.7) : (settings.temperature || 0.7);
    
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
