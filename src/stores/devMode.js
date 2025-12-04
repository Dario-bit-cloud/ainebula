import { writable } from 'svelte/store';

// Store per gestire lo stato del dev mode
export const devMode = writable(false);

/**
 * Attiva il dev mode
 */
export function enableDevMode() {
  devMode.set(true);
  console.log('%c🔧 Dev Mode attivato!', 'color: #00ff00; font-size: 16px; font-weight: bold;');
  console.log('%cFunzionalità sviluppatore ora disponibili', 'color: #00ff00;');
}

/**
 * Disattiva il dev mode
 */
export function disableDevMode() {
  devMode.set(false);
  console.log('%c🔧 Dev Mode disattivato', 'color: #ff9900; font-size: 14px;');
}

/**
 * Toggle del dev mode
 */
export function toggleDevMode() {
  devMode.update(enabled => {
    if (enabled) {
      disableDevMode();
      return false;
    } else {
      enableDevMode();
      return true;
    }
  });
}


