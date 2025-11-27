<script>
  import { nebulini, savedNebulini, getNebulinoById, incrementNebulinoUsage } from '../stores/nebulini.js';
  import { isNebuliniModalOpen } from '../stores/app.js';
  import { isMobile } from '../stores/app.js';
  import { createEventDispatcher } from 'svelte';
  import { createNewChat } from '../stores/chat.js';
  import { sidebarView } from '../stores/app.js';
  import { aiLibraryCategories, getAllAIs, filterAIs } from '../stores/aiLibrary.js';
  
  const dispatch = createEventDispatcher();
  
  // Tab switcher
  let activeTab = 'nebulini'; // 'nebulini' o 'library'
  
  // Nebulini state
  let selectedCategory = 'Tutti';
  let searchTerm = '';
  let viewingNebulino = null;
  let isSelecting = false; // Previene click multipli
  let selectedNebulinoId = null; // Traccia quale nebulino è in selezione
  const categories = ['Tutti', 'In Evidenza', 'Tendenze', 'DI NEBULA AI', 'DALL·E', 'Scrittura', 'Produttività', 'Ricerca e Analisi', 'Programmazione', 'Educazione', 'Stile di Vita', 'Creatività', 'Analisi', 'Personalizzato'];
  
  // AI Library state
  let selectedAICategory = 'all';
  let selectedPricing = 'all';
  let aiSearchTerm = '';
  let expandedCategories = new Set();
  
  // Expand all categories by default when switching to library tab
  $: if (activeTab === 'library' && expandedCategories.size === 0 && aiLibraryCategories && aiLibraryCategories.length > 0) {
    expandedCategories = new Set(aiLibraryCategories.map(cat => cat.id));
  }
  
  $: allNebulini = [...$nebulini, ...$savedNebulini];
  
  $: filteredNebulini = allNebulini.filter(n => {
    const matchesCategory = selectedCategory === 'Tutti' || 
      (selectedCategory === 'Personalizzato' ? $savedNebulini.includes(n) : n.category === selectedCategory);
    const matchesSearch = searchTerm === '' || 
      n.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.tags && n.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    const usageDiff = (b.usageCount || 0) - (a.usageCount || 0);
    if (usageDiff !== 0) return usageDiff;
    return (a.name || '').localeCompare(b.name || '');
  });
  
  $: allAIs = getAllAIs ? getAllAIs() : [];
  $: filteredAIs = filterAIs ? filterAIs(allAIs, aiSearchTerm, selectedAICategory, selectedPricing) : [];
  
  // Raggruppa le AI filtrate per categoria
  $: groupedAIs = (() => {
    const grouped = {};
    filteredAIs.forEach(ai => {
      if (!grouped[ai.categoryId]) {
        grouped[ai.categoryId] = [];
      }
      grouped[ai.categoryId].push(ai);
    });
    return grouped;
  })();
  
  function closeModal() {
    isNebuliniModalOpen.set(false);
    viewingNebulino = null;
    activeTab = 'nebulini';
    searchTerm = '';
    aiSearchTerm = '';
    selectedAICategory = 'all';
    selectedPricing = 'all';
    expandedCategories.clear();
    // Reset stato selezione
    isSelecting = false;
    selectedNebulinoId = null;
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  async function selectNebulino(nebulino) {
    // Previeni click multipli
    if (isSelecting || selectedNebulinoId === nebulino.id) {
      return;
    }
    
    // Chiudi il modal IMMEDIATAMENTE
    closeModal();
    
    // Imposta stato di selezione
    isSelecting = true;
    selectedNebulinoId = nebulino.id;
    
    try {
      incrementNebulinoUsage(nebulino.id);
      const chatId = await createNewChat();
      dispatch('select', {
        nebulino,
        chatId,
        systemPrompt: nebulino.systemPrompt
      });
      sidebarView.set('chat');
    } catch (error) {
      console.error('Errore selezione nebulino:', error);
    } finally {
      // Reset dopo un breve delay per evitare click accidentali
      setTimeout(() => {
        isSelecting = false;
        selectedNebulinoId = null;
      }, 500);
    }
  }
  
  function viewNebulino(nebulino) {
    viewingNebulino = nebulino;
  }
  
  function closeView() {
    viewingNebulino = null;
  }
  
  function toggleCategory(categoryId) {
    expandedCategories = new Set(expandedCategories);
    if (expandedCategories.has(categoryId)) {
      expandedCategories.delete(categoryId);
    } else {
      expandedCategories.add(categoryId);
    }
  }
  
  function openAI(ai) {
    window.open(ai.url, '_blank', 'noopener,noreferrer');
  }
  
  function getPricingColor(pricing) {
    switch(pricing) {
      case 'FREE': return '#10b981';
      case 'FREEMIUM': return '#f59e0b';
      case 'PAID': return '#ef4444';
      default: return '#6b7280';
    }
  }
  
  function getCategoryInfo(categoryId) {
    return aiLibraryCategories ? aiLibraryCategories.find(cat => cat.id === categoryId) : null;
  }
</script>

{#if $isNebuliniModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content" class:modal-mobile={$isMobile}>
      <div class="modal-header">
        <h2>Nebulini e Libreria AI</h2>
        <div class="header-actions">
          <button class="close-button" on:click={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="tab-switcher">
        <button 
          class="tab-button" 
          class:active={activeTab === 'nebulini'}
          on:click={() => activeTab = 'nebulini'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          Nebulini
        </button>
        <button 
          class="tab-button" 
          class:active={activeTab === 'library'}
          on:click={() => activeTab = 'library'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Libreria AI
          <span class="badge">{allAIs.length}</span>
        </button>
      </div>

      <div class="modal-body">
        {#if activeTab === 'nebulini'}
          <!-- Nebulini Tab -->
          <div class="search-bar">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              class="search-input"
              placeholder="Cerca nebulini..."
              bind:value={searchTerm}
            />
          </div>

          <div class="categories">
            {#each categories as category}
              <button
                class="category-button"
                class:active={selectedCategory === category}
                on:click={() => selectedCategory = category}
              >
                {category}
              </button>
            {/each}
          </div>

          <div class="nebulini-grid">
            {#if filteredNebulini.length > 0}
              {#each filteredNebulini as nebulino}
                <div 
                  class="nebulino-card" 
                  class:selecting={isSelecting && selectedNebulinoId === nebulino.id}
                  class:disabled={isSelecting}
                  on:click={() => selectNebulino(nebulino)}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === 'Enter' && !isSelecting && selectNebulino(nebulino)}
                >
                  <div class="nebulino-header">
                    <div class="nebulino-icon" style="background-color: {nebulino.color}20; color: {nebulino.color}">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d={nebulino.icon}/>
                      </svg>
                    </div>
                    <div class="nebulino-info">
                      <h3 class="nebulino-name">{nebulino.name}</h3>
                      <span class="nebulino-category">{nebulino.category}</span>
                    </div>
                  </div>
                  <p class="nebulino-description">{nebulino.description}</p>
                  <div class="nebulino-footer">
                    <div class="nebulino-tags">
                      {#each (nebulino.tags || []).slice(0, 3) as tag}
                        <span class="tag">{tag}</span>
                      {/each}
                    </div>
                    {#if nebulino.usageCount > 0}
                      <span class="usage-count">{nebulino.usageCount} utilizzi</span>
                    {/if}
                  </div>
                  <button 
                    class="view-button"
                    on:click|stopPropagation={() => viewNebulino(nebulino)}
                    title="Visualizza dettagli"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              {/each}
            {:else}
              <div class="empty-state">
                <p>Nessun nebulino trovato</p>
                <p class="empty-hint">Prova a modificare i filtri di ricerca</p>
              </div>
            {/if}
          </div>
        {:else}
          <!-- AI Library Tab -->
          <div class="ai-library-header">
            <div class="search-bar">
              <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                class="search-input"
                placeholder="Cerca tra {allAIs.length} AI disponibili..."
                bind:value={aiSearchTerm}
              />
            </div>
            
            <div class="filters-row">
              <select class="filter-select" bind:value={selectedAICategory}>
                <option value="all">Tutte le categorie</option>
                {#each aiLibraryCategories as cat}
                  <option value={cat.id}>{cat.emoji} {cat.name}</option>
                {/each}
              </select>
              
              <select class="filter-select" bind:value={selectedPricing}>
                <option value="all">Tutti i prezzi</option>
                <option value="FREE">Gratis</option>
                <option value="FREEMIUM">Freemium</option>
                <option value="PAID">A pagamento</option>
              </select>
            </div>
          </div>

          <div class="ai-library-content">
            {#if Object.keys(groupedAIs).length > 0}
              {#each Object.entries(groupedAIs) as [categoryId, ais]}
                {@const categoryInfo = getCategoryInfo(categoryId)}
                {@const isExpanded = expandedCategories.has(categoryId)}
                <div class="ai-category-section">
                  <button 
                    class="category-header"
                    on:click={() => toggleCategory(categoryId)}
                  >
                    <div class="category-header-left">
                      <span class="category-emoji">{categoryInfo?.emoji || '📦'}</span>
                      <div>
                        <h3 class="category-title">{categoryInfo?.name || categoryId}</h3>
                        <span class="category-count">{ais.length} AI disponibili</span>
                      </div>
                    </div>
                    <svg 
                      class="expand-icon" 
                      class:expanded={isExpanded}
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      stroke-width="2"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  
                  {#if isExpanded}
                    <div class="ai-grid">
                      {#each ais as ai}
                        <div class="ai-card" on:click={() => openAI(ai)}>
                          <div class="ai-card-header">
                            <h4 class="ai-name">{ai.name}</h4>
                            <span 
                              class="pricing-badge" 
                              style="background-color: {getPricingColor(ai.pricing)}20; color: {getPricingColor(ai.pricing)}"
                            >
                              {ai.pricing}
                            </span>
                          </div>
                          <p class="ai-description">{ai.description}</p>
                          <div class="ai-card-footer">
                            <span class="external-link">
                              Apri
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                              </svg>
                            </span>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            {:else}
              <div class="empty-state">
                <p>Nessuna AI trovata</p>
                <p class="empty-hint">Prova a modificare i filtri di ricerca</p>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if viewingNebulino}
  <div class="view-modal-backdrop" on:click={closeView} on:keydown={(e) => e.key === 'Escape' && closeView()}>
    <div class="view-modal-content" class:modal-mobile={$isMobile} on:click|stopPropagation>
      <div class="view-modal-header">
        <div class="view-header-info">
          <div class="view-icon" style="background-color: {viewingNebulino.color}20; color: {viewingNebulino.color}">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d={viewingNebulino.icon}/>
            </svg>
          </div>
          <div>
            <h2>{viewingNebulino.name}</h2>
            <span class="view-category">{viewingNebulino.category}</span>
          </div>
        </div>
        <button class="close-button" on:click={closeView}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="view-modal-body">
        <div class="view-description">
          <h3>Descrizione</h3>
          <p>{viewingNebulino.description}</p>
        </div>
        <div class="view-tags">
          <h3>Tag</h3>
          <div class="tags-list">
            {#each (viewingNebulino.tags || []) as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        </div>
        <div class="view-actions">
          <button 
            class="select-button" 
            class:disabled={isSelecting}
            disabled={isSelecting}
            on:click={() => { 
              if (!isSelecting) {
                selectNebulino(viewingNebulino); 
                closeView(); 
              }
            }}
          >
            {isSelecting && selectedNebulinoId === viewingNebulino.id ? 'Caricamento...' : 'Usa questo Nebulino'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background-color: var(--md-sys-color-surface);
    border-radius: 16px;
    width: 100%;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-content.modal-mobile {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .close-button:hover {
    background-color: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
  }

  /* Tab Switcher */
  .tab-switcher {
    display: flex;
    gap: 8px;
    padding: 0 24px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    background-color: var(--md-sys-color-surface-container-lowest);
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--md-sys-color-on-surface-variant);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    top: 1px;
  }

  .tab-button:hover {
    color: var(--md-sys-color-on-surface);
    background-color: var(--md-sys-color-surface-container);
  }

  .tab-button.active {
    color: var(--md-sys-color-primary);
    border-bottom-color: var(--md-sys-color-primary);
  }

  .badge {
    background-color: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .search-bar {
    position: relative;
    margin-bottom: 20px;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--md-sys-color-on-surface-variant);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 12px 12px 12px 40px;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 12px;
    background-color: var(--md-sys-color-surface-container);
    color: var(--md-sys-color-on-surface);
    font-size: 14px;
    transition: all 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--md-sys-color-primary);
    box-shadow: 0 0 0 2px var(--md-sys-color-primary-container);
  }

  .categories {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .category-button {
    padding: 8px 16px;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 20px;
    background-color: var(--md-sys-color-surface-container);
    color: var(--md-sys-color-on-surface-variant);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .category-button:hover {
    background-color: var(--md-sys-color-surface-container-high);
    border-color: var(--md-sys-color-primary);
  }

  .category-button.active {
    background-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    border-color: var(--md-sys-color-primary);
  }

  /* Nebulini Grid */
  .nebulini-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .nebulino-card {
    background-color: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .nebulino-card:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--md-sys-color-primary);
  }

  .nebulino-card.disabled {
    cursor: not-allowed;
    opacity: 0.6;
    pointer-events: none;
  }

  .nebulino-card.selecting {
    border-color: var(--md-sys-color-primary);
    box-shadow: 0 0 0 2px var(--md-sys-color-primary-container);
  }

  .nebulino-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .nebulino-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nebulino-info {
    flex: 1;
    min-width: 0;
  }

  .nebulino-name {
    margin: 0 0 4px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
  }

  .nebulino-category {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .nebulino-description {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .nebulino-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 12px;
  }

  .nebulino-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tag {
    padding: 4px 8px;
    background-color: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface-variant);
    border-radius: 6px;
    font-size: 11px;
  }

  .usage-count {
    font-size: 11px;
    color: var(--md-sys-color-on-surface-variant);
  }

  .view-button {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    opacity: 0;
    transition: all 0.2s;
  }

  .nebulino-card:hover .view-button {
    opacity: 1;
  }

  .view-button:hover {
    background-color: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
  }

  /* AI Library Styles */
  .ai-library-header {
    margin-bottom: 24px;
  }

  .filters-row {
    display: flex;
    gap: 12px;
    margin-top: 12px;
  }

  .filter-select {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 8px;
    background-color: var(--md-sys-color-surface-container);
    color: var(--md-sys-color-on-surface);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--md-sys-color-primary);
    box-shadow: 0 0 0 2px var(--md-sys-color-primary-container);
  }

  .ai-library-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .ai-category-section {
    background-color: var(--md-sys-color-surface-container-lowest);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 12px;
    overflow: hidden;
  }

  .category-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .category-header:hover {
    background-color: var(--md-sys-color-surface-container);
  }

  .category-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .category-emoji {
    font-size: 24px;
    line-height: 1;
  }

  .category-title {
    margin: 0 0 4px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
  }

  .category-count {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
  }

  .expand-icon {
    color: var(--md-sys-color-on-surface-variant);
    transition: transform 0.2s;
  }

  .expand-icon.expanded {
    transform: rotate(180deg);
  }

  .ai-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    padding: 16px 20px 20px;
  }

  .ai-card {
    background-color: var(--md-sys-color-surface);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 10px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .ai-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--md-sys-color-primary);
  }

  .ai-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .ai-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
    flex: 1;
  }

  .pricing-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .ai-description {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: var(--md-sys-color-on-surface-variant);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .ai-card-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .external-link {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--md-sys-color-primary);
    font-weight: 500;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: var(--md-sys-color-on-surface-variant);
  }

  .empty-state p {
    margin: 8px 0;
    font-size: 16px;
  }

  .empty-hint {
    font-size: 14px;
    opacity: 0.7;
  }

  /* View Modal */
  .view-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  }

  .view-modal-content {
    background-color: var(--md-sys-color-surface);
    border-radius: 16px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
  }

  .view-modal-content.modal-mobile {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .view-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
  }

  .view-header-info {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .view-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .view-modal-header h2 {
    margin: 0 0 4px 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
  }

  .view-category {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .view-modal-body {
    padding: 24px;
    overflow-y: auto;
  }

  .view-description,
  .view-tags {
    margin-bottom: 24px;
  }

  .view-description h3,
  .view-tags h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
  }

  .view-description p {
    margin: 0;
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant);
    line-height: 1.6;
  }

  .tags-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .view-actions {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--md-sys-color-outline-variant);
  }

  .select-button {
    width: 100%;
    padding: 12px 24px;
    background-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .select-button:hover:not(:disabled) {
    background-color: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .select-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    .nebulini-grid,
    .ai-grid {
      grid-template-columns: 1fr;
    }

    .modal-body {
      padding: 16px;
    }

    .nebulino-card,
    .ai-card {
      padding: 16px;
    }

    .filters-row {
      flex-direction: column;
    }

    .tab-switcher {
      padding: 0 16px;
    }

    .modal-header {
      padding: 16px;
    }
  }
</style>
