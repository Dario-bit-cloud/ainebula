import { writable, get } from 'svelte/store';
import { isAuthenticatedStore } from './auth.js';
import { 
  getProjectsFromDatabase, 
  saveProjectToDatabase, 
  updateProjectInDatabase, 
  deleteProjectFromDatabase 
} from '../services/projectService.js';

// Store per i progetti (cartelle)
export const projects = writable([]);
export const selectedProject = writable(null);

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16'  // lime
];

const DEFAULT_ICONS = [
  'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', // folder
  'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', // star
  'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4', // settings
  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', // clipboard
  'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' // clock
];

export async function createProject(name, description = '', color = null, icon = null) {
  const allProjects = get(projects);
  const colorIndex = allProjects.length % DEFAULT_COLORS.length;
  const iconIndex = allProjects.length % DEFAULT_ICONS.length;
  
  const newProject = {
    id: Date.now().toString(),
    name,
    description,
    color: color || DEFAULT_COLORS[colorIndex],
    icon: icon || DEFAULT_ICONS[iconIndex],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  projects.update(allProjects => [...allProjects, newProject]);
  
  // Salva nel database se autenticato, altrimenti in localStorage
  if (get(isAuthenticatedStore)) {
    const result = await saveProjectToDatabase(newProject);
    if (!result.success) {
      console.error('Errore salvataggio progetto nel database:', result);
      // Mantieni in localStorage come fallback
      saveProjectsToStorage();
    }
  } else {
    saveProjectsToStorage();
  }
  
  return newProject;
}

export async function updateProject(projectId, updates) {
  const updatedProject = { ...updates, updatedAt: new Date().toISOString() };
  
  projects.update(allProjects => 
    allProjects.map(project => 
      project.id === projectId 
        ? { ...project, ...updatedProject }
        : project
    )
  );
  
  // Aggiorna nel database se autenticato, altrimenti in localStorage
  if (get(isAuthenticatedStore)) {
    const result = await updateProjectInDatabase(projectId, updates);
    if (!result.success) {
      console.error('Errore aggiornamento progetto nel database:', result);
      // Mantieni in localStorage come fallback
      saveProjectsToStorage();
    }
  } else {
    saveProjectsToStorage();
  }
}

export async function deleteProject(projectId) {
  projects.update(allProjects => allProjects.filter(p => p.id !== projectId));
  const currentSelected = get(selectedProject);
  if (currentSelected === projectId) {
    selectedProject.set(null);
  }
  
  // Elimina dal database se autenticato, altrimenti da localStorage
  if (get(isAuthenticatedStore)) {
    const result = await deleteProjectFromDatabase(projectId);
    if (!result.success) {
      console.error('Errore eliminazione progetto dal database:', result);
      // Mantieni aggiornato localStorage come fallback
      saveProjectsToStorage();
    }
  } else {
    saveProjectsToStorage();
  }
}

const STORAGE_KEY = 'nebula-ai-projects';

export function saveProjectsToStorage() {
  if (typeof window !== 'undefined') {
    projects.subscribe(projectsList => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsList));
    })();
  }
}

export function loadProjectsFromStorage() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        projects.set(parsed);
      }
    } catch (error) {
      console.error('Error loading projects from storage:', error);
    }
  }
}

// Carica i progetti dal database se autenticato, altrimenti da localStorage
export async function loadProjects() {
  // Evita caricamenti multipli simultanei
  if (isLoadingProjects) {
    console.log('Caricamento progetti già in corso, skip loadProjects');
    return;
  }
  
  isLoadingProjects = true;
  
  try {
    if (get(isAuthenticatedStore)) {
      // Carica dal database
      const result = await getProjectsFromDatabase();
      if (result.success && result.projects) {
        projects.set(result.projects);
        console.log(`✅ Caricati ${result.projects.length} progetti dal database`);
      } else {
        console.warn('Nessun progetto trovato o errore nel caricamento:', result);
        // Fallback a localStorage
        loadProjectsFromStorage();
      }
    } else {
      // Carica da localStorage se non autenticato
      loadProjectsFromStorage();
    }
  } catch (error) {
    console.error('Errore caricamento progetti:', error);
    // Fallback a localStorage
    loadProjectsFromStorage();
  } finally {
    isLoadingProjects = false;
  }
}

// Flag per evitare caricamenti multipli simultanei
let isLoadingProjects = false;

// Sincronizza i progetti quando l'utente fa login
export async function syncProjectsOnLogin() {
  if (!get(isAuthenticatedStore)) {
    console.log('Utente non autenticato, skip syncProjectsOnLogin');
    return;
  }
  
  // Evita caricamenti multipli simultanei
  if (isLoadingProjects) {
    console.log('Caricamento progetti già in corso, skip');
    return;
  }
  
  isLoadingProjects = true;
  
  try {
    // Carica dal database
    const result = await getProjectsFromDatabase();
    console.log('Risultato getProjectsFromDatabase:', result);
    
    if (result.success && result.projects) {
      projects.set(result.projects);
      console.log(`✅ Caricati ${result.projects.length} progetti dal database`);
    } else {
      console.warn('Nessun progetto trovato o errore nel caricamento:', result);
    }
    
    // Migra i progetti da localStorage al database (solo se non ci sono già progetti nel database)
    await migrateProjectsFromLocalStorage();
  } catch (error) {
    console.error('Errore in syncProjectsOnLogin:', error);
    // In caso di errore, prova comunque a migrare da localStorage
    await migrateProjectsFromLocalStorage();
  } finally {
    isLoadingProjects = false;
  }
}

// Migra i progetti da localStorage al database
export async function migrateProjectsFromLocalStorage() {
  if (!get(isAuthenticatedStore)) {
    return;
  }
  
  if (typeof window === 'undefined') {
    return;
  }
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return;
  }
  
  try {
    const localProjects = JSON.parse(stored);
    if (!Array.isArray(localProjects) || localProjects.length === 0) {
      return;
    }
    
    console.log(`🔄 Trovati ${localProjects.length} progetti locali da migrare`);
    
    // Carica i progetti attuali dal database per evitare duplicati
    const dbResult = await getProjectsFromDatabase();
    const existingProjectIds = new Set();
    if (dbResult.success && dbResult.projects) {
      dbResult.projects.forEach(project => existingProjectIds.add(project.id));
    }
    
    let migratedCount = 0;
    let failedCount = 0;
    
    // Salva ogni progetto locale nel database
    for (const project of localProjects) {
      // Salta se il progetto esiste già nel database
      if (existingProjectIds.has(project.id)) {
        console.log(`⏭️ Progetto ${project.id} già presente nel database, skip`);
        continue;
      }
      
      try {
        const saveResult = await saveProjectToDatabase(project);
        if (saveResult.success) {
          migratedCount++;
          console.log(`✅ Migrato progetto: ${project.name || project.id}`);
        } else {
          failedCount++;
          console.warn(`⚠️ Errore migrazione progetto ${project.id}:`, saveResult.message);
        }
      } catch (error) {
        failedCount++;
        console.error(`❌ Errore migrazione progetto ${project.id}:`, error);
      }
    }
    
    // Pulisci localStorage solo se la migrazione è andata a buon fine per almeno un progetto
    if (migratedCount > 0) {
      // Rimuovi solo i progetti migrati con successo
      const remainingProjects = localProjects.filter(project => {
        if (existingProjectIds.has(project.id)) {
          return false; // Già presente nel database
        }
        // Se la migrazione è fallita, mantieni il progetto in localStorage
        return true;
      });
      
      if (remainingProjects.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        console.log('🗑️ localStorage pulito dopo migrazione completa');
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingProjects));
        console.log(`💾 ${remainingProjects.length} progetti rimasti in localStorage`);
      }
      
      // Ricarica i progetti dal database dopo la migrazione
      const updatedResult = await getProjectsFromDatabase();
      if (updatedResult.success && updatedResult.projects) {
        projects.set(updatedResult.projects);
        console.log(`✅ Dopo migrazione, caricati ${updatedResult.projects.length} progetti totali`);
      }
      
      if (migratedCount > 0) {
        console.log(`✅ Migrazione completata: ${migratedCount} progetti migrati, ${failedCount} falliti`);
      }
    } else {
      console.log(`ℹ️ Nessun progetto da migrare o tutti già presenti nel database`);
    }
  } catch (error) {
    console.error('❌ Errore durante migrazione progetti:', error);
  }
}

// Pulisci i progetti quando l'utente esce (rimuove solo quelli salvati sull'account)
export function clearProjectsOnLogout() {
  // Rimuovi tutti i progetti dallo store
  projects.set([]);
  // Resetta il selectedProject
  selectedProject.set(null);
  // Non toccare il localStorage - quelli sono i progetti locali, non quelli dell'account
}

// Inizializza caricando da storage (per utenti non autenticati)
loadProjectsFromStorage();

