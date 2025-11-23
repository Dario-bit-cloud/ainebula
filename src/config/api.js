// Configurazione API
export const API_CONFIG = {
  baseURL: 'https://api.electronhub.ai/v1',
  apiKey: 'ek-1Nr31Tdp53bBR3y04Apz6MCSCC4FMTOcYpmb0DVxoDTZO0FR2e',
  timeout: 30000 // 30 secondi
};

// Verifica: API key Electron Hub configurata

// Mappatura modelli locali ai modelli Electron Hub (OpenAI compatibile)
export const MODEL_MAPPING = {
  'nebula-5.1-instant': 'gpt-4o-mini', // Modello veloce
  'nebula-5.1': 'gpt-4o', // Modello standard
  'nebula-5.0': 'gpt-4-turbo', // Versione precedente
  'codex': 'gpt-4o', // Specializzato per codice
  'gpt-4': 'gpt-4o',
  'gpt-3.5': 'gpt-3.5-turbo'
};

