import { writable } from 'svelte/store';

// Store per i modelli disponibili - Selezione ottimizzata
export const availableModels = writable([
  // ========== NEBULA - GRATUITI ==========
  {
    id: 'gpt-4o-mini',
    name: 'Nebula 4o-mini',
    description: 'Modello versatile e avanzato. Supporta testo e immagini, ideale per la maggior parte delle conversazioni quotidiane.',
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
    name: 'Nebula Gemini 2.5 Flash Image',
    description: 'Modello reasoning ottimizzato per STEM, matematica e coding. Eccelle in problem solving complessi e analisi approfondite.',
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
    name: 'Nebula Codex Mini',
    description: 'Modello specializzato per coding e software engineering. Eccelle in programmazione, debugging e sviluppo software. 400K token context window.',
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
    name: 'Nebula 4o Search',
    description: 'Modello specializzato per ricerca web in tempo reale. Addestrato per comprendere ed eseguire query di ricerca web, ideale per informazioni aggiornate.',
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
    name: 'Nebula 4.1',
    description: 'Flagship model per istruzioni avanzate, software engineering e ragionamento a lungo contesto. 1M token context window.',
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
    name: 'Nebula o3',
    description: 'Il modello reasoning più potente. Eccelle in matematica, scienza, coding e ragionamento visivo. Massima precisione e capacità analitiche.',
    group: 'Nebula Premium',
    premium: true,
    requiredPlan: 'max',
    webSearch: false,
    vision: true,
    functionCall: true,
    reasoning: true,
    contextLength: 200000
  }
]);

export const selectedModel = writable('gpt-4o-mini');

export function setModel(modelId) {
  selectedModel.set(modelId);
}

