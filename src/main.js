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
import { showContextMenu } from './services/contextMenuService.js';

// Inizializza il tema PRIMA che l'app venga montata per evitare flash
// Questo gestisce anche la sincronizzazione in tempo reale con le preferenze di sistema
initTheme();

// Applica stile UI (Material Design o Liquid Glass)
// Nota: Liquid Glass non è disponibile su iOS
if (typeof window !== 'undefined') {
  const savedUIStyle = localStorage.getItem('nebula-ui-style') || 'material';
  // Non applicare liquid glass su iOS
  if (savedUIStyle === 'liquid' && !isIOS()) {
    document.body.classList.add('liquid-glass');
  } else {
    document.body.classList.remove('liquid-glass');
    // Se era salvato liquid glass ma siamo su iOS, salva material
    if (savedUIStyle === 'liquid' && isIOS()) {
      localStorage.setItem('nebula-ui-style', 'material');
    }
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
  
  // Gestione menu contestuale per desktop e mobile
  let longPressTimer = null;
  let longPressTarget = null;
  let touchStartPosition = null;
  const LONG_PRESS_DURATION = 500; // 500ms per long press
  const MAX_MOVE_DISTANCE = 10; // Massimo movimento consentito durante long press (in px)

  // Gestisce il menu contestuale del browser (desktop)
  function handleContextMenu(event) {
    const target = event.target;
    
    // Escludi alcuni elementi dal menu contestuale personalizzato
    if (
      (target.tagName === 'INPUT' && target.type === 'password') ||
      target.closest('[data-no-context-menu]') ||
      target.closest('iframe')
    ) {
      return; // Lascia che il browser gestisca il menu contestuale
    }
    
    // Permetti il menu del browser se si tiene premuto Shift (utile per dev mode)
    if (event.shiftKey) {
      return; // Lascia che il browser gestisca il menu contestuale
    }
    
    // Previeni il menu contestuale del browser
    event.preventDefault();
    event.stopPropagation();
    
    // Mostra il menu contestuale personalizzato
    showContextMenu(event.clientX, event.clientY, target);
  }

  // Gestisce il long press su mobile
  function handleTouchStart(event) {
    const target = event.target;
    
    // Escludi alcuni elementi
    if (
      (target.tagName === 'INPUT' && target.type === 'password') ||
      target.closest('[data-no-context-menu]') ||
      target.closest('iframe')
    ) {
      return;
    }

    const touch = event.touches[0];
    touchStartPosition = { x: touch.clientX, y: touch.clientY };
    longPressTarget = target;

    // Avvia il timer per il long press
    longPressTimer = setTimeout(() => {
      // Verifica che il touch sia ancora attivo e nella stessa posizione
      if (longPressTarget && touchStartPosition) {
        // Previeni il menu contestuale del browser
        event.preventDefault();
        
        // Mostra il menu contestuale personalizzato
        showContextMenu(touchStartPosition.x, touchStartPosition.y, longPressTarget);
        
        // Aggiungi feedback visivo (vibrazione se supportata)
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, LONG_PRESS_DURATION);
  }

  function handleTouchMove(event) {
    // Se l'utente muove il dito troppo, annulla il long press
    if (touchStartPosition && longPressTimer) {
      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPosition.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosition.y);
      
      if (deltaX > MAX_MOVE_DISTANCE || deltaY > MAX_MOVE_DISTANCE) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        longPressTarget = null;
        touchStartPosition = null;
      }
    }
  }

  function handleTouchEnd(event) {
    // Annulla il long press se l'utente rilascia prima del tempo
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    longPressTarget = null;
    touchStartPosition = null;
  }

  // Aggiungi listener per desktop
  document.addEventListener('contextmenu', handleContextMenu, { capture: true, passive: false });
  
  // Aggiungi listener per mobile (long press)
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchcancel', handleTouchEnd, { passive: true });
}

// Funzione per inizializzare tutti gli store prima del mount
async function initializeStores() {
  // Importa e inizializza tutti gli store principali
  // Questo forza l'inizializzazione degli store prima che i componenti li usino
  try {
    await Promise.all([
      import('./stores/app.js'),
      import('./stores/auth.js'),
      import('./stores/chat.js'),
      import('./stores/user.js'),
      import('./stores/models.js'),
      import('./stores/payment.js'),
      import('./stores/thinkingMode.js'),
      import('./stores/abortController.js'),
      import('./stores/devMode.js'),
      import('./stores/tokenInfo.js'),
      import('./stores/language.js'),
      import('./stores/sidebarLayout.js'),
      import('./stores/projects.js'),
      import('./stores/accounts.js')
    ]);
    
    // Aspetta un tick per assicurarsi che tutti gli store siano completamente inizializzati
    await new Promise(resolve => setTimeout(resolve, 0));
    
    return true;
  } catch (error) {
    console.error('❌ [MAIN] Errore durante inizializzazione store:', error);
    return false;
  }
}

// Assicurati che il DOM sia pronto prima di montare l'app
let appInstance = null;

async function initApp() {
  const appElement = document.getElementById('app');
  
  if (!appElement) {
    console.error('❌ [MAIN] Elemento #app non trovato nel DOM');
    // Riprova dopo un breve delay
    setTimeout(initApp, 100);
    return;
  }
  
  try {
    // STEP 1: Inizializza tutti gli store PRIMA del mount
    console.log('🔧 [MAIN] Inizializzazione store...');
    const storesInitialized = await initializeStores();
    
    if (!storesInitialized) {
      throw new Error('Impossibile inizializzare gli store');
    }
    
    console.log('✅ [MAIN] Store inizializzati');
    
    // STEP 2: Aspetta che il DOM sia completamente pronto
    // Usa un doppio requestAnimationFrame per assicurarsi che tutto sia inizializzato
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    }));
    
    // STEP 3: Monta l'app solo quando tutto è pronto
    console.log('🚀 [MAIN] Montaggio app...');
    appInstance = mount(App, {
      target: appElement
    });
    
    console.log('✅ [MAIN] App montata con successo');
  } catch (error) {
    console.error('❌ [MAIN] Errore durante il mount dell\'app:', error);
    console.error('Stack trace:', error.stack);
    // Mostra un messaggio di errore all'utente
    appElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; padding: 20px; text-align: center;">
        <h1 style="color: #ff4444; margin-bottom: 20px;">Errore di caricamento</h1>
        <p style="color: #888; margin-bottom: 20px;">Si è verificato un errore durante il caricamento dell'applicazione.</p>
        <p style="color: #666; font-size: 12px; margin-bottom: 20px;">${error.message}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Ricarica pagina
        </button>
      </div>
    `;
  }
}

// Inizializza l'app quando il DOM è pronto
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    // DOM già pronto, aspetta comunque un frame per assicurarsi che tutto sia inizializzato
    requestAnimationFrame(initApp);
  }
}

// Export una funzione getter invece di esportare direttamente null
// Questo risolve il problema del Bug 2: appInstance viene popolato asincronamente
export default function getAppInstance() {
  return appInstance;
}

// Export anche come valore per retrocompatibilità (ma sarà null inizialmente)
export { appInstance };
