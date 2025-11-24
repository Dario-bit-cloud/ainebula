import { writable } from 'svelte/store';

// Store per i modelli disponibili
export const availableModels = writable([
  { 
    id: 'nebula-1.0', 
    name: 'Nebula AI 1.0', 
    description: 'Modello base versatile per conversazioni e generazione immagini',
    group: 'Nebula AI',
    premium: false,
    imageGeneration: true
  },
  { 
    id: 'nebula-pro', 
    name: 'Nebula AI Pro', 
    description: 'Modello avanzato per risposte dettagliate e generazione immagini',
    group: 'Nebula AI',
    premium: false,
    imageGeneration: true
  },
  { 
    id: 'nebula-coder', 
    name: 'Nebula Coder', 
    description: 'Specializzato in programmazione e sviluppo software, con supporto generazione immagini',
    group: 'Nebula AI',
    premium: false,
    imageGeneration: true
  },
  { 
    id: 'nebula-premium-pro', 
    name: 'Nebula AI Premium Pro', 
    description: 'Modello premium avanzato con generazione immagini - Richiede abbonamento Pro',
    group: 'Nebula AI Premium',
    premium: true,
    requiredPlan: 'pro', // Piano minimo richiesto
    imageGeneration: true
  },
  { 
    id: 'nebula-premium-max', 
    name: 'Nebula AI Premium Max', 
    description: 'Modello premium massimo con generazione immagini - Richiede abbonamento Massimo',
    group: 'Nebula AI Premium',
    premium: true,
    requiredPlan: 'max', // Piano minimo richiesto
    imageGeneration: true
  },
  { 
    id: 'nebula-dreamer', 
    name: 'Nebula Dreamer', 
    description: 'Modello dedicato alla generazione di immagini da testo',
    group: 'Nebula AI',
    premium: false,
    imageGeneration: true // Flag per indicare che è un modello per generazione immagini
  }
]);

export const selectedModel = writable('nebula-1.0');

export function setModel(modelId) {
  selectedModel.set(modelId);
}

