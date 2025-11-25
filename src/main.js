import './app.css';
import App from './App.svelte';

// Inizializza il tema PRIMA che l'app venga montata per evitare flash
function initTheme() {
  const savedTheme = localStorage.getItem('nebula-theme') || 'system';
  const root = document.documentElement;
  if (savedTheme === 'light') {
    root.style.setProperty('--bg-primary', '#ffffff');
    root.style.setProperty('--bg-secondary', '#f5f5f5');
    root.style.setProperty('--bg-tertiary', '#e5e5e5');
    root.style.setProperty('--text-primary', '#171717');
    root.style.setProperty('--text-secondary', '#525252');
    root.style.setProperty('--border-color', '#d4d4d4');
  } else if (savedTheme === 'dark') {
    root.style.setProperty('--bg-primary', '#171717');
    root.style.setProperty('--bg-secondary', '#1f1f1f');
    root.style.setProperty('--bg-tertiary', '#2a2a2a');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#a0a0a0');
    root.style.setProperty('--border-color', '#3a3a3a');
  } else {
    // Sistema - usa preferenza sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.style.setProperty('--bg-primary', '#171717');
      root.style.setProperty('--bg-secondary', '#1f1f1f');
      root.style.setProperty('--bg-tertiary', '#2a2a2a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#a0a0a0');
      root.style.setProperty('--border-color', '#3a3a3a');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f5f5f5');
      root.style.setProperty('--bg-tertiary', '#e5e5e5');
      root.style.setProperty('--text-primary', '#171717');
      root.style.setProperty('--text-secondary', '#525252');
      root.style.setProperty('--border-color', '#d4d4d4');
    }
  }
}

// Inizializza il tema immediatamente
initTheme();

const app = new App({
  target: document.getElementById('app')
});

export default app;

