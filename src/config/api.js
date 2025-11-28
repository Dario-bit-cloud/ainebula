// Configurazione API - Electron Hub (default)
export const API_CONFIG = {
  baseURL: 'https://api.electronhub.ai/v1',
  apiKey: 'ek-EV4Fh5dDIvnR4gHkiK7qPBz2R5mEgnJImbuC03AMTXuZ5Aqhrc',
  timeout: 30000 // 30 secondi
};

// Configurazione API - LLM7.io
export const LLM7_CONFIG = {
  baseURL: 'https://api.llm7.io/v1',
  apiKey: '9I0oxFYS9vFJKLYm6Tbpn6YMObVnMdsrNOPs/r6ZZA0T4Ve2Vn8eWcuYSOMy37eZ6TwyC4WUPmPE6/y6ioivxNo3HkPG72k12SoM25DN5i4+21BPY6E/DFoibTaN+zAW/216gIo=',
  timeout: 30000 // 30 secondi
};

// Mappatura modelli locali ai modelli API e provider
// Tutti i modelli usano ora gpt-4o-mini-search-preview-2025-03-11 tramite Electron Hub
// OpenAI GPT-4o-mini Search Preview - Modello con ricerca web in tempo reale
// Supporta: Vision, Function Call, High Context (128K tokens), Web Search
export const MODEL_MAPPING = {
  'nebula-1.0': { model: 'gpt-4o-mini-search-preview-2025-03-11', provider: 'electronhub' }, // Nebula AI 1.0 - GPT-4o-mini Search Preview
  'nebula-pro': { model: 'ministral-3b', provider: 'electronhub' }, // Nebula AI Pro - Ministral 3B
  'nebula-coder': { model: 'qwen-2.5-coder-32b-instruct', provider: 'electronhub' }, // Nebula Coder - Qwen 2.5 Coder 32B Instruct (specializzato in coding)
  'nebula-search': { model: 'gpt-4o-mini-search-preview-2025-03-11', provider: 'electronhub', webSearch: true }, // Nebula Search - GPT-4o-mini Search Preview (con web search)
  'nebula-search-pro': { model: 'gpt-4o-mini-search-preview-2025-03-11', provider: 'electronhub', webSearch: true }, // Nebula Search Pro - GPT-4o-mini Search Preview (con web search avanzato)
  'nebula-research': { model: 'gpt-4o-mini-search-preview-2025-03-11', provider: 'electronhub', webSearch: true }, // Nebula Research - GPT-4o-mini Search Preview (con reasoning e web search)
  'nebula-premium-pro': { model: 'gpt-4o-mini-search-preview-2025-03-11', provider: 'electronhub' }, // Nebula AI Premium Pro - GPT-4o-mini Search Preview
  'nebula-premium-max': { model: 'gpt-4o-mini-search-preview-2025-03-11', provider: 'electronhub' }, // Nebula AI Premium Max - GPT-4o-mini Search Preview
  'nebula-llm7': { model: 'default', provider: 'llm7' } // Nebula AI LLM7 - Modello gratuito tramite LLM7.io (selettore default)
};

// Configurazione per la generazione di immagini - Modello Fast
export const IMAGE_GENERATION_CONFIG_FAST = {
  timeout: 60000, // 60 secondi per la generazione immagini
  defaultSize: '1024x1024',
  defaultQuality: 'standard',
  defaultStyle: 'vivid',
  providers: [
    {
      name: 'LLM7 Fast',
      baseURL: 'https://api.llm7.io/v1',
      apiKey: '9I0oxFYS9vFJKLYm6Tbpn6YMObVnMdsrNOPs/r6ZZA0T4Ve2Vn8eWcuYSOMy37eZ6TwyC4WUPmPE6/y6ioivxNo3HkPG72k12SoM25DN5i4+21BPY6E/DFoibTaN+zAW/216gIo=',
      priority: 1,
      imageModel: 'fast' // Modello fast per immagini veloci
    }
  ]
};

// Configurazione per la generazione di immagini - Modello Flux
export const IMAGE_GENERATION_CONFIG_FLUX = {
  timeout: 60000, // 60 secondi per la generazione immagini
  defaultSize: '1024x1024',
  defaultQuality: 'standard',
  defaultStyle: 'vivid',
  providers: [
    {
      name: 'LLM7 Flux',
      baseURL: 'https://api.llm7.io/v1',
      apiKey: '9I0oxFYS9vFJKLYm6Tbpn6YMObVnMdsrNOPs/r6ZZA0T4Ve2Vn8eWcuYSOMy37eZ6TwyC4WUPmPE6/y6ioivxNo3HkPG72k12SoM25DN5i4+21BPY6E/DFoibTaN+zAW/216gIo=',
      priority: 1,
      imageModel: 'flux' // Modello flux per immagini di alta qualità (come da documentazione LLM7.io)
    }
  ]
};

// Configurazione predefinita (usa Fast)
export const IMAGE_GENERATION_CONFIG = IMAGE_GENERATION_CONFIG_FAST;


