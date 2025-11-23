import { writable, get } from 'svelte/store';

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

export function createProject(name, description = '', color = null, icon = null) {
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
  saveProjectsToStorage();
  return newProject;
}

export function updateProject(projectId, updates) {
  projects.update(allProjects => 
    allProjects.map(project => 
      project.id === projectId 
        ? { ...project, ...updates, updatedAt: new Date().toISOString() }
        : project
    )
  );
  saveProjectsToStorage();
}

export function deleteProject(projectId) {
  projects.update(allProjects => allProjects.filter(p => p.id !== projectId));
  const currentSelected = get(selectedProject);
  if (currentSelected === projectId) {
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

