// Configurazione API - Electron Hub (default)
export const API_CONFIG = {
  baseURL: 'https://api.electronhub.ai/v1',
  apiKey: 'ek-Sb1My10CEAlsrg3EanwhCHOHClJvGWzaW8JocbH6ZEBOOEgPzZ',
  timeout: 30000 // 30 secondi
};

// Configurazione API - LLM7.io per Nebula Pro
export const LLM7_CONFIG = {
  baseURL: 'https://api.llm7.io/v1',
  apiKey: '9I0oxFYS9vFJKLYm6Tbpn6YMObVnMdsrNOPs/r6ZZA0T4Ve2Vn8eWcuYSOMy37eZ6TwyC4WUPmPE6/y6ioivxNo3HkPG72k12SoM25DN5i4+21BPY6E/DFoibTaN+zAW/216gIo=',
  timeout: 30000 // 30 secondi
};

// Configurazione AssemblyAI per riconoscimento vocale
export const ASSEMBLYAI_CONFIG = {
  apiKey: 'f3a18631d42449979ff3066fa8689a8e',
  wsUrl: 'wss://streaming.assemblyai.com/v3/ws', // v3 come nella documentazione
  sampleRate: 16000,
  formatTurns: true,
  speechModel: 'universal-streaming-multilingual', // Modello multilingue per supportare italiano
  languageDetection: false // Disabilita se vuoi forzare italiano, altrimenti rileva automaticamente
};

// Mappatura modelli locali ai modelli API e provider
export const MODEL_MAPPING = {
  'nebula-1.0': { model: 'gpt-4o', provider: 'electronhub' }, // Nebula AI 1.0 con Electron Hub
  'nebula-pro': { model: 'gpt-4', provider: 'llm7' }, // Nebula AI Pro con LLM7.io
  'nebula-coder': { model: 'gpt-4', provider: 'llm7' }, // Nebula Coder con LLM7.io (specializzato in coding)
  'nebula-premium-pro': { model: 'gpt-4', provider: 'llm7' }, // Nebula AI Premium Pro - Richiede abbonamento Pro
  'nebula-premium-max': { model: 'gpt-4', provider: 'llm7' }, // Nebula AI Premium Max - Richiede abbonamento Massimo
  'nebula-dreamer': { model: 'dall-e-3', provider: 'electronhub', imageGeneration: true } // Nebula Dreamer - Generazione immagini
};

// Configurazione per generazione immagini
export const IMAGE_GENERATION_CONFIG = {
  baseURL: 'https://api.electronhub.ai/v1',
  apiKey: 'ek-Sb1My10CEAlsrg3EanwhCHOHClJvGWzaW8JocbH6ZEBOOEgPzZ',
  timeout: 60000, // 60 secondi per la generazione immagini
  defaultSize: '1024x1024', // Dimensioni predefinite
  defaultQuality: 'standard', // 'standard' o 'hd'
  defaultStyle: 'vivid' // 'vivid' o 'natural'
};

