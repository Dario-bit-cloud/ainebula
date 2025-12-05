<script>
  import { sidebarLayout, isCustomizerOpen, availableEmojis, layoutPresets, defaultMenuItems, defaultSections } from '../stores/sidebarLayout.js';
  import { t } from '../stores/language.js';
  import { isMobile } from '../stores/app.js';
  import { fly, fade } from 'svelte/transition';
  import { quintOut, elasticOut } from 'svelte/easing';
  import { flip } from 'svelte/animate';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let activeTab = 'layout'; // 'layout', 'items', 'presets'
  let selectedItemForEmoji = null;
  let showImportExport = false;
  let importText = '';
  let importError = '';
  let draggedItemIndex = null;
  let dragOverItemIndex = null;
  let previewMode = false;
  let customizerElement;
  
  // Chiudi quando si clicca fuori
  function handleClickOutside(event) {
    if (customizerElement && !customizerElement.contains(event.target)) {
      close();
    }
  }
  
  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
  });
  
  onDestroy(() => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('touchstart', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  });
  
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      if (selectedItemForEmoji) {
        selectedItemForEmoji = null;
      } else if (showImportExport) {
        showImportExport = false;
      } else {
        close();
      }
    }
  }
  
  function close() {
    isCustomizerOpen.set(false);
    dispatch('close');
  }
  
  // Drag and drop per riordinare
  function handleDragStart(event, index) {
    draggedItemIndex = index;
    event.dataTransfer.effectAllowed = 'move';
  }
  
  function handleDragOver(event, index) {
    if (draggedItemIndex === null) return;
    event.preventDefault();
    dragOverItemIndex = index;
  }
  
  function handleDrop(event, index) {
    event.preventDefault();
    if (draggedItemIndex !== null && draggedItemIndex !== index) {
      sidebarLayout.reorderMenuItems(draggedItemIndex, index);
    }
    draggedItemIndex = null;
    dragOverItemIndex = null;
  }
  
  function handleDragEnd() {
    draggedItemIndex = null;
    dragOverItemIndex = null;
  }
  
  // Emoji picker
  function selectEmoji(itemId, emoji) {
    sidebarLayout.setItemEmoji(itemId, emoji);
    selectedItemForEmoji = null;
  }
  
  // Presets
  function applyPreset(presetKey) {
    sidebarLayout.applyPreset(presetKey);
  }
  
  // Import/Export
  function exportConfig() {
    const config = sidebarLayout.exportConfig();
    navigator.clipboard.writeText(config).then(() => {
      alert('Configurazione copiata negli appunti!');
    }).catch(() => {
      // Fallback: mostra in textarea
      importText = config;
      showImportExport = true;
    });
  }
  
  function importConfig() {
    const result = sidebarLayout.importConfig(importText);
    if (result.success) {
      showImportExport = false;
      importText = '';
      importError = '';
    } else {
      importError = result.error;
    }
  }
  
  function downloadConfig() {
    const config = sidebarLayout.exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nebula-sidebar-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        importText = e.target.result;
        importConfig();
      };
      reader.readAsText(file);
    }
  }
  
  // Reset
  function resetToDefault() {
    if (confirm('Sei sicuro di voler ripristinare le impostazioni predefinite?')) {
      sidebarLayout.reset();
    }
  }
</script>

{#if $isCustomizerOpen}
  {#if $isMobile}
    <!-- Mobile: popup modale centrato -->
    <div class="customizer-overlay mobile" transition:fade={{ duration: 200 }}>
      <div 
        class="customizer-panel mobile"
        bind:this={customizerElement}
        transition:fly={{ y: 50, duration: 300, easing: elasticOut }}
      >
      <!-- Header -->
      <div class="customizer-header">
        <div class="header-title">
          <span class="header-icon">🎨</span>
          <h2>Personalizza Sidebar</h2>
        </div>
        <button class="close-btn" on:click={close}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <!-- Tabs -->
      <div class="tabs">
        <button 
          class="tab" 
          class:active={activeTab === 'presets'}
          on:click={() => activeTab = 'presets'}
        >
          <span class="tab-icon">🎯</span>
          <span class="tab-label">Preset</span>
        </button>
        <button 
          class="tab" 
          class:active={activeTab === 'items'}
          on:click={() => activeTab = 'items'}
        >
          <span class="tab-icon">📋</span>
          <span class="tab-label">Menu</span>
        </button>
        <button 
          class="tab" 
          class:active={activeTab === 'layout'}
          on:click={() => activeTab = 'layout'}
        >
          <span class="tab-icon">⚙️</span>
          <span class="tab-label">Altro</span>
        </button>
      </div>
      
      <!-- Content -->
      <div class="customizer-content">
        <!-- Tab Presets -->
        {#if activeTab === 'presets'}
          <div class="tab-content" transition:fade={{ duration: 150 }}>
            <p class="section-description">Scegli un layout predefinito per iniziare rapidamente</p>
            
            <div class="presets-grid">
              {#each Object.entries(layoutPresets) as [key, preset], i}
                <button 
                  class="preset-card"
                  class:current={$sidebarLayout.currentPreset === key}
                  on:click={() => applyPreset(key)}
                  style="animation-delay: {i * 50}ms"
                >
                  <span class="preset-icon">{preset.icon}</span>
                  <span class="preset-name">{preset.name}</span>
                  <span class="preset-description">{preset.description}</span>
                  {#if $sidebarLayout.currentPreset === key}
                    <span class="current-badge">Attivo</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Tab Items -->
        {#if activeTab === 'items'}
          <div class="tab-content" transition:fade={{ duration: 150 }}>
            <p class="section-description">Riordina e personalizza gli elementi del menu</p>
            
            <div class="items-list">
              {#each $sidebarLayout.menuItems as item, index (item.id)}
                <div 
                  class="item-row"
                  class:dragging={draggedItemIndex === index}
                  class:drag-over={dragOverItemIndex === index}
                  class:hidden-item={!item.visible}
                  draggable="true"
                  on:dragstart={(e) => handleDragStart(e, index)}
                  on:dragover={(e) => handleDragOver(e, index)}
                  on:drop={(e) => handleDrop(e, index)}
                  on:dragend={handleDragEnd}
                  animate:flip={{ duration: 200 }}
                >
                  <div class="drag-handle">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="9" cy="5" r="1.5"/>
                      <circle cx="15" cy="5" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/>
                      <circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="19" r="1.5"/>
                      <circle cx="15" cy="19" r="1.5"/>
                    </svg>
                  </div>
                  
                  <button 
                    class="emoji-button"
                    on:click={() => selectedItemForEmoji = selectedItemForEmoji === item.id ? null : item.id}
                    title="Cambia emoji"
                  >
                    {item.emoji}
                  </button>
                  
                  <!-- Emoji Picker Dropdown -->
                  {#if selectedItemForEmoji === item.id}
                    <div class="emoji-picker" transition:scale={{ duration: 150, easing: elasticOut }}>
                      {#each availableEmojis[item.id] || [] as emoji}
                        <button 
                          class="emoji-option"
                          class:selected={item.emoji === emoji}
                          on:click|stopPropagation={() => selectEmoji(item.id, emoji)}
                        >
                          {emoji}
                        </button>
                      {/each}
                    </div>
                  {/if}
                  
                  <span class="item-label">{$t(item.labelKey) || item.label}</span>
                  
                  <button 
                    class="visibility-toggle"
                    class:hidden={!item.visible}
                    on:click={() => sidebarLayout.toggleMenuItemVisibility(item.id)}
                    title={item.visible ? 'Nascondi' : 'Mostra'}
                  >
                    {#if item.visible}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    {:else}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    {/if}
                  </button>
                </div>
              {/each}
            </div>
            
            <div class="quick-actions">
              <button class="action-btn" on:click={() => sidebarLayout.setAllItemsVisibility(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Mostra tutti
              </button>
              <button class="action-btn" on:click={() => sidebarLayout.setAllItemsVisibility(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                Nascondi tutti
              </button>
            </div>
          </div>
        {/if}
        
        <!-- Tab Layout/Altro -->
        {#if activeTab === 'layout'}
          <div class="tab-content" transition:fade={{ duration: 150 }}>
            <div class="settings-section">
              <h3 class="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Esporta / Importa
              </h3>
              <p class="section-description">Salva o carica la tua configurazione</p>
              
              <div class="export-actions">
                <button class="export-btn" on:click={exportConfig}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copia config
                </button>
                <button class="export-btn" on:click={downloadConfig}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Scarica file
                </button>
                <label class="export-btn import-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Carica file
                  <input type="file" accept=".json" on:change={handleFileUpload} hidden />
                </label>
              </div>
              
              <button 
                class="toggle-import-btn"
                on:click={() => showImportExport = !showImportExport}
              >
                {showImportExport ? 'Chiudi' : 'Importa da testo'}
              </button>
              
              {#if showImportExport}
                <div class="import-section" transition:fly={{ y: -10, duration: 200 }}>
                  <textarea 
                    bind:value={importText}
                    placeholder="Incolla qui la configurazione JSON..."
                    class:error={importError}
                  ></textarea>
                  {#if importError}
                    <p class="error-message">{importError}</p>
                  {/if}
                  <button class="import-btn" on:click={importConfig} disabled={!importText}>
                    Importa configurazione
                  </button>
                </div>
              {/if}
            </div>
            
            <div class="settings-section danger-zone">
              <h3 class="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Ripristina
              </h3>
              <p class="section-description">Riporta la sidebar alle impostazioni di fabbrica</p>
              <button class="reset-btn" on:click={resetToDefault}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                Ripristina Default
              </button>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Footer -->
      <div class="customizer-footer">
        <span class="footer-hint">💡 Le modifiche vengono salvate automaticamente</span>
      </div>
      </div>
    </div>
  {:else}
    <!-- Desktop: pannello laterale -->
    <div class="customizer-overlay" transition:fade={{ duration: 200 }}>
      <div 
        class="customizer-panel"
        bind:this={customizerElement}
        transition:fly={{ x: -300, duration: 400, easing: quintOut }}
      >
      <!-- Header -->
      <div class="customizer-header">
        <div class="header-title">
          <span class="header-icon">🎨</span>
          <h2>Personalizza Sidebar</h2>
        </div>
        <button class="close-btn" on:click={close}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <!-- Tabs -->
      <div class="tabs">
        <button 
          class="tab" 
          class:active={activeTab === 'presets'}
          on:click={() => activeTab = 'presets'}
        >
          <span class="tab-icon">🎯</span>
          <span class="tab-label">Preset</span>
        </button>
        <button 
          class="tab" 
          class:active={activeTab === 'items'}
          on:click={() => activeTab = 'items'}
        >
          <span class="tab-icon">📋</span>
          <span class="tab-label">Menu</span>
        </button>
        <button 
          class="tab" 
          class:active={activeTab === 'layout'}
          on:click={() => activeTab = 'layout'}
        >
          <span class="tab-icon">⚙️</span>
          <span class="tab-label">Altro</span>
        </button>
      </div>
      
      <!-- Content -->
      <div class="customizer-content">
        <!-- Tab Presets -->
        {#if activeTab === 'presets'}
          <div class="tab-content" transition:fade={{ duration: 150 }}>
            <p class="section-description">Scegli un layout predefinito per iniziare rapidamente</p>
            
            <div class="presets-grid">
              {#each Object.entries(layoutPresets) as [key, preset], i}
                <button 
                  class="preset-card"
                  class:current={$sidebarLayout.currentPreset === key}
                  on:click={() => applyPreset(key)}
                  style="animation-delay: {i * 50}ms"
                >
                  <span class="preset-icon">{preset.icon}</span>
                  <span class="preset-name">{preset.name}</span>
                  <span class="preset-description">{preset.description}</span>
                  {#if $sidebarLayout.currentPreset === key}
                    <span class="current-badge">Attivo</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Tab Items -->
        {#if activeTab === 'items'}
          <div class="tab-content" transition:fade={{ duration: 150 }}>
            <p class="section-description">Riordina e personalizza gli elementi del menu</p>
            
            <div class="items-list">
              {#each $sidebarLayout.menuItems as item, index (item.id)}
                <div 
                  class="item-row"
                  class:dragging={draggedItemIndex === index}
                  class:drag-over={dragOverItemIndex === index}
                  class:hidden-item={!item.visible}
                  draggable="true"
                  on:dragstart={(e) => handleDragStart(e, index)}
                  on:dragover={(e) => handleDragOver(e, index)}
                  on:drop={(e) => handleDrop(e, index)}
                  on:dragend={handleDragEnd}
                  animate:flip={{ duration: 200 }}
                >
                  <div class="drag-handle">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="9" cy="5" r="1.5"/>
                      <circle cx="15" cy="5" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/>
                      <circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="19" r="1.5"/>
                      <circle cx="15" cy="19" r="1.5"/>
                    </svg>
                  </div>
                  
                  <button 
                    class="emoji-button"
                    on:click={() => selectedItemForEmoji = selectedItemForEmoji === item.id ? null : item.id}
                    title="Cambia emoji"
                  >
                    {item.emoji}
                  </button>
                  
                  <!-- Emoji Picker Dropdown -->
                  {#if selectedItemForEmoji === item.id}
                    <div class="emoji-picker" transition:scale={{ duration: 150, easing: elasticOut }}>
                      {#each availableEmojis[item.id] || [] as emoji}
                        <button 
                          class="emoji-option"
                          class:selected={item.emoji === emoji}
                          on:click|stopPropagation={() => selectEmoji(item.id, emoji)}
                        >
                          {emoji}
                        </button>
                      {/each}
                    </div>
                  {/if}
                  
                  <span class="item-label">{$t(item.labelKey) || item.label}</span>
                  
                  <button 
                    class="visibility-toggle"
                    class:hidden={!item.visible}
                    on:click={() => sidebarLayout.toggleMenuItemVisibility(item.id)}
                    title={item.visible ? 'Nascondi' : 'Mostra'}
                  >
                    {#if item.visible}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    {:else}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    {/if}
                  </button>
                </div>
              {/each}
            </div>
            
            <div class="quick-actions">
              <button class="action-btn" on:click={() => sidebarLayout.setAllItemsVisibility(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Mostra tutti
              </button>
              <button class="action-btn" on:click={() => sidebarLayout.setAllItemsVisibility(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                Nascondi tutti
              </button>
            </div>
          </div>
        {/if}
        
        <!-- Tab Layout/Altro -->
        {#if activeTab === 'layout'}
          <div class="tab-content" transition:fade={{ duration: 150 }}>
            <div class="settings-section">
              <h3 class="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Esporta / Importa
              </h3>
              <p class="section-description">Salva o carica la tua configurazione</p>
              
              <div class="export-actions">
                <button class="export-btn" on:click={exportConfig}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copia config
                </button>
                <button class="export-btn" on:click={downloadConfig}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Scarica file
                </button>
                <label class="export-btn import-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Carica file
                  <input type="file" accept=".json" on:change={handleFileUpload} hidden />
                </label>
              </div>
              
              <button 
                class="toggle-import-btn"
                on:click={() => showImportExport = !showImportExport}
              >
                {showImportExport ? 'Chiudi' : 'Importa da testo'}
              </button>
              
              {#if showImportExport}
                <div class="import-section" transition:fly={{ y: -10, duration: 200 }}>
                  <textarea 
                    bind:value={importText}
                    placeholder="Incolla qui la configurazione JSON..."
                    class:error={importError}
                  ></textarea>
                  {#if importError}
                    <p class="error-message">{importError}</p>
                  {/if}
                  <button class="import-btn" on:click={importConfig} disabled={!importText}>
                    Importa configurazione
                  </button>
                </div>
              {/if}
            </div>
            
            <div class="settings-section danger-zone">
              <h3 class="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Ripristina
              </h3>
              <p class="section-description">Riporta la sidebar alle impostazioni di fabbrica</p>
              <button class="reset-btn" on:click={resetToDefault}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                Ripristina Default
              </button>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Footer -->
      <div class="customizer-footer">
        <span class="footer-hint">💡 Le modifiche vengono salvate automaticamente</span>
      </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .customizer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: stretch;
    justify-content: flex-start;
  }
  
  .customizer-overlay.mobile {
    align-items: center;
    justify-content: center;
    z-index: 1002; /* Sopra il sidebar che ha z-index 1001 */
    padding: 16px;
    backdrop-filter: none; /* Rimuovi blur su mobile per performance */
    background: rgba(0, 0, 0, 0.75);
    -webkit-tap-highlight-color: transparent; /* Rimuovi highlight su tap mobile */
  }
  
  .customizer-panel {
    width: 360px;
    max-width: 90vw;
    height: 100%;
    background: var(--md-sys-color-surface);
    display: flex;
    flex-direction: column;
    box-shadow: 4px 0 30px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }
  
  .customizer-panel.mobile {
    width: 100%;
    max-width: 100%;
    max-height: 90vh;
    height: auto;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    margin: 0;
  }
  
  /* Header */
  .customizer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    background: linear-gradient(135deg, 
      rgba(99, 102, 241, 0.08) 0%,
      rgba(168, 85, 247, 0.05) 100%
    );
  }
  
  .header-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .header-icon {
    font-size: 24px;
    animation: float 3s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  
  .customizer-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--md-sys-color-on-surface);
    background: linear-gradient(135deg, #6366f1, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    background: var(--md-sys-color-surface-container-highest);
    color: var(--md-sys-color-error);
  }
  
  /* Tabs */
  .tabs {
    display: flex;
    padding: 8px;
    gap: 4px;
    background: var(--md-sys-color-surface-container-low);
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
  }
  
  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    background: none;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    color: var(--md-sys-color-on-surface-variant);
  }
  
  .tab:hover {
    background: var(--md-sys-color-surface-container);
  }
  
  .tab.active {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
  }
  
  .tab-icon {
    font-size: 20px;
  }
  
  .tab-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  /* Content */
  .customizer-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  
  .tab-content {
    animation: fadeIn 0.2s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .section-description {
    font-size: 13px;
    color: var(--md-sys-color-on-surface-variant);
    margin: 0 0 16px 0;
    line-height: 1.5;
  }
  
  /* Presets Grid */
  .presets-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .preset-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 12px;
    background: var(--md-sys-color-surface-container);
    border: 2px solid transparent;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideUp 0.3s ease backwards;
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
  }
  
  .preset-card:hover {
    border-color: var(--md-sys-color-primary);
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.2);
  }
  
  .preset-card.current {
    border-color: #6366f1;
    background: linear-gradient(135deg, 
      rgba(99, 102, 241, 0.15) 0%,
      rgba(168, 85, 247, 0.1) 100%
    );
  }
  
  .preset-icon {
    font-size: 32px;
    margin-bottom: 4px;
  }
  
  .preset-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
  }
  
  .preset-description {
    font-size: 11px;
    color: var(--md-sys-color-on-surface-variant);
    text-align: center;
    line-height: 1.4;
  }
  
  .current-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    color: white;
    font-size: 9px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  /* Items List */
  .items-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .item-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--md-sys-color-surface-container);
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: grab;
    transition: all 0.2s ease;
  }
  
  .item-row:hover {
    background: var(--md-sys-color-surface-container-high);
  }
  
  .item-row.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }
  
  .item-row.drag-over {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
    transform: scale(1.02);
  }
  
  .item-row.hidden-item {
    opacity: 0.5;
    background: var(--md-sys-color-surface-container-lowest);
  }
  
  .drag-handle {
    color: var(--md-sys-color-outline);
    cursor: grab;
    transition: color 0.2s;
  }
  
  .item-row:hover .drag-handle {
    color: var(--md-sys-color-primary);
  }
  
  .emoji-button {
    font-size: 20px;
    background: var(--md-sys-color-surface-container-highest);
    border: 2px solid transparent;
    border-radius: 10px;
    padding: 6px 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .emoji-button:hover {
    border-color: var(--md-sys-color-primary);
    transform: scale(1.1);
  }
  
  .emoji-picker {
    position: absolute;
    left: 60px;
    top: 100%;
    margin-top: 4px;
    display: flex;
    gap: 4px;
    padding: 8px;
    background: var(--md-sys-color-surface-container-highest);
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
    z-index: 100;
  }
  
  .emoji-option {
    font-size: 20px;
    background: none;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .emoji-option:hover {
    background: var(--md-sys-color-surface-container);
    transform: scale(1.2);
  }
  
  .emoji-option.selected {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.2);
  }
  
  .item-label {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: var(--md-sys-color-on-surface);
  }
  
  .visibility-toggle {
    background: none;
    border: none;
    color: var(--md-sys-color-primary);
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .visibility-toggle:hover {
    background: var(--md-sys-color-surface-container-highest);
  }
  
  .visibility-toggle.hidden {
    color: var(--md-sys-color-outline);
  }
  
  /* Quick Actions */
  .quick-actions {
    display: flex;
    gap: 8px;
  }
  
  .action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 10px;
    color: var(--md-sys-color-on-surface);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .action-btn:hover {
    background: var(--md-sys-color-surface-container-highest);
    border-color: var(--md-sys-color-primary);
  }
  
  /* Settings Section */
  .settings-section {
    margin-bottom: 24px;
    padding: 16px;
    background: var(--md-sys-color-surface-container-low);
    border-radius: 16px;
  }
  
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
  }
  
  .settings-section .section-description {
    margin-bottom: 12px;
  }
  
  .export-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .export-btn, .import-label {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 10px;
    color: var(--md-sys-color-on-surface);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .export-btn:hover, .import-label:hover {
    background: var(--md-sys-color-surface-container-highest);
    border-color: var(--md-sys-color-primary);
  }
  
  .toggle-import-btn {
    width: 100%;
    padding: 8px;
    background: none;
    border: 1px dashed var(--md-sys-color-outline-variant);
    border-radius: 8px;
    color: var(--md-sys-color-on-surface-variant);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .toggle-import-btn:hover {
    border-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-primary);
  }
  
  .import-section {
    margin-top: 12px;
  }
  
  .import-section textarea {
    width: 100%;
    height: 100px;
    padding: 12px;
    background: var(--md-sys-color-surface);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 10px;
    color: var(--md-sys-color-on-surface);
    font-family: monospace;
    font-size: 12px;
    resize: vertical;
    margin-bottom: 8px;
  }
  
  .import-section textarea.error {
    border-color: var(--md-sys-color-error);
  }
  
  .error-message {
    color: var(--md-sys-color-error);
    font-size: 12px;
    margin: 0 0 8px 0;
  }
  
  .import-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    border: none;
    border-radius: 10px;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .import-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
  }
  
  .import-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Danger Zone */
  .danger-zone {
    background: rgba(239, 68, 68, 0.05);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
  
  .danger-zone .section-title {
    color: #ef4444;
  }
  
  .danger-zone .reset-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 10px;
    color: #ef4444;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .danger-zone .reset-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: translateY(-2px);
  }
  
  /* Footer */
  .customizer-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--md-sys-color-outline-variant);
    background: var(--md-sys-color-surface-container-low);
  }
  
  .footer-hint {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  
  /* Scrollbar */
  .customizer-content::-webkit-scrollbar {
    width: 6px;
  }
  
  .customizer-content::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .customizer-content::-webkit-scrollbar-thumb {
    background: var(--md-sys-color-outline-variant);
    border-radius: 3px;
  }
  
  .customizer-content::-webkit-scrollbar-thumb:hover {
    background: var(--md-sys-color-outline);
  }
  
  /* Mobile */
  @media (max-width: 768px) {
    .customizer-overlay {
      align-items: center;
      justify-content: center;
      z-index: 1002; /* Sopra il sidebar che ha z-index 1001 */
      padding: 16px;
      backdrop-filter: none; /* Rimuovi blur su mobile per performance */
      background: rgba(0, 0, 0, 0.75);
    }
    
    .customizer-panel {
      width: 100%;
      max-width: 100%;
      max-height: 90vh;
      height: auto;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      margin: 0;
    }
    
    .customizer-header {
      padding-top: calc(20px + env(safe-area-inset-top));
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
    
    .customizer-content {
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
    
    .customizer-footer {
      padding-left: calc(16px + env(safe-area-inset-left));
      padding-right: calc(16px + env(safe-area-inset-right));
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
    }
    
    .presets-grid {
      grid-template-columns: 1fr;
    }
    
    .export-actions {
      flex-direction: column;
    }
    
    .tab {
      padding: 10px 6px;
      font-size: 11px;
    }
    
    .tab-icon {
      font-size: 18px;
    }
    
    .tab-label {
      font-size: 10px;
    }
  }
  
  @media (max-width: 480px) {
    .customizer-overlay {
      padding: 12px;
    }
    
    .customizer-panel {
      max-height: 95vh;
      border-radius: 12px;
    }
    
    .customizer-header {
      padding: 16px 16px 12px;
    }
    
    .customizer-header h2 {
      font-size: 16px;
    }
    
    .customizer-content {
      padding: 12px;
    }
  }
</style>

