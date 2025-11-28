import { writable } from 'svelte/store';

// Store per i modelli disponibili
export const availableModels = writable([
  { 
    id: 'nebula-1.0', 
    name: 'Nebula AI 1.5', 
    description: 'Modello base versatile e intelligente per conversazioni',
    group: 'Nebula AI',
    premium: false,
    webSearch: false
  },
  { 
    id: 'nebula-pro', 
    name: 'Nebula AI Pro', 
    description: 'Modello avanzato per risposte dettagliate',
    group: 'Nebula AI',
    premium: false,
    webSearch: false
  },
  { 
    id: 'nebula-coder', 
    name: 'Nebula Coder', 
    description: 'Specializzato in programmazione e sviluppo software',
    group: 'Nebula AI',
    premium: false,
    webSearch: false
  },
  { 
    id: 'nebula-search', 
    name: 'Nebula Search', 
    description: 'Modello con ricerca web in tempo reale - Informazioni aggiornate dal web',
    group: 'Nebula Search',
    premium: false,
    webSearch: true
  },
  { 
    id: 'nebula-search-pro', 
    name: 'Nebula Search Pro', 
    description: 'Modello avanzato con ricerca web - Richiede abbonamento Pro',
    group: 'Nebula Search',
    premium: true,
    requiredPlan: 'pro',
    webSearch: true
  },
  { 
    id: 'nebula-research', 
    name: 'Nebula Research', 
    description: 'Modello con reasoning e ricerca web avanzata - Richiede abbonamento Max',
    group: 'Nebula Search',
    premium: true,
    requiredPlan: 'max',
    webSearch: true
  },
  { 
    id: 'nebula-premium-pro', 
    name: 'Nebula AI Premium Pro', 
    description: 'Modello premium avanzato - Richiede abbonamento Pro',
    group: 'Nebula AI Premium',
    premium: true,
    requiredPlan: 'pro', // Piano minimo richiesto
    webSearch: false
  },
  { 
    id: 'nebula-premium-max', 
    name: 'Nebula AI Premium Max', 
    description: 'Modello premium massimo - Richiede abbonamento Massimo',
    group: 'Nebula AI Premium',
    premium: true,
    requiredPlan: 'max', // Piano minimo richiesto
    webSearch: false
  },
  { 
    id: 'nebula-llm7', 
    name: 'Nebula AI LLM7', 
    description: 'Modello avanzato gratuito tramite LLM7.io - Alta qualità',
    group: 'Nebula AI',
    premium: false,
    webSearch: false
  }
]);

export const selectedModel = writable('nebula-1.0');

export function setModel(modelId) {
  selectedModel.set(modelId);
}

