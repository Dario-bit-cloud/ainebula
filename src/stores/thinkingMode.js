import { writable } from 'svelte/store';

// Store per la modalità thinking (mostra il ragionamento interno)
export const isThinkingModeEnabled = writable(false);

export function toggleThinkingMode() {
  isThinkingModeEnabled.update(enabled => !enabled);
}

export function setThinkingMode(enabled) {
  isThinkingModeEnabled.set(enabled);
}






