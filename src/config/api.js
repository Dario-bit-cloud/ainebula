// Configurazione API
export const API_CONFIG = {
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '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',
  timeout: 30000 // 30 secondi
};

// Mappatura modelli locali ai modelli OpenRouter
// I modelli con :free sono completamente gratuiti
export const MODEL_MAPPING = {
  'nebula-5.1-instant': 'google/gemini-flash-1.5-8b:free', // Modello veloce e gratuito
  'nebula-5.1': 'google/gemini-flash-1.5-8b:free', // Usa modello gratuito
  'nebula-5.0': 'google/gemini-flash-1.5-8b:free', // Usa modello gratuito
  'codex': 'google/gemini-flash-1.5-8b:free', // Usa modello gratuito
  'gpt-4': 'google/gemini-flash-1.5-8b:free', // Usa modello gratuito
  'gpt-3.5': 'google/gemini-flash-1.5-8b:free' // Usa modello gratuito
};

