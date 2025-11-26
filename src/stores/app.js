import { writable, readable } from 'svelte/store';
import { isIOS } from '../utils/platform.js';

// Store per lo stato generale dell'applicazione
export const sidebarView = writable('chat'); // 'chat', 'search', 'library', 'projects'
export const isSearchOpen = writable(false);
export const searchQuery = writable('');
export const isSettingsOpen = writable(false);
export const isProjectModalOpen = writable(false);
export const isInviteModalOpen = writable(false);
export const isUserMenuOpen = writable(false);
export const isSidebarOpen = writable(false);
export const isPremiumModalOpen = writable(false);
export const isAISettingsModalOpen = writable(false);
export const isPromptLibraryModalOpen = writable(false);
export const selectedPrompt = writable(null);
export const isShortcutsModalOpen = writable(false);
export const isReportBugModalOpen = writable(false);
export const isPersonalizationModalOpen = writable(false);
export const isAuthModalOpen = writable(false);
export const isSharedLinksModalOpen = writable(false);

// Stores per i dialoghi personalizzati
export const confirmDialogState = writable({
  isOpen: false,
  title: 'Conferma',
  message: '',
  confirmText: 'Conferma',
  cancelText: 'Annulla',
  type: 'default',
  resolve: null
});

export const alertDialogState = writable({
  isOpen: false,
  title: 'Avviso',
  message: '',
  buttonText: 'OK',
  type: 'info',
  resolve: null
});

export const promptDialogState = writable({
  isOpen: false,
  title: 'Input',
  message: '',
  defaultValue: '',
  placeholder: '',
  confirmText: 'Conferma',
  cancelText: 'Annulla',
  type: 'text',
  resolve: null
});

// Store per rilevare la dimensione dello schermo
function createMediaQuery(query) {
  if (typeof window === 'undefined') {
    return readable(false);
  }
  
  const mediaQuery = window.matchMedia(query);
  const { set, subscribe } = writable(mediaQuery.matches);
  
  // Imposta lo stato iniziale della sidebar in base alla dimensione dello schermo
  // Su mobile la sidebar è sempre chiusa di default, su desktop aperta
  if (mediaQuery.matches) {
    isSidebarOpen.set(false);
  } else {
    isSidebarOpen.set(true);
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

// Store per rilevare iOS
export const isIOSDevice = writable(false);

// Inizializza il rilevamento iOS
if (typeof window !== 'undefined') {
  isIOSDevice.set(isIOS());
  
  // Aggiungi classe al body per stili iOS
  if (isIOS()) {
    document.documentElement.classList.add('ios-device');
  }
}

