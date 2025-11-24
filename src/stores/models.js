import { writable } from 'svelte/store';

// Store per i modelli disponibili
export const availableModels = writable([
  { 
    id: 'nebula-1.0', 
    name: 'Nebula AI 1.0', 
    description: 'Modello base con Electron Hub API',
    group: 'Nebula AI',
    premium: false
  },
  { 
    id: 'nebula-pro', 
    name: 'Nebula AI Pro', 
    description: 'Modello avanzato con LLM7.io',
    group: 'Nebula AI',
    premium: false
  },
  { 
    id: 'nebula-coder', 
    name: 'Nebula Coder', 
    description: 'Specializzato in programmazione e sviluppo software',
    group: 'Nebula AI',
    premium: false
  },
  { 
    id: 'nebula-premium-pro', 
    name: 'Nebula AI Premium Pro', 
    description: 'Modello premium avanzato - Richiede abbonamento Pro',
    group: 'Nebula AI Premium',
    premium: true,
    requiredPlan: 'pro' // Piano minimo richiesto
  },
  { 
    id: 'nebula-premium-max', 
    name: 'Nebula AI Premium Max', 
    description: 'Modello premium massimo - Richiede abbonamento Massimo',
    group: 'Nebula AI Premium',
    premium: true,
    requiredPlan: 'max' // Piano minimo richiesto
  }
]);

export const selectedModel = writable('nebula-1.0');

export function setModel(modelId) {
  selectedModel.set(modelId);
}

