// Configurazione API
export const API_CONFIG = {
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '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',
  timeout: 30000 // 30 secondi
};

// Mappatura modelli locali ai modelli OpenRouter
export const MODEL_MAPPING = {
  'nebula-5.1-instant': 'openai/gpt-4o-mini', // Modello veloce
  'nebula-5.1': 'openai/gpt-4o', // Modello standard
  'nebula-5.0': 'openai/gpt-4-turbo', // Versione precedente
  'codex': 'openai/gpt-4o', // Specializzato per codice
  'gpt-4': 'openai/gpt-4o',
  'gpt-3.5': 'openai/gpt-3.5-turbo'
};

