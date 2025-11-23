// Configurazione API
export const API_CONFIG = {
  baseURL: 'https://api.electronhub.ai/v1',
  apiKey: 'ek-Sb1My10CEAlsrg3EanwhCHOHClJvGWzaW8JocbH6ZEBOOEgPzZ',
  timeout: 30000 // 30 secondi
};

// API key Electron Hub aggiornata

// Mappatura modelli locali ai modelli Electron Hub (OpenAI compatibile)
export const MODEL_MAPPING = {
  'nebula-5.1-instant': 'gpt-4o-mini', // Modello veloce
  'nebula-5.1': 'gpt-4o', // Modello standard
  'nebula-5.0': 'gpt-4-turbo', // Versione precedente
  'codex': 'gpt-4o', // Specializzato per codice
  'gpt-4': 'gpt-4o',
  'gpt-3.5': 'gpt-3.5-turbo'
};

