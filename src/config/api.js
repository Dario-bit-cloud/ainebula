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
// Tutti i modelli usano Electron Hub come provider
export const MODEL_MAPPING = {
  // OpenAI - Flagship Models
  'gpt-4.1': { model: 'gpt-4.1', provider: 'electronhub' },
  'gpt-4o': { model: 'gpt-4o', provider: 'electronhub' },
  'o3': { model: 'o3', provider: 'electronhub' },
  'o3-high': { model: 'o3-high', provider: 'electronhub' },
  'o4-mini': { model: 'o4-mini', provider: 'electronhub' },
  
  // OpenAI - Mini Models
  'gpt-4.1-mini': { model: 'gpt-4.1-mini', provider: 'electronhub' },
  'gpt-4.1-nano': { model: 'gpt-4.1-nano', provider: 'electronhub' },
  'gpt-4o-mini': { model: 'gpt-4o-mini', provider: 'electronhub' },
  'gemini-2.5-flash-preview-09-2025': { model: 'gemini-2.5-flash-preview-09-2025', provider: 'electronhub' },
  'gemini-2.5-flash-preview-09-2025-thinking': { model: 'gemini-2.5-flash-preview-09-2025-thinking', provider: 'electronhub' },
  'gemini-2.5-flash-image': { model: 'gemini-2.5-flash-image', provider: 'electronhub' },
  
  // OpenAI - Code Models
  'gpt-5.1-codex-mini': { model: 'claude-3-haiku-20240307', provider: 'electronhub' },
  
  // OpenAI - Open Source
  'gpt-oss-120b': { model: 'gpt-oss-120b', provider: 'electronhub' },
  'gpt-oss-20b': { model: 'gpt-oss-20b', provider: 'electronhub' },
  
  // OpenAI - Search Models
  'gpt-4o-mini-search-preview': { model: 'gpt-4o-mini-search-preview-2025-03-11', provider: 'electronhub' },
  'gpt-4o-search-preview': { model: 'gpt-4o-search-preview-2025-03-11', provider: 'electronhub' },
  'gpt-4o-search-preview-2025-03-11': { model: 'gpt-4o-search-preview-2025-03-11', provider: 'electronhub' },
  'o3-mini-online': { model: 'o3-mini-online', provider: 'electronhub' },
  
  // OpenAI - Legacy
  'gpt-3.5-turbo': { model: 'gpt-3.5-turbo', provider: 'electronhub' },
  
  // AI di terze parti
  'chatgpt': { model: 'gpt-4o-search-preview-2025-03-11', provider: 'electronhub' },
  'gemini': { model: 'gemini-2.5-flash-lite-preview-09-2025', provider: 'electronhub' },
  'grok': { model: 'grok-3-mini', provider: 'electronhub' },
  'deepseek': { model: 'deepseek-r1-distill-llama-8b', provider: 'electronhub' }
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


