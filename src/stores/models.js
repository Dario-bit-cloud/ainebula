import { writable } from 'svelte/store';

// Store per i modelli disponibili
export const availableModels = writable([
  { 
    id: 'nebula-5.1-auto', 
    name: 'Auto', 
    description: 'Decide per quanto tempo pensare',
    group: 'Nebula AI 5.1'
  },
  { 
    id: 'nebula-5.1-instant', 
    name: 'Instant', 
    description: 'Risponde immediatamente',
    group: 'Nebula AI 5.1'
  },
  { 
    id: 'nebula-5.1-thinking', 
    name: 'Thinking', 
    description: 'Pensa più a lungo per risposte migliori',
    group: 'Nebula AI 5.1'
  },
  { 
    id: 'nebula-5.1-pro', 
    name: 'Pro', 
    description: 'Intelligenza livello ricerca',
    group: 'Nebula AI 5.1'
  },
  { 
    id: 'legacy-header', 
    name: 'Modelli legacy', 
    description: '',
    group: 'Nebula AI 5.1',
    isHeader: true,
    hasSubmenu: true
  },
  { 
    id: 'nebula-5-instant', 
    name: 'Nebula AI 5 Instant', 
    description: '',
    group: 'Legacy'
  },
  { 
    id: 'nebula-5-thinking', 
    name: 'Nebula AI 5 Thinking', 
    description: '',
    group: 'Legacy'
  },
  { 
    id: 'nebula-5-pro', 
    name: 'Nebula AI 5 Pro', 
    description: '',
    group: 'Legacy'
  },
  { 
    id: 'nebula-4o', 
    name: 'Nebula AI 4o', 
    description: '',
    group: 'Legacy'
  }
]);

export const selectedModel = writable('nebula-5.1-instant');

export function setModel(modelId) {
  selectedModel.set(modelId);
}

