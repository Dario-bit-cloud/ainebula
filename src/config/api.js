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
// Tutti i modelli usano ora deepseek-llm-67b-chat tramite Electron Hub
// DeepSeek LLM 67B Chat - Modello avanzato con 67 miliardi di parametri
// Supporta: Function Call, High Context (128K tokens)
export const MODEL_MAPPING = {
  'nebula-1.0': { model: 'deepseek-llm-67b-chat', provider: 'electronhub' }, // Nebula AI 1.0 - DeepSeek LLM 67B Chat
  'nebula-pro': { model: 'deepseek-llm-67b-chat', provider: 'electronhub' }, // Nebula AI Pro - DeepSeek LLM 67B Chat
  'nebula-coder': { model: 'deepseek-llm-67b-chat', provider: 'electronhub' }, // Nebula Coder - DeepSeek LLM 67B Chat (specializzato in coding)
  'nebula-search': { model: 'deepseek-llm-67b-chat', provider: 'electronhub', webSearch: true }, // Nebula Search - DeepSeek LLM 67B Chat (con web search)
  'nebula-search-pro': { model: 'deepseek-llm-67b-chat', provider: 'electronhub', webSearch: true }, // Nebula Search Pro - DeepSeek LLM 67B Chat (con web search avanzato)
  'nebula-research': { model: 'deepseek-llm-67b-chat', provider: 'electronhub', webSearch: true }, // Nebula Research - DeepSeek LLM 67B Chat (con reasoning e web search)
  'nebula-premium-pro': { model: 'deepseek-llm-67b-chat', provider: 'electronhub' }, // Nebula AI Premium Pro - DeepSeek LLM 67B Chat
  'nebula-premium-max': { model: 'deepseek-llm-67b-chat', provider: 'electronhub' } // Nebula AI Premium Max - DeepSeek LLM 67B Chat
};


