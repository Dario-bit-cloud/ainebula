import { writable } from 'svelte/store';

// Store per l'AbortController per fermare le richieste in corso
export const currentAbortController = writable(null);

export function setAbortController(controller) {
  currentAbortController.set(controller);
}

export function abortCurrentRequest() {
  currentAbortController.update(controller => {
    if (controller) {
      controller.abort();
    }
    return null;
  });
}

