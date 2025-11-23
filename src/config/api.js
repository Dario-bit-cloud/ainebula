// Configurazione API
export const API_CONFIG = {
  baseURL: 'https://api.electronhub.ai/v1',
  apiKey: 'ek-Sb1My10CEAlsrg3EanwhCHOHClJvGWzaW8JocbH6ZEBOOEgPzZ',
  timeout: 30000 // 30 secondi
};

// API key Electron Hub aggiornata

// Mappatura modelli locali ai modelli API
export const MODEL_MAPPING = {
  'nebula-5.1-instant': 'gpt-4o-mini', // Modello veloce
  'nebula-5.1-auto': 'gpt-4o', // Modello auto
  'nebula-5.1-thinking': 'gpt-4o', // Modello thinking (usa ZukiJourney)
  'nebula-5.1-pro': 'gpt-4o', // Modello pro
  'nebula-5-instant': 'gpt-4o-mini', // Legacy
  'nebula-5-thinking': 'gpt-4o', // Legacy thinking (usa ZukiJourney)
  'nebula-5-pro': 'gpt-4o', // Legacy pro
  'nebula-4o': 'gpt-4o', // Legacy
  'nebula-5.1': 'gpt-4o', // Modello standard
  'nebula-5.0': 'gpt-4-turbo', // Versione precedente
  'codex': 'gpt-4o', // Specializzato per codice
  'gpt-4': 'gpt-4o',
  'gpt-3.5': 'gpt-3.5-turbo'
};

