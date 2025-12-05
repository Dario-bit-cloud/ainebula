import { writable, derived } from 'svelte/store';
import { currentLanguage } from './language.js';

// Store per la data/ora corrente che si aggiorna ogni secondo
function createDateTimeStore() {
  const { subscribe, set } = writable(new Date());
  
  // Aggiorna ogni secondo
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);
  
  // Inizializza subito
  set(new Date());
  
  return {
    subscribe,
    // Funzione per fermare l'aggiornamento (utile per cleanup)
    stop: () => clearInterval(interval)
  };
}

export const currentDateTime = createDateTimeStore();

// Store derivato per la data formattata (reattivo alla lingua)
export const formattedDate = derived(
  [currentDateTime, currentLanguage],
  ([$currentDateTime, $currentLanguage]) => {
    const locales = {
      it: 'it-IT',
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE'
    };
    
    const locale = locales[$currentLanguage] || locales['it'];
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return $currentDateTime.toLocaleDateString(locale, dateOptions);
  }
);

// Store derivato per l'ora formattata (reattivo alla lingua)
export const formattedTime = derived(
  [currentDateTime, currentLanguage],
  ([$currentDateTime, $currentLanguage]) => {
    const locales = {
      it: 'it-IT',
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE'
    };
    
    const locale = locales[$currentLanguage] || locales['it'];
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    return $currentDateTime.toLocaleTimeString(locale, timeOptions);
  }
);

// Store derivato combinato per data e ora (reattivo a data/ora e lingua)
export const formattedDateTime = derived(
  [formattedDate, formattedTime],
  ([$formattedDate, $formattedTime]) => ({
    date: $formattedDate,
    time: $formattedTime
  })
);

