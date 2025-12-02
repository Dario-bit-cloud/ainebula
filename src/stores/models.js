import { writable } from 'svelte/store';

// Store per i modelli disponibili - Selezione ottimizzata
export const availableModels = writable([
  // ========== NEBULA - GRATUITI ==========
  {
    id: 'gemini-2.5-flash-preview-09-2025',
    name: 'Flash',
    description: 'Perfetto per conversazioni quotidiane. Supporta testo e immagini.',
    group: 'Nebula AI',
    premium: false,
    webSearch: false,
    vision: true,
    functionCall: true,
    reasoning: false,
    contextLength: 128000
  },
  {
    id: 'gemini-2.5-flash-preview-09-2025-thinking',
    name: 'Flash Thinking',
    description: 'Flash con modalità thinking abilitata. Mostra il ragionamento interno.',
    group: 'Nebula AI',
    premium: false,
    webSearch: false,
    vision: true,
    functionCall: true,
    reasoning: false,
    contextLength: 128000
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Imagenerator',
    description: 'Ideale per matematica, scienze e programmazione. Risolve problemi complessi.',
    group: 'Nebula AI',
    premium: false,
    allowsPremiumFeatures: true,
    limitedTimeFree: true,
    webSearch: false,
    vision: false,
    functionCall: true,
    reasoning: true,
    contextLength: 200000
  },
  {
    id: 'gpt-5.1-codex-mini',
    name: 'Codex',
    description: 'Specializzato per programmazione e sviluppo software.',
    group: 'Nebula AI',
    premium: false,
    webSearch: false,
    vision: true,
    functionCall: true,
    reasoning: true,
    contextLength: 400000
  },
  {
    id: 'gpt-4o-search-preview-2025-03-11',
    name: 'Surfer',
    description: 'Cerca informazioni aggiornate su internet in tempo reale.',
    group: 'Nebula AI',
    premium: false,
    webSearch: true,
    vision: true,
    functionCall: true,
    reasoning: false,
    contextLength: 128000
  },
  
  // ========== NEBULA - PREMIUM ==========
  {
    id: 'gpt-4.1',
    name: '4.1',
    description: 'Il modello più avanzato per compiti complessi e conversazioni lunghe.',
    group: 'Nebula Premium',
    premium: true,
    requiredPlan: 'pro',
    webSearch: false,
    vision: true,
    functionCall: true,
    reasoning: false,
    contextLength: 1000000
  },
  {
    id: 'o3',
    name: 'o3',
    description: 'Il modello più potente per matematica, scienze e ragionamento complesso.',
    group: 'Nebula Premium',
    premium: true,
    requiredPlan: 'max',
    webSearch: false,
    vision: true,
    functionCall: true,
    reasoning: true,
    contextLength: 200000
  },
  
  // ========== AI DI TERZE PARTI ==========
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: 'Modello AI di OpenAI per conversazioni e assistenza.',
    group: 'AI di terze parti',
    premium: false,
    webSearch: false,
    vision: false,
    functionCall: false,
    reasoning: false,
    contextLength: 128000
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Modello AI di Google per compiti complessi.',
    group: 'AI di terze parti',
    premium: false,
    webSearch: false,
    vision: true,
    functionCall: false,
    reasoning: false,
    contextLength: 128000
  },
  {
    id: 'grok',
    name: 'Grok',
    description: 'Modello AI di xAI per conversazioni avanzate.',
    group: 'AI di terze parti',
    premium: false,
    webSearch: false,
    vision: false,
    functionCall: false,
    reasoning: false,
    contextLength: 128000
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Modello AI per coding e ragionamento.',
    group: 'AI di terze parti',
    premium: false,
    webSearch: false,
    vision: false,
    functionCall: false,
    reasoning: true,
    contextLength: 128000
  }
]);

export const selectedModel = writable('gemini-2.5-flash-preview-09-2025');

export function setModel(modelId) {
  selectedModel.set(modelId);
}

