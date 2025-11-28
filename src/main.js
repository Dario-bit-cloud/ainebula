import './app.css';
import './styles/material-design-3.css';
import './styles/ios-ui.css';
import './styles/liquid-glass.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { isIOS } from './utils/platform.js';
import { 
  initDynamicViewport, 
  preventZoomOnInputFocus, 
  preventPullToRefresh,
  handleVirtualKeyboard 
} from './utils/mobile.js';

// Inizializza il tema PRIMA che l'app venga montata per evitare flash
function initTheme() {
  const savedTheme = localStorage.getItem('nebula-theme') || 'system';
  const root = document.documentElement;
  const body = document.body;
  
  // Applica tema colore
  if (savedTheme === 'light') {
    root.style.setProperty('--bg-primary', '#ffffff');
    root.style.setProperty('--bg-secondary', '#f5f5f5');
    root.style.setProperty('--bg-tertiary', '#e5e5e5');
    root.style.setProperty('--text-primary', '#171717');
    root.style.setProperty('--text-secondary', '#525252');
    root.style.setProperty('--border-color', '#d4d4d4');
    body.setAttribute('data-theme', 'light');
  } else if (savedTheme === 'dark') {
    root.style.setProperty('--bg-primary', '#171717');
    root.style.setProperty('--bg-secondary', '#1f1f1f');
    root.style.setProperty('--bg-tertiary', '#2a2a2a');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#a0a0a0');
    root.style.setProperty('--border-color', '#3a3a3a');
    body.setAttribute('data-theme', 'dark');
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
      body.setAttribute('data-theme', 'dark');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f5f5f5');
      root.style.setProperty('--bg-tertiary', '#e5e5e5');
      root.style.setProperty('--text-primary', '#171717');
      root.style.setProperty('--text-secondary', '#525252');
      root.style.setProperty('--border-color', '#d4d4d4');
      body.setAttribute('data-theme', 'light');
    }
  }
  
  // Applica stile UI (Material Design o Liquid Glass)
  const savedUIStyle = localStorage.getItem('nebula-ui-style') || 'material';
  if (savedUIStyle === 'liquid') {
    body.classList.add('liquid-glass');
  } else {
    body.classList.remove('liquid-glass');
  }
}

// Inizializza il tema immediatamente
initTheme();

// Ottimizzazioni mobile
if (typeof window !== 'undefined') {
  // Inizializza viewport dinamico per mobile
  initDynamicViewport();
  
  // Previeni zoom su input focus (iOS Safari)
  preventZoomOnInputFocus();
  
  // Previeni pull-to-refresh su mobile
  preventPullToRefresh();
  
  // Gestisci tastiera virtuale
  handleVirtualKeyboard();
  
  // Rileva iOS e applica classe
  const urlParams = new URLSearchParams(window.location.search);
  const forceIOS = urlParams.get('ios') === 'true' || localStorage.getItem('force-ios') === 'true';
  
  if (isIOS() || forceIOS) {
    document.documentElement.classList.add('ios-device');
  }
  
  // Aggiungi funzione globale per toggle (utile per debug)
  window.toggleIOS = function() {
    const isIOSActive = document.documentElement.classList.contains('ios-device');
    if (isIOSActive) {
      document.documentElement.classList.remove('ios-device');
      localStorage.removeItem('force-ios');
    } else {
      document.documentElement.classList.add('ios-device');
      localStorage.setItem('force-ios', 'true');
    }
    if (import.meta.env.DEV) {
      console.log('iOS UI:', !isIOSActive ? 'Attivata' : 'Disattivata');
    }
    // Ricarica per applicare tutti gli stili
    window.location.reload();
  };
}

const app = mount(App, {
  target: document.getElementById('app')
});

export default app;

