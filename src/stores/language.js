import { writable, derived } from 'svelte/store';
import { getCurrentLanguage, t as translate } from '../utils/i18n.js';

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

// Inizializza la lingua al caricamento
if (typeof window !== 'undefined') {
  currentLanguage.set(getCurrentLanguage());
}

