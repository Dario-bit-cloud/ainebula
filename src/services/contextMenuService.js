import { writable } from 'svelte/store';

/**
 * Servizio per gestire il menu contestuale personalizzato
 * Sostituisce il menu contestuale del browser con uno personalizzato in Material Design 3
 */

const initialState = {
  visible: false,
  position: { x: 0, y: 0 },
  target: null
};

export const contextMenuState = writable(initialState);

/**
 * Mostra il menu contestuale alla posizione specificata
 * @param {number} x - Coordinata X
 * @param {number} y - Coordinata Y
 * @param {HTMLElement} target - Elemento target del click destro
 */
export function showContextMenu(x, y, target = null) {
  contextMenuState.set({
    visible: true,
    position: { x, y },
    target
  });
}

/**
 * Nasconde il menu contestuale
 */
export function closeContextMenu() {
  contextMenuState.set(initialState);
}

/**
 * Aggiorna la posizione del menu contestuale
 * @param {number} x - Coordinata X
 * @param {number} y - Coordinata Y
 */
export function updateContextMenuPosition(x, y) {
  contextMenuState.update(state => ({
    ...state,
    position: { x, y }
  }));
}

// Metodi di convenienza per il componente
export const contextMenu = {
  show: showContextMenu,
  close: closeContextMenu,
  updatePosition: updateContextMenuPosition
};

// Aggiungi metodi al store per compatibilità
contextMenuState.show = showContextMenu;
contextMenuState.close = closeContextMenu;
contextMenuState.updatePosition = updateContextMenuPosition;





