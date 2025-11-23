// Configurazione API
export const API_CONFIG = {
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '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',
  timeout: 30000 // 30 secondi
};

// Mappatura modelli locali ai modelli OpenRouter
// Nota: i modelli con :free sono gratuiti, altrimenti richiedono crediti
export const MODEL_MAPPING = {
  'nebula-5.1-instant': 'google/gemini-flash-1.5-8b:free', // Modello veloce e gratuito
  'nebula-5.1': 'openai/gpt-3.5-turbo', // Modello standard (richiede crediti)
  'nebula-5.0': 'openai/gpt-3.5-turbo', // Versione precedente
  'codex': 'openai/gpt-3.5-turbo', // Specializzato per codice
  'gpt-4': 'openai/gpt-3.5-turbo', // Fallback a 3.5 se non ci sono crediti
  'gpt-3.5': 'openai/gpt-3.5-turbo'
};

