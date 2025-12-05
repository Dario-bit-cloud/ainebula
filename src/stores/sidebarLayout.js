import { writable, derived } from 'svelte/store';

// Configurazione delle sezioni della sidebar
export const defaultSections = [
  { id: 'new-chat', label: 'Nuova Chat', emoji: '✨', fixed: true, visible: true },
  { id: 'menu', label: 'Menu', emoji: '📋', fixed: false, visible: true },
  { id: 'recent-chats', label: 'Chat Recenti', emoji: '💬', fixed: false, visible: true }
];

// Configurazione degli item del menu
export const defaultMenuItems = [
  { id: 'search', labelKey: 'searchChats', label: 'Cerca', emoji: '🔍', visible: true },
  { id: 'history', labelKey: 'history', label: 'Cronologia', emoji: '📚', visible: true },
  { id: 'nebulini', labelKey: 'nebulini', label: 'Nebulini', emoji: '⚡', visible: true },
  { id: 'image-generator', labelKey: 'imageGenerator', label: 'Image Gen', emoji: '🎨', visible: true },
  { id: 'projects', labelKey: 'projects', label: 'Progetti', emoji: '📁', visible: true }
];

// Emoji disponibili per personalizzazione
export const availableEmojis = {
  search: ['🔍', '🔎', '👁️', '🎯', '💡', '⭐'],
  history: ['📚', '📖', '📜', '🗂️', '🕰️', '⏰'],
  nebulini: ['⚡', '🌟', '💫', '✨', '🎇', '🔮'],
  'image-generator': ['🎨', '🖼️', '🌈', '🎭', '🖌️', '📸'],
  projects: ['📁', '📂', '🗃️', '💼', '📊', '🏗️'],
  menu: ['📋', '📝', '📌', '🗒️', '📑', '🎪'],
  'recent-chats': ['💬', '💭', '🗨️', '📨', '💌', '🎈']
};

// Preimpostazioni layout
export const layoutPresets = {
  default: {
    name: 'Default',
    description: 'Layout standard con tutte le funzionalità',
    icon: '🏠',
    sections: defaultSections,
    menuItems: defaultMenuItems
  },
  compact: {
    name: 'Compatto',
    description: 'Solo le funzionalità essenziali',
    icon: '📦',
    sections: [
      { id: 'new-chat', label: 'Nuova Chat', emoji: '✨', fixed: true, visible: true },
      { id: 'menu', label: 'Menu', emoji: '📋', fixed: false, visible: true },
      { id: 'recent-chats', label: 'Chat Recenti', emoji: '💬', fixed: false, visible: true }
    ],
    menuItems: [
      { id: 'search', labelKey: 'searchChats', label: 'Cerca', emoji: '🔍', visible: true },
      { id: 'history', labelKey: 'history', label: 'Cronologia', emoji: '📚', visible: false },
      { id: 'nebulini', labelKey: 'nebulini', label: 'Nebulini', emoji: '⚡', visible: false },
      { id: 'image-generator', labelKey: 'imageGenerator', label: 'Image Gen', emoji: '🎨', visible: false },
      { id: 'projects', labelKey: 'projects', label: 'Progetti', emoji: '📁', visible: true }
    ]
  },
  creative: {
    name: 'Creativo',
    description: 'Focus su strumenti creativi e generazione',
    icon: '🎨',
    sections: [
      { id: 'new-chat', label: 'Nuova Chat', emoji: '✨', fixed: true, visible: true },
      { id: 'menu', label: 'Menu', emoji: '🎪', fixed: false, visible: true },
      { id: 'recent-chats', label: 'Chat Recenti', emoji: '💭', fixed: false, visible: true }
    ],
    menuItems: [
      { id: 'image-generator', labelKey: 'imageGenerator', label: 'Image Gen', emoji: '🎨', visible: true },
      { id: 'nebulini', labelKey: 'nebulini', label: 'Nebulini', emoji: '🌟', visible: true },
      { id: 'projects', labelKey: 'projects', label: 'Progetti', emoji: '🏗️', visible: true },
      { id: 'search', labelKey: 'searchChats', label: 'Cerca', emoji: '🔎', visible: true },
      { id: 'history', labelKey: 'history', label: 'Cronologia', emoji: '📜', visible: false }
    ]
  },
  productive: {
    name: 'Produttivo',
    description: 'Ottimizzato per lavoro e progetti',
    icon: '💼',
    sections: [
      { id: 'new-chat', label: 'Nuova Chat', emoji: '✨', fixed: true, visible: true },
      { id: 'menu', label: 'Menu', emoji: '📌', fixed: false, visible: true },
      { id: 'recent-chats', label: 'Chat Recenti', emoji: '📨', fixed: false, visible: true }
    ],
    menuItems: [
      { id: 'projects', labelKey: 'projects', label: 'Progetti', emoji: '💼', visible: true },
      { id: 'history', labelKey: 'history', label: 'Cronologia', emoji: '🗂️', visible: true },
      { id: 'search', labelKey: 'searchChats', label: 'Cerca', emoji: '🎯', visible: true },
      { id: 'nebulini', labelKey: 'nebulini', label: 'Nebulini', emoji: '🔮', visible: false },
      { id: 'image-generator', labelKey: 'imageGenerator', label: 'Image Gen', emoji: '🖼️', visible: false }
    ]
  }
};

// Carica configurazione da localStorage
function loadSidebarConfig() {
  if (typeof window === 'undefined') {
    return { sections: defaultSections, menuItems: defaultMenuItems };
  }
  
  try {
    const saved = localStorage.getItem('nebula-sidebar-config');
    if (saved) {
      const config = JSON.parse(saved);
      // Merge con default per gestire nuovi item
      const sections = mergeWithDefaults(config.sections, defaultSections, 'id');
      const menuItems = mergeWithDefaults(config.menuItems, defaultMenuItems, 'id');
      return { sections, menuItems };
    }
  } catch (e) {
    console.warn('Errore caricamento config sidebar:', e);
  }
  
  return { sections: defaultSections, menuItems: defaultMenuItems };
}

// Merge configurazione salvata con default
function mergeWithDefaults(saved, defaults, key) {
  if (!saved || !Array.isArray(saved)) return defaults;
  
  // Crea mappa degli item salvati
  const savedMap = new Map(saved.map(item => [item[key], item]));
  
  // Mantieni ordine salvato, aggiungi nuovi item alla fine
  const result = [];
  const usedIds = new Set();
  
  // Prima aggiungi gli item nell'ordine salvato
  for (const item of saved) {
    const defaultItem = defaults.find(d => d[key] === item[key]);
    if (defaultItem) {
      result.push({ ...defaultItem, ...item });
      usedIds.add(item[key]);
    }
  }
  
  // Poi aggiungi nuovi item dai default
  for (const item of defaults) {
    if (!usedIds.has(item[key])) {
      result.push(item);
    }
  }
  
  return result;
}

// Salva configurazione su localStorage
function saveSidebarConfig(config) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('nebula-sidebar-config', JSON.stringify(config));
  } catch (e) {
    console.warn('Errore salvataggio config sidebar:', e);
  }
}

// Crea store per le sezioni
function createSidebarLayoutStore() {
  const initialConfig = loadSidebarConfig();
  const { subscribe, set, update } = writable(initialConfig);
  
  return {
    subscribe,
    
    // Riordina sezioni
    reorderSections: (fromIndex, toIndex) => {
      update(config => {
        const sections = [...config.sections];
        const [moved] = sections.splice(fromIndex, 1);
        sections.splice(toIndex, 0, moved);
        const newConfig = { ...config, sections };
        saveSidebarConfig(newConfig);
        return newConfig;
      });
    },
    
    // Riordina item menu
    reorderMenuItems: (fromIndex, toIndex) => {
      update(config => {
        const menuItems = [...config.menuItems];
        const [moved] = menuItems.splice(fromIndex, 1);
        menuItems.splice(toIndex, 0, moved);
        const newConfig = { ...config, menuItems };
        saveSidebarConfig(newConfig);
        return newConfig;
      });
    },
    
    // Toggle visibilità sezione
    toggleSectionVisibility: (sectionId) => {
      update(config => {
        const sections = config.sections.map(s => 
          s.id === sectionId ? { ...s, visible: !s.visible } : s
        );
        const newConfig = { ...config, sections };
        saveSidebarConfig(newConfig);
        return newConfig;
      });
    },
    
    // Toggle visibilità item menu
    toggleMenuItemVisibility: (itemId) => {
      update(config => {
        const menuItems = config.menuItems.map(item => 
          item.id === itemId ? { ...item, visible: !item.visible } : item
        );
        const newConfig = { ...config, menuItems };
        saveSidebarConfig(newConfig);
        return newConfig;
      });
    },
    
    // Cambia emoji di un item
    setItemEmoji: (itemId, emoji) => {
      update(config => {
        const menuItems = config.menuItems.map(item => 
          item.id === itemId ? { ...item, emoji } : item
        );
        const newConfig = { ...config, menuItems };
        saveSidebarConfig(newConfig);
        return newConfig;
      });
    },
    
    // Cambia emoji di una sezione
    setSectionEmoji: (sectionId, emoji) => {
      update(config => {
        const sections = config.sections.map(s => 
          s.id === sectionId ? { ...s, emoji } : s
        );
        const newConfig = { ...config, sections };
        saveSidebarConfig(newConfig);
        return newConfig;
      });
    },
    
    // Applica preset
    applyPreset: (presetKey) => {
      const preset = layoutPresets[presetKey];
      if (!preset) return;
      
      const newConfig = {
        sections: JSON.parse(JSON.stringify(preset.sections)),
        menuItems: JSON.parse(JSON.stringify(preset.menuItems)),
        currentPreset: presetKey
      };
      saveSidebarConfig(newConfig);
      set(newConfig);
    },
    
    // Imposta tutti gli item visibili/nascosti
    setAllItemsVisibility: (visible) => {
      update(config => {
        const menuItems = config.menuItems.map(item => ({ ...item, visible }));
        const newConfig = { ...config, menuItems };
        saveSidebarConfig(newConfig);
        return newConfig;
      });
    },
    
    // Esporta configurazione
    exportConfig: () => {
      let currentConfig;
      const unsubscribe = subscribe(config => { currentConfig = config; });
      unsubscribe();
      return JSON.stringify(currentConfig, null, 2);
    },
    
    // Importa configurazione
    importConfig: (jsonString) => {
      try {
        const imported = JSON.parse(jsonString);
        if (imported.sections && imported.menuItems) {
          const sections = mergeWithDefaults(imported.sections, defaultSections, 'id');
          const menuItems = mergeWithDefaults(imported.menuItems, defaultMenuItems, 'id');
          const newConfig = { sections, menuItems };
          saveSidebarConfig(newConfig);
          set(newConfig);
          return { success: true };
        }
        return { success: false, error: 'Formato non valido' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
    
    // Reset a default
    reset: () => {
      const defaultConfig = { sections: defaultSections, menuItems: defaultMenuItems };
      saveSidebarConfig(defaultConfig);
      set(defaultConfig);
    }
  };
}

export const sidebarLayout = createSidebarLayoutStore();

// Store per modalità editing
export const isEditingSidebar = writable(false);

// Store per pannello customizer
export const isCustomizerOpen = writable(false);

// Store derivato per contare item nascosti
export const hiddenItemsCount = derived(sidebarLayout, $layout => {
  const hiddenMenuItems = $layout.menuItems.filter(item => !item.visible).length;
  const hiddenSections = $layout.sections.filter(s => !s.visible && !s.fixed).length;
  return hiddenMenuItems + hiddenSections;
});

