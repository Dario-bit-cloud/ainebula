import { writable, get } from 'svelte/store';
import { get as getStore } from 'svelte/store';
import { user } from './user.js';

// Libreria di prompt e templates predefiniti
export const promptTemplates = writable([
  {
    id: 'code-review',
    name: 'Code Review',
    category: 'Sviluppo',
    prompt: 'Analizza il seguente codice e fornisci:\n1. Bug o problemi potenziali\n2. Suggerimenti per migliorare le performance\n3. Best practices applicabili\n4. Refactoring suggeriti\n\nCodice:\n{input}',
    tags: ['codice', 'review', 'programmazione'],
    description: 'Analizza codice per trovare bug, migliorare performance e applicare best practices',
    usageCount: 0
  },
  {
    id: 'code-explain',
    name: 'Spiega Codice',
    category: 'Sviluppo',
    prompt: 'Spiega il seguente codice in modo dettagliato:\n\n1. Cosa fa il codice\n2. Come funziona\n3. Quali sono le parti principali\n4. Eventuali pattern o tecniche utilizzate\n\nCodice:\n{input}',
    tags: ['codice', 'spiegazione', 'programmazione'],
    description: 'Spiega codice complesso in modo chiaro e dettagliato',
    usageCount: 0
  },
  {
    id: 'code-optimize',
    name: 'Ottimizza Codice',
    category: 'Sviluppo',
    prompt: 'Ottimizza il seguente codice per migliorare:\n1. Performance\n2. Leggibilità\n3. Manutenibilità\n4. Efficienza\n\nFornisci anche il codice ottimizzato.\n\nCodice:\n{input}',
    tags: ['codice', 'ottimizzazione', 'performance'],
    description: 'Ottimizza codice esistente per migliorare performance e qualità',
    usageCount: 0
  },
  {
    id: 'code-generate',
    name: 'Genera Codice',
    category: 'Sviluppo',
    prompt: 'Genera codice {language} per: {description}\n\nRequisiti:\n- {requirements}\n- Best practices\n- Commenti esplicativi\n- Gestione errori',
    tags: ['codice', 'generazione', 'programmazione'],
    description: 'Genera codice da zero basato su specifiche',
    usageCount: 0
  },
  {
    id: 'email-professional',
    name: 'Email Professionale',
    category: 'Comunicazione',
    prompt: 'Scrivi un\'email professionale con il seguente contenuto:\n\nOggetto: {subject}\nContesto: {context}\nTono: Professionale ma amichevole\n\nAssicurati che sia chiara, concisa e appropriata.',
    tags: ['email', 'business', 'comunicazione'],
    description: 'Crea email professionali ben strutturate',
    usageCount: 0
  },
  {
    id: 'email-followup',
    name: 'Email di Follow-up',
    category: 'Comunicazione',
    prompt: 'Scrivi un\'email di follow-up per: {context}\n\nTono: {tone}\nScopo: {purpose}\n\nMantieni un tono professionale e rispettoso.',
    tags: ['email', 'follow-up', 'comunicazione'],
    description: 'Crea email di follow-up efficaci',
    usageCount: 0
  },
  {
    id: 'explain-concept',
    name: 'Spiega un Concetto',
    category: 'Educazione',
    prompt: 'Spiega il concetto di "{topic}" in modo semplice e chiaro, usando esempi pratici quando possibile.\n\nStruttura la spiegazione in:\n1. Definizione\n2. Come funziona\n3. Esempi pratici\n4. Applicazioni reali',
    tags: ['educazione', 'spiegazione', 'apprendimento'],
    description: 'Spiega concetti complessi in modo semplice e comprensibile',
    usageCount: 0
  },
  {
    id: 'tutorial',
    name: 'Crea Tutorial',
    category: 'Educazione',
    prompt: 'Crea un tutorial passo-passo su come: {task}\n\nLivello: {level}\nDurata stimata: {duration}\n\nIncludi:\n- Introduzione\n- Prerequisiti\n- Passi dettagliati\n- Esempi pratici\n- Conclusione',
    tags: ['tutorial', 'guida', 'educazione'],
    description: 'Crea tutorial dettagliati e strutturati',
    usageCount: 0
  },
  {
    id: 'brainstorm',
    name: 'Brainstorming',
    category: 'Creatività',
    prompt: 'Aiutami a fare brainstorming su: {topic}\n\nFornisci almeno 10 idee creative e innovative.\n\nPer ogni idea, includi:\n- Descrizione breve\n- Vantaggi\n- Possibili sfide\n- Come implementarla',
    tags: ['creatività', 'idee', 'brainstorming'],
    description: 'Genera idee creative e innovative',
    usageCount: 0
  },
  {
    id: 'story-idea',
    name: 'Idea Storia',
    category: 'Creatività',
    prompt: 'Genera un\'idea per una storia su: {theme}\n\nIncludi:\n- Trama principale\n- Personaggi principali\n- Ambientazione\n- Conflitto centrale\n- Possibile finale',
    tags: ['storia', 'narrativa', 'creatività'],
    description: 'Genera idee per storie e narrazioni',
    usageCount: 0
  },
  {
    id: 'meeting-agenda',
    name: 'Agenda Riunione',
    category: 'Business',
    prompt: 'Crea un\'agenda dettagliata per una riunione su: {topic}\n\nDurata: {duration} minuti\nPartecipanti: {participants}\n\nIncludi:\n- Obiettivi della riunione\n- Punti da discutere\n- Tempo allocato per ogni punto\n- Azioni da intraprendere',
    tags: ['riunione', 'agenda', 'business'],
    description: 'Crea agende di riunione ben strutturate',
    usageCount: 0
  },
  {
    id: 'meeting-notes',
    name: 'Verbale Riunione',
    category: 'Business',
    prompt: 'Crea un verbale della riunione con:\n\nArgomento: {topic}\nPartecipanti: {participants}\n\nIncludi:\n- Punti discussi\n- Decisioni prese\n- Azioni assegnate\n- Prossimi passi\n- Scadenze',
    tags: ['riunione', 'verbale', 'business'],
    description: 'Crea verbali di riunione professionali',
    usageCount: 0
  },
  {
    id: 'summary',
    name: 'Riassunto',
    category: 'Produttività',
    prompt: 'Crea un riassunto conciso e ben strutturato del seguente testo:\n\n{input}\n\nIncludi:\n- Punti chiave\n- Conclusioni principali\n- Informazioni rilevanti',
    tags: ['riassunto', 'sintesi', 'produttività'],
    description: 'Crea riassunti concisi e ben strutturati',
    usageCount: 0
  },
  {
    id: 'action-items',
    name: 'Estrai Azioni',
    category: 'Produttività',
    prompt: 'Dal seguente testo, estrai tutte le azioni da intraprendere:\n\n{input}\n\nPer ogni azione, indica:\n- Cosa fare\n- Chi è responsabile (se menzionato)\n- Scadenza (se menzionata)\n- Priorità',
    tags: ['azioni', 'produttività', 'task'],
    description: 'Estrae azioni e task da testi',
    usageCount: 0
  },
  {
    id: 'translation',
    name: 'Traduzione',
    category: 'Linguistica',
    prompt: 'Traduci il seguente testo in {targetLanguage}, mantenendo il tono e il registro originale:\n\n{input}\n\nAssicurati che la traduzione sia:\n- Accurata\n- Naturale\n- Culturalmente appropriata',
    tags: ['traduzione', 'lingua', 'multilingue'],
    description: 'Traduce testi mantenendo tono e registro',
    usageCount: 0
  },
  {
    id: 'grammar-check',
    name: 'Controllo Grammaticale',
    category: 'Linguistica',
    prompt: 'Controlla e correggi la grammatica, ortografia e punteggiatura del seguente testo:\n\n{input}\n\nFornisci:\n- Testo corretto\n- Spiegazione delle correzioni principali',
    tags: ['grammatica', 'correzione', 'lingua'],
    description: 'Corregge errori grammaticali e ortografici',
    usageCount: 0
  },
  {
    id: 'blog-post',
    name: 'Articolo Blog',
    category: 'Scrittura',
    prompt: 'Scrivi un articolo per blog su: {topic}\n\nLunghezza: {length} parole\nTono: {tone}\nTarget audience: {audience}\n\nStruttura:\n- Titolo accattivante\n- Introduzione\n- Corpo principale con sezioni\n- Conclusione\n- Call-to-action',
    tags: ['blog', 'scrittura', 'content'],
    description: 'Crea articoli per blog ben strutturati',
    usageCount: 0
  },
  {
    id: 'social-post',
    name: 'Post Social Media',
    category: 'Scrittura',
    prompt: 'Crea un post per {platform} su: {topic}\n\nTono: {tone}\nLunghezza: {length} caratteri\nHashtag: {hashtags}\n\nAssicurati che sia:\n- Coinvolgente\n- Appropriato per la piattaforma\n- Con call-to-action',
    tags: ['social', 'marketing', 'scrittura'],
    description: 'Crea post per social media efficaci',
    usageCount: 0
  },
  {
    id: 'cover-letter',
    name: 'Lettera di Presentazione',
    category: 'Scrittura',
    prompt: 'Scrivi una lettera di presentazione per:\n\nPosizione: {position}\nAzienda: {company}\nEsperienze rilevanti: {experience}\n\nTono: Professionale\nLunghezza: 1 pagina\n\nEvidenzia:\n- Perché sei adatto per la posizione\n- Cosa puoi portare all\'azienda\n- Entusiasmo per il ruolo',
    tags: ['lavoro', 'cv', 'scrittura'],
    description: 'Crea lettere di presentazione professionali',
    usageCount: 0
  },
  {
    id: 'resume-improve',
    name: 'Migliora CV',
    category: 'Scrittura',
    prompt: 'Migliora la seguente sezione del CV:\n\n{section}\n\nFocalizzati su:\n- Azioni concrete\n- Risultati misurabili\n- Parole chiave rilevanti\n- Chiarezza e concisione',
    tags: ['cv', 'lavoro', 'scrittura'],
    description: 'Migliora sezioni del CV per renderle più efficaci',
    usageCount: 0
  },
  {
    id: 'product-description',
    name: 'Descrizione Prodotto',
    category: 'Business',
    prompt: 'Scrivi una descrizione prodotto per:\n\nProdotto: {product}\nCaratteristiche: {features}\nTarget: {target}\n\nIncludi:\n- Benefici principali\n- Caratteristiche distintive\n- Call-to-action\n- Tono persuasivo ma onesto',
    tags: ['marketing', 'prodotto', 'business'],
    description: 'Crea descrizioni prodotto convincenti',
    usageCount: 0
  },
  {
    id: 'problem-solving',
    name: 'Risoluzione Problema',
    category: 'Business',
    prompt: 'Analizza il seguente problema e proponi soluzioni:\n\nProblema: {problem}\nContesto: {context}\n\nPer ogni soluzione, includi:\n- Descrizione\n- Vantaggi\n- Svantaggi\n- Come implementarla\n- Costi/risorse necessarie',
    tags: ['problema', 'soluzione', 'business'],
    description: 'Analizza problemi e propone soluzioni',
    usageCount: 0
  }
]);

// Store per i prompt personalizzati salvati
export const savedPrompts = writable([]);

// Carica i prompt salvati dal localStorage
function loadSavedPrompts() {
  try {
    const stored = localStorage.getItem('savedPrompts');
    if (stored) {
      const parsed = JSON.parse(stored);
      savedPrompts.set(parsed);
    }
  } catch (error) {
    console.error('Errore caricamento prompt salvati:', error);
  }
}

// Salva i prompt nel localStorage
function savePromptsToStorage() {
  try {
    const prompts = get(savedPrompts);
    localStorage.setItem('savedPrompts', JSON.stringify(prompts));
  } catch (error) {
    console.error('Errore salvataggio prompt:', error);
  }
}

// Inizializza caricando i prompt salvati
loadSavedPrompts();

// Funzioni per gestire i prompt personalizzati
export function savePrompt(prompt) {
  const promptToSave = {
    ...prompt,
    id: prompt.id || Date.now().toString(),
    createdAt: prompt.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: prompt.usageCount || 0,
    tags: prompt.tags || []
  };
  
  savedPrompts.update(prompts => {
    const existingIndex = prompts.findIndex(p => p.id === promptToSave.id);
    if (existingIndex >= 0) {
      // Aggiorna prompt esistente
      prompts[existingIndex] = promptToSave;
      return prompts;
    } else {
      // Aggiungi nuovo prompt
      return [...prompts, promptToSave];
    }
  });
  
  savePromptsToStorage();
  return promptToSave;
}

export function updatePrompt(promptId, updates) {
  savedPrompts.update(prompts => {
    const index = prompts.findIndex(p => p.id === promptId);
    if (index >= 0) {
      prompts[index] = {
        ...prompts[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      savePromptsToStorage();
    }
    return prompts;
  });
}

export function deletePrompt(promptId) {
  savedPrompts.update(prompts => {
    const filtered = prompts.filter(p => p.id !== promptId);
    savePromptsToStorage();
    return filtered;
  });
}

export function duplicatePrompt(promptId) {
  const prompt = getPromptById(promptId);
  if (prompt) {
    const duplicated = {
      ...prompt,
      id: Date.now().toString(),
      name: `${prompt.name} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    };
    savePrompt(duplicated);
    return duplicated;
  }
  return null;
}

export function incrementUsageCount(promptId) {
  // Incrementa per template predefiniti
  promptTemplates.update(templates => {
    const template = templates.find(t => t.id === promptId);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;
    }
    return templates;
  });
  
  // Incrementa per prompt salvati
  savedPrompts.update(prompts => {
    const prompt = prompts.find(p => p.id === promptId);
    if (prompt) {
      prompt.usageCount = (prompt.usageCount || 0) + 1;
      savePromptsToStorage();
    }
    return prompts;
  });
}

export function getPromptById(id) {
  let result = null;
  const templates = get(promptTemplates);
  result = templates.find(t => t.id === id) || null;
  
  if (!result) {
    const prompts = get(savedPrompts);
    result = prompts.find(p => p.id === id) || null;
  }
  
  return result;
}

export function extractVariables(promptText) {
  const variableRegex = /\{([^}]+)\}/g;
  const variables = [];
  let match;
  
  while ((match = variableRegex.exec(promptText)) !== null) {
    const varName = match[1];
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }
  
  return variables;
}

export function fillPromptTemplate(template, variables) {
  let filledPrompt = template.prompt || template;
  
  for (const [key, value] of Object.entries(variables)) {
    filledPrompt = filledPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  
  return filledPrompt;
}

// Esporta prompt per backup
export function exportPrompts() {
  const prompts = get(savedPrompts);
  const dataStr = JSON.stringify(prompts, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `prompts-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Importa prompt da file
export function importPrompts(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          imported.forEach(prompt => {
            // Rimuovi id e date per creare nuovi prompt
            const { id, createdAt, updatedAt, ...promptData } = prompt;
            savePrompt(promptData);
          });
          resolve(imported.length);
        } else {
          reject(new Error('Formato file non valido'));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

