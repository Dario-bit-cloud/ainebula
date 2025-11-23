// Configurazione API
export const API_CONFIG = {
  baseURL: 'https://api.aimlapi.com/v1',
  apiKey: '7a743a4c085a4fe2bea0d155b826a39e',
  timeout: 30000 // 30 secondi
};

// Mappatura modelli locali ai modelli AIMLAPI/OpenAI
export const MODEL_MAPPING = {
  'nebula-5.1-instant': 'gpt-4o-mini', // Modello veloce
  'nebula-5.1': 'gpt-4o', // Modello standard
  'nebula-5.0': 'gpt-4-turbo', // Versione precedente
  'codex': 'gpt-4o', // Specializzato per codice
  'gpt-4': 'gpt-4o',
  'gpt-3.5': 'gpt-3.5-turbo'
};

