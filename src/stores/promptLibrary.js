import { writable } from 'svelte/store';

// Libreria di prompt e templates
export const promptTemplates = writable([
  {
    id: 'code-review',
    name: 'Code Review',
    category: 'Sviluppo',
    prompt: 'Analizza il seguente codice e fornisci:\n1. Bug o problemi potenziali\n2. Suggerimenti per migliorare le performance\n3. Best practices applicabili\n4. Refactoring suggeriti\n\nCodice:\n{input}',
    tags: ['codice', 'review', 'programmazione']
  },
  {
    id: 'email-professional',
    name: 'Email Professionale',
    category: 'Comunicazione',
    prompt: 'Scrivi un\'email professionale con il seguente contenuto:\n\nOggetto: {subject}\nContesto: {context}\nTono: Professionale ma amichevole',
    tags: ['email', 'business', 'comunicazione']
  },
  {
    id: 'explain-concept',
    name: 'Spiega un Concetto',
    category: 'Educazione',
    prompt: 'Spiega il concetto di "{topic}" in modo semplice e chiaro, usando esempi pratici quando possibile.',
    tags: ['educazione', 'spiegazione', 'apprendimento']
  },
  {
    id: 'brainstorm',
    name: 'Brainstorming',
    category: 'Creatività',
    prompt: 'Aiutami a fare brainstorming su: {topic}\n\nFornisci almeno 10 idee creative e innovative.',
    tags: ['creatività', 'idee', 'brainstorming']
  },
  {
    id: 'meeting-agenda',
    name: 'Agenda Riunione',
    category: 'Business',
    prompt: 'Crea un\'agenda dettagliata per una riunione su: {topic}\n\nDurata: {duration} minuti\nPartecipanti: {participants}',
    tags: ['riunione', 'agenda', 'business']
  },
  {
    id: 'summary',
    name: 'Riassunto',
    category: 'Produttività',
    prompt: 'Crea un riassunto conciso e ben strutturato del seguente testo:\n\n{input}',
    tags: ['riassunto', 'sintesi', 'produttività']
  },
  {
    id: 'translation',
    name: 'Traduzione',
    category: 'Linguistica',
    prompt: 'Traduci il seguente testo in {targetLanguage}, mantenendo il tono e il registro originale:\n\n{input}',
    tags: ['traduzione', 'lingua', 'multilingue']
  },
  {
    id: 'blog-post',
    name: 'Articolo Blog',
    category: 'Scrittura',
    prompt: 'Scrivi un articolo per blog su: {topic}\n\nLunghezza: {length} parole\nTono: {tone}\nTarget audience: {audience}',
    tags: ['blog', 'scrittura', 'content']
  }
]);

export const savedPrompts = writable([]);

// Funzioni per gestire i prompt personalizzati
export function savePrompt(prompt) {
  savedPrompts.update(prompts => [...prompts, {
    ...prompt,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  }]);
}

export function deletePrompt(promptId) {
  savedPrompts.update(prompts => prompts.filter(p => p.id !== promptId));
}

export function getPromptById(id) {
  let result = null;
  promptTemplates.subscribe(templates => {
    result = templates.find(t => t.id === id) || null;
  })();
  
  if (!result) {
    savedPrompts.subscribe(prompts => {
      result = prompts.find(p => p.id === id) || null;
    })();
  }
  
  return result;
}

export function fillPromptTemplate(template, variables) {
  let filledPrompt = template.prompt;
  
  for (const [key, value] of Object.entries(variables)) {
    filledPrompt = filledPrompt.replace(new RegExp(`{${key}}`, 'g'), value || '');
  }
  
  return filledPrompt;
}

