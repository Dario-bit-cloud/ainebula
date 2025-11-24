import { writable } from 'svelte/store';
import { get } from 'svelte/store';

// Carica le preferenze da localStorage
const loadPersonalization = () => {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      baseStyle: 'default',
      customInstructions: '',
      alternativeName: '',
      occupation: ''
    };
  }
  
  try {
    const stored = localStorage.getItem('nebula-personalization');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading personalization:', e);
  }
  
  return {
    enabled: false,
    baseStyle: 'default',
    customInstructions: '',
    alternativeName: '',
    occupation: ''
  };
};

// Crea lo store con i valori iniziali
const createPersonalizationStore = () => {
  const { subscribe, set, update } = writable(loadPersonalization());
  
  return {
    subscribe,
    set: (value) => {
      set(value);
      // Salva in localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('nebula-personalization', JSON.stringify(value));
        } catch (e) {
          console.error('Error saving personalization:', e);
        }
      }
    },
    update: (fn) => {
      update(current => {
        const updated = fn(current);
        // Salva in localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('nebula-personalization', JSON.stringify(updated));
          } catch (e) {
            console.error('Error saving personalization:', e);
          }
        }
        return updated;
      });
    },
    reset: () => {
      const defaultValues = {
        enabled: false,
        baseStyle: 'default',
        customInstructions: '',
        alternativeName: '',
        occupation: ''
      };
      set(defaultValues);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('nebula-personalization');
        } catch (e) {
          console.error('Error removing personalization:', e);
        }
      }
    }
  };
};

export const personalization = createPersonalizationStore();

// Funzione helper per generare il prompt di sistema basato sulle preferenze
export function getPersonalizationSystemPrompt() {
  const prefs = get(personalization);
  
  if (!prefs.enabled) {
    return '';
  }
  
  let prompt = '';
  
  // Stile e tono di base
  const stylePrompts = {
    'default': '',
    'conversational': 'Usa uno stile discorsivo e naturale, come se stessi parlando con un amico.',
    'witty': 'Usa uno stile arguto e spiritoso, con battute e osservazioni intelligenti quando appropriato.',
    'blunt': 'Usa uno stile schietto e diretto, senza giri di parole.',
    'encouraging': 'Usa uno stile incoraggiante e positivo, supportando sempre l\'utente.',
    'genz': 'Usa uno stile moderno e informale, tipico della Generazione Z, con espressioni contemporanee.'
  };
  
  if (prefs.baseStyle !== 'default' && stylePrompts[prefs.baseStyle]) {
    prompt += stylePrompts[prefs.baseStyle] + '\n\n';
  }
  
  // Istruzioni personalizzate
  if (prefs.customInstructions && prefs.customInstructions.trim()) {
    prompt += 'Istruzioni personalizzate dell\'utente:\n' + prefs.customInstructions.trim() + '\n\n';
  }
  
  // Nome alternativo
  if (prefs.alternativeName && prefs.alternativeName.trim()) {
    prompt += `L'utente preferisce essere chiamato: "${prefs.alternativeName.trim()}". Usa questo nome quando ti rivolgi all'utente.\n\n`;
  }
  
  // Occupazione
  if (prefs.occupation && prefs.occupation.trim()) {
    prompt += `Informazioni sull'utente: ${prefs.occupation.trim()}. Tieni conto di questo contesto quando fornisci risposte.\n\n`;
  }
  
  return prompt.trim();
}

