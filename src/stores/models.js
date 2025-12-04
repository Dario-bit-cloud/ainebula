import { writable } from 'svelte/store';

// Store per i modelli disponibili - Selezione ottimizzata
export const availableModels = writable([
  // ========== NEBULA - GRATUITI ==========
  {
    id: 'gemini-2.5-flash-image',
    name: 'Imagenerator',
    description: 'Genera immagini da testo.',
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
    id: 'gemini-2.5-flash-preview-09-2025',
    name: 'Flash',
    description: 'Conversazioni rapide e analisi immagini.',
    group: 'Nebula AI',
    premium: false,
    webSearch: false,
    vision: true,
    functionCall: true,
    reasoning: false,
    contextLength: 128000
  },
  {
    id: 'gpt-5.1-codex-mini',
    name: 'Codex',
    description: 'Specializzato in programmazione e debugging.',
    group: 'Nebula AI',
    premium: false,
    webSearch: false,
    vision: true,
    functionCall: true,
    reasoning: true,
    contextLength: 400000
  },
  
  // ========== NEBULA - PREMIUM ==========
  {
    id: 'gpt-4.1',
    name: '4.1',
    description: 'Modello avanzato per compiti complessi.',
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
    description: 'Modello potente per matematica e ragionamento.',
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
    description: 'AI OpenAI per conversazioni naturali.',
    group: 'AI di terze parti',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJI7dKa8PhJeeneF2OQwehzLo9fGQHBJ0LxA&s',
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
    description: 'AI Google per analisi multiformato.',
    group: 'AI di terze parti',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Google_Gemini_icon_2025.svg/250px-Google_Gemini_icon_2025.svg.png',
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
    description: 'AI xAI per analisi dati in tempo reale.',
    group: 'AI di terze parti',
    logo: 'https://img.icons8.com/color/1200/grok--v2.jpg',
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
    description: 'AI specializzata in coding e matematica.',
    group: 'AI di terze parti',
    logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/deepseek-logo-icon.png',
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

