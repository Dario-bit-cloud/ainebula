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
import { initTheme } from './utils/theme.js';

// Inizializza il tema PRIMA che l'app venga montata per evitare flash
// Questo gestisce anche la sincronizzazione in tempo reale con le preferenze di sistema
initTheme();

// Applica stile UI (Material Design o Liquid Glass)
if (typeof window !== 'undefined') {
  const savedUIStyle = localStorage.getItem('nebula-ui-style') || 'material';
  if (savedUIStyle === 'liquid') {
    document.body.classList.add('liquid-glass');
  } else {
    document.body.classList.remove('liquid-glass');
  }
}

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

