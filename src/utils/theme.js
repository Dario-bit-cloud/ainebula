// Utility centralizzata per gestione tema con sincronizzazione in tempo reale

let colorSchemeListener = null;

/**
 * Applica il tema specificato
 * @param {string} theme - 'light', 'dark', o 'system'
 */
export function applyTheme(theme = null) {
  // Se non specificato, leggi da localStorage
  const savedTheme = theme || localStorage.getItem('nebula-theme') || 'system';
  const root = document.documentElement;
  const body = document.body;
  
  // Rimuovi listener precedente se esiste
  if (colorSchemeListener) {
    colorSchemeListener.removeEventListener('change', handleSystemThemeChange);
    colorSchemeListener = null;
  }
  
  // Applica tema colore
  if (savedTheme === 'light') {
    applyLightTheme(root, body);
  } else if (savedTheme === 'dark') {
    applyDarkTheme(root, body);
  } else {
    // Sistema - usa preferenza sistema e ascolta cambiamenti
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Applica tema iniziale
    if (prefersDark.matches) {
      applyDarkTheme(root, body);
    } else {
      applyLightTheme(root, body);
    }
    
    // Aggiungi listener per cambiamenti in tempo reale
    colorSchemeListener = prefersDark;
    colorSchemeListener.addEventListener('change', handleSystemThemeChange);
  }
}

/**
 * Applica tema chiaro
 */
function applyLightTheme(root, body) {
  root.style.setProperty('--bg-primary', '#ffffff');
  root.style.setProperty('--bg-secondary', '#f5f5f5');
  root.style.setProperty('--bg-tertiary', '#e5e5e5');
  root.style.setProperty('--text-primary', '#171717');
  root.style.setProperty('--text-secondary', '#525252');
  root.style.setProperty('--border-color', '#d4d4d4');
  body.setAttribute('data-theme', 'light');
}

/**
 * Applica tema scuro
 */
function applyDarkTheme(root, body) {
  root.style.setProperty('--bg-primary', '#171717');
  root.style.setProperty('--bg-secondary', '#1f1f1f');
  root.style.setProperty('--bg-tertiary', '#2a2a2a');
  root.style.setProperty('--text-primary', '#ffffff');
  root.style.setProperty('--text-secondary', '#a0a0a0');
  root.style.setProperty('--border-color', '#3a3a3a');
  body.setAttribute('data-theme', 'dark');
}

/**
 * Gestisce il cambio di tema di sistema
 */
function handleSystemThemeChange(event) {
  const savedTheme = localStorage.getItem('nebula-theme') || 'system';
  
  // Applica solo se il tema è impostato su "system"
  if (savedTheme === 'system') {
    const root = document.documentElement;
    const body = document.body;
    
    if (event.matches) {
      applyDarkTheme(root, body);
    } else {
      applyLightTheme(root, body);
    }
  }
}

/**
 * Inizializza il tema all'avvio
 */
export function initTheme() {
  applyTheme();
}

/**
 * Cambia il tema e salva la preferenza
 * @param {string} newTheme - 'light', 'dark', o 'system'
 */
export function setTheme(newTheme) {
  localStorage.setItem('nebula-theme', newTheme);
  applyTheme(newTheme);
}

/**
 * Ottiene il tema corrente
 * @returns {string} - 'light', 'dark', o 'system'
 */
export function getTheme() {
  return localStorage.getItem('nebula-theme') || 'system';
}

/**
 * Ottiene il tema effettivo applicato (considerando 'system')
 * @returns {string} - 'light' o 'dark'
 */
export function getEffectiveTheme() {
  const theme = getTheme();
  
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  return theme;
}

/**
 * Pulisce i listener quando non più necessari
 */
export function cleanupTheme() {
  if (colorSchemeListener) {
    colorSchemeListener.removeEventListener('change', handleSystemThemeChange);
    colorSchemeListener = null;
  }
}

