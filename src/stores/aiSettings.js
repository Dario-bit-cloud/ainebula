import { writable } from 'svelte/store';

// Store per le impostazioni AI
export const aiSettings = writable({
  systemPrompt: 'Sei Nebula AI, un assistente AI utile, amichevole e professionale. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.',
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0
});

// Prompt predefiniti
export const presetPrompts = {
  default: {
    name: 'Default',
    prompt: 'Sei Nebula AI, un assistente AI utile, amichevole e professionale. Rispondi sempre in italiano, a meno che non ti venga chiesto diversamente.'
  },
  developer: {
    name: 'Developer',
    prompt: 'Sei un assistente AI specializzato nello sviluppo software. Aiuti gli sviluppatori con codice, debugging, best practices e spiegazioni tecniche. Rispondi sempre in modo preciso e con esempi di codice quando utile.'
  },
  writer: {
    name: 'Writer',
    prompt: 'Sei un assistente AI specializzato nella scrittura. Aiuti a creare contenuti, migliorare la prosa, suggerire stili e strutturare testi. Rispondi sempre in modo creativo e ben articolato.'
  },
  assistant: {
    name: 'Personal Assistant',
    prompt: 'Sei un assistente personale AI. Aiuti con organizzazione, pianificazione, risposte rapide e supporto generale. Sei sempre cortese, efficiente e proattivo.'
  },
  tutor: {
    name: 'Tutor',
    prompt: 'Sei un tutor AI educativo. Spieghi concetti in modo chiaro, fornisci esempi pratici e adatti il tuo linguaggio al livello dell\'utente. Sii paziente e incoraggiante.'
  }
};

export function setSystemPrompt(prompt) {
  aiSettings.update(s => ({ ...s, systemPrompt: prompt }));
}

export function setTemperature(value) {
  aiSettings.update(s => ({ ...s, temperature: value }));
}

export function setMaxTokens(value) {
  aiSettings.update(s => ({ ...s, maxTokens: value }));
}

export function setTopP(value) {
  aiSettings.update(s => ({ ...s, topP: value }));
}

export function setFrequencyPenalty(value) {
  aiSettings.update(s => ({ ...s, frequencyPenalty: value }));
}

export function setPresencePenalty(value) {
  aiSettings.update(s => ({ ...s, presencePenalty: value }));
}

export function loadPreset(presetKey) {
  if (presetPrompts[presetKey]) {
    setSystemPrompt(presetPrompts[presetKey].prompt);
  }
}

