import { writable, derived } from 'svelte/store';
import { getCurrentLanguage, translations } from '../utils/i18n.js';

// Store per la lingua corrente
export const currentLanguage = writable(getCurrentLanguage());

// Funzione per aggiornare la lingua
export function setLanguage(lang) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nebula-language', lang);
    const actualLang = lang === 'system' ? getCurrentLanguage() : lang;
    currentLanguage.set(actualLang);
  }
}

// Store derivato che fornisce le traduzioni della lingua corrente
export const translationsStore = derived(currentLanguage, ($currentLanguage) => {
  return translations[$currentLanguage] || translations['it'];
});

// Funzione helper reattiva per tradurre
export const t = derived(currentLanguage, ($currentLanguage) => {
  return (key, params = {}) => {
    const lang = $currentLanguage || 'it';
    const translation = translations[lang]?.[key] || translations['it']?.[key] || key;
    
    // Sostituisci i parametri {param}
    return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  };
});

// Inizializza la lingua al caricamento
if (typeof window !== 'undefined') {
  currentLanguage.set(getCurrentLanguage());
}

