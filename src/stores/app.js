import { writable, readable } from 'svelte/store';

// Store per lo stato generale dell'applicazione
export const sidebarView = writable('chat'); // 'chat', 'search', 'library', 'projects'
export const isSearchOpen = writable(false);
export const searchQuery = writable('');
export const isSettingsOpen = writable(false);
export const isProjectModalOpen = writable(false);
export const isInviteModalOpen = writable(false);
export const isUserMenuOpen = writable(false);
export const isSidebarOpen = writable(true);

// Store per rilevare la dimensione dello schermo
function createMediaQuery(query) {
  if (typeof window === 'undefined') {
    return readable(false);
  }
  
  const mediaQuery = window.matchMedia(query);
  const { set, subscribe } = writable(mediaQuery.matches);
  
  // Imposta lo stato iniziale della sidebar in base alla dimensione dello schermo
  if (mediaQuery.matches) {
    isSidebarOpen.set(false);
  }
  
  const handler = (e) => {
    set(e.matches);
    // Su mobile, chiudi la sidebar quando si passa da desktop a mobile
    if (e.matches) {
      isSidebarOpen.set(false);
    } else {
      isSidebarOpen.set(true);
    }
  };
  
  mediaQuery.addEventListener('change', handler);
  
  return {
    subscribe,
    destroy: () => mediaQuery.removeEventListener('change', handler)
  };
}

export const isMobile = createMediaQuery('(max-width: 768px)');

