import { writable } from 'svelte/store';

// Store per i progetti
export const projects = writable([]);
export const selectedProject = writable(null);

export function createProject(name, description = '') {
  const newProject = {
    id: Date.now().toString(),
    name,
    description,
    chats: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  projects.update(allProjects => [...allProjects, newProject]);
  saveProjectsToStorage();
  return newProject;
}

export function deleteProject(projectId) {
  projects.update(allProjects => allProjects.filter(p => p.id !== projectId));
  if (selectedProject === projectId) {
    selectedProject.set(null);
  }
  saveProjectsToStorage();
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

loadProjectsFromStorage();

