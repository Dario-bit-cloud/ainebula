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
// Tutti i modelli usano ora deepseek-r1-0528-qwen3-8b tramite Electron Hub
export const MODEL_MAPPING = {
  'nebula-1.0': { model: 'deepseek-r1-0528-qwen3-8b', provider: 'electronhub' }, // Nebula AI 1.0 - DeepSeek R1
  'nebula-pro': { model: 'deepseek-r1-0528-qwen3-8b', provider: 'electronhub' }, // Nebula AI Pro - DeepSeek R1
  'nebula-coder': { model: 'deepseek-r1-0528-qwen3-8b', provider: 'electronhub' }, // Nebula Coder - DeepSeek R1 (specializzato in coding)
  'nebula-premium-pro': { model: 'deepseek-r1-0528-qwen3-8b', provider: 'electronhub' }, // Nebula AI Premium Pro - DeepSeek R1
  'nebula-premium-max': { model: 'deepseek-r1-0528-qwen3-8b', provider: 'electronhub' } // Nebula AI Premium Max - DeepSeek R1
};


