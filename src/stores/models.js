import { writable } from 'svelte/store';

// Store per i modelli disponibili
export const availableModels = writable([
  { id: 'nebula-5.1-instant', name: 'Nebula AI 5.1 Instant', description: 'Modello veloce e ottimizzato' },
  { id: 'nebula-5.1', name: 'Nebula AI 5.1', description: 'Modello standard' },
  { id: 'nebula-5.0', name: 'Nebula AI 5.0', description: 'Versione precedente' },
  { id: 'codex', name: 'Nebula Codex', description: 'Specializzato per codice' },
  { id: 'gpt-4', name: 'GPT-4', description: 'Modello avanzato' },
  { id: 'gpt-3.5', name: 'GPT-3.5', description: 'Modello base' }
]);

export const selectedModel = writable('nebula-5.1-instant');

export function setModel(modelId) {
  selectedModel.set(modelId);
}

