// Configurazione API - Electron Hub (default)
export const API_CONFIG = {
  baseURL: 'https://api.electronhub.ai/v1',
  apiKey: 'ek-Sb1My10CEAlsrg3EanwhCHOHClJvGWzaW8JocbH6ZEBOOEgPzZ',
  timeout: 30000 // 30 secondi
};

// Configurazione API - LLM7.io (deprecato - non più utilizzato)
// export const LLM7_CONFIG = {
//   baseURL: 'https://api.llm7.io/v1',
//   apiKey: '9I0oxFYS9vFJKLYm6Tbpn6YMObVnMdsrNOPs/r6ZZA0T4Ve2Vn8eWcuYSOMy37eZ6TwyC4WUPmPE6/y6ioivxNo3HkPG72k12SoM25DN5i4+21BPY6E/DFoibTaN+zAW/216gIo=',
//   timeout: 30000 // 30 secondi
// };

// Mappatura modelli locali ai modelli API e provider
// Tutti i modelli usano ora gpt-5-nano tramite Electron Hub
export const MODEL_MAPPING = {
  'nebula-1.0': { model: 'gpt-5-nano', provider: 'electronhub' }, // Nebula AI 1.0 - GPT-5 Nano
  'nebula-pro': { model: 'gpt-5-nano', provider: 'electronhub' }, // Nebula AI Pro - GPT-5 Nano
  'nebula-coder': { model: 'gpt-5-nano', provider: 'electronhub' }, // Nebula Coder - GPT-5 Nano (specializzato in coding)
  'nebula-premium-pro': { model: 'gpt-5-nano', provider: 'electronhub' }, // Nebula AI Premium Pro - GPT-5 Nano
  'nebula-premium-max': { model: 'gpt-5-nano', provider: 'electronhub' } // Nebula AI Premium Max - GPT-5 Nano
};


