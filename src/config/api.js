// Configurazione API - Electron Hub (default)
export const API_CONFIG = {
  baseURL: 'https://api.electronhub.ai/v1',
  apiKey: 'ek-EV4Fh5dDIvnR4gHkiK7qPBz2R5mEgnJImbuC03AMTXuZ5Aqhrc',
  timeout: 30000 // 30 secondi
};

// Configurazione API - LLM7.io (deprecato - non più utilizzato)
// export const LLM7_CONFIG = {
//   baseURL: 'https://api.llm7.io/v1',
//   apiKey: '9I0oxFYS9vFJKLYm6Tbpn6YMObVnMdsrNOPs/r6ZZA0T4Ve2Vn8eWcuYSOMy37eZ6TwyC4WUPmPE6/y6ioivxNo3HkPG72k12SoM25DN5i4+21BPY6E/DFoibTaN+zAW/216gIo=',
//   timeout: 30000 // 30 secondi
// };

// Mappatura modelli locali ai modelli API e provider
// Tutti i modelli usano ora gemini-2.0-flash-lite-001 tramite Electron Hub
export const MODEL_MAPPING = {
  'nebula-1.0': { model: 'gemini-2.0-flash-lite-001', provider: 'electronhub' }, // Nebula AI 1.0 - Gemini 2.0 Flash Lite
  'nebula-pro': { model: 'gemini-2.0-flash-lite-001', provider: 'electronhub' }, // Nebula AI Pro - Gemini 2.0 Flash Lite
  'nebula-coder': { model: 'gemini-2.0-flash-lite-001', provider: 'electronhub' }, // Nebula Coder - Gemini 2.0 Flash Lite (specializzato in coding)
  'nebula-premium-pro': { model: 'gemini-2.0-flash-lite-001', provider: 'electronhub' }, // Nebula AI Premium Pro - Gemini 2.0 Flash Lite
  'nebula-premium-max': { model: 'gemini-2.0-flash-lite-001', provider: 'electronhub' } // Nebula AI Premium Max - Gemini 2.0 Flash Lite
};


