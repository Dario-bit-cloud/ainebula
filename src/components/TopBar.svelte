<script>
  import { selectedModel, availableModels } from '../stores/models.js';
  import { isGenerating } from '../stores/chat.js';
  import { isSettingsOpen, isSidebarOpen, isMobile, isAISettingsModalOpen, isPromptLibraryModalOpen, isPremiumModalOpen } from '../stores/app.js';
  import { user, hasPlanOrHigher } from '../stores/user.js';
  import { onMount } from 'svelte';
  
  let isModelDropdownOpen = false;
  let modelSelectorButton;
  let modelDropdown;
  let dropdownPosition = { top: 0, left: 0 };
  
  function toggleModelDropdown() {
    isModelDropdownOpen = !isModelDropdownOpen;
    if (isModelDropdownOpen && modelSelectorButton) {
      updateDropdownPosition();
    }
  }
  
  function updateDropdownPosition() {
    if (modelSelectorButton) {
      const rect = modelSelectorButton.getBoundingClientRect();
      dropdownPosition = {
        top: rect.bottom + 8,
        left: rect.left
      };
    }
  }
  
  function selectModel(modelId) {
    // Verifica se il modello è premium e se l'utente ha l'abbonamento necessario
    const model = $availableModels.find(m => m.id === modelId);
    if (model?.premium) {
      const requiredPlan = model.requiredPlan;
      if (!hasPlanOrHigher(requiredPlan)) {
        // Apri il modal premium
        isPremiumModalOpen.set(true);
        isModelDropdownOpen = false;
        return;
      }
    }
    
    selectedModel.set(modelId);
    isModelDropdownOpen = false;
  }
  
  // Mostra sempre tutti i modelli, ma disabilita quelli premium senza abbonamento
  // Raggruppa i modelli per gruppo
  $: groupedModels = $availableModels.reduce((acc, model) => {
    const group = model.group || 'Altri';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(model);
    return acc;
  }, {});
  
  function toggleSettings() {
    isSettingsOpen.update(open => !open);
  }
  
  function toggleAISettings() {
    isAISettingsModalOpen.update(open => !open);
  }
  
  function togglePromptLibrary() {
    isPromptLibraryModalOpen.update(open => !open);
  }
  
  function toggleSidebar() {
    isSidebarOpen.update(open => !open);
  }
  
  // Chiudi dropdown quando si clicca fuori
  function handleClickOutside(event) {
    if (!event.target.closest('.model-selector-wrapper') && !event.target.closest('.legacy-submenu')) {
      isModelDropdownOpen = false;
      showLegacyModels = false;
    }
  }
  
  // Aggiorna posizione quando la finestra viene ridimensionata o scrollata
  onMount(() => {
    const handleResize = () => {
      if (isModelDropdownOpen) {
        updateDropdownPosition();
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  });
</script>

<svelte:window on:click={handleClickOutside} />

<div class="top-bar">
  <div class="left-section">
    {#if $isMobile}
      <button class="menu-toggle" on:click={toggleSidebar} title="Menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    {/if}
    <div class="logo-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </div>
    <div class="model-selector-wrapper">
      <button class="model-selector" bind:this={modelSelectorButton} on:click={toggleModelDropdown}>
        <span class="model-name">
          {#if $availableModels.find(m => m.id === $selectedModel)}
            {@const selected = $availableModels.find(m => m.id === $selectedModel)}
            {selected.name}
          {:else}
            Nebula AI 1.0
          {/if}
        </span>
        <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {#if isModelDropdownOpen}
        <div class="model-dropdown" bind:this={modelDropdown} style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;">
          {#each Object.entries(groupedModels) as [groupName, models]}
            <div class="model-group-header">{groupName}</div>
            {#each models as model}
              <button 
                class="model-option" 
                class:selected={model.id === $selectedModel}
                class:premium={model.premium}
                class:disabled={model.premium && !hasPlanOrHigher(model.requiredPlan)}
                on:click={() => selectModel(model.id)}
                title={model.premium && !hasPlanOrHigher(model.requiredPlan) ? 'Richiede abbonamento ' + (model.requiredPlan === 'pro' ? 'Pro' : 'Massimo') : ''}
              >
                <div class="model-info">
                  <div class="model-name">
                    {model.name}
                    {#if model.premium}
                      <span class="premium-badge" class:pro={model.requiredPlan === 'pro'} class:max={model.requiredPlan === 'max'}>
                        {model.requiredPlan === 'pro' ? 'PRO' : 'MAX'}
                      </span>
                    {/if}
                  </div>
                  {#if model.description}
                    <div class="model-description">{model.description}</div>
                  {/if}
                </div>
                {#if model.id === $selectedModel}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                {/if}
              </button>
            {/each}
          {/each}
        </div>
      {/if}
    </div>
  </div>
  <div class="right-section">
    <button class="icon-button" title="Libreria Prompt" on:click={togglePromptLibrary}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    </button>
    <button class="icon-button" title="Impostazioni AI" on:click={toggleAISettings}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </button>
    <button class="icon-button" title="Impostazioni" on:click={toggleSettings}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
      </svg>
    </button>
    {#if $isGenerating}
      <div class="loading-indicator" title="Generazione in corso">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      </div>
    {/if}
  </div>
</div>

<style>
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    height: 56px;
    position: relative;
    z-index: 1000;
    isolation: isolate;
  }

  .left-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .menu-toggle {
    display: none;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    margin-right: 8px;
  }

  .menu-toggle:hover {
    background-color: var(--hover-bg);
  }

  .menu-toggle svg {
    display: block;
  }

  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    .top-bar {
      padding: 10px 12px;
      height: 52px;
    }

    .menu-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      min-width: 40px;
      min-height: 40px;
    }

    .logo-icon {
      display: none; /* Nascondi logo su mobile per più spazio */
    }

    .left-section {
      gap: 8px;
    }

    .model-selector {
      padding: 6px 8px;
    }

    .model-name {
      font-size: 13px;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .right-section {
      gap: 8px;
    }

    .icon-button {
      padding: 8px;
      min-width: 36px;
      min-height: 36px;
    }
  }

  @media (max-width: 480px) {
    .top-bar {
      padding: 8px 10px;
      height: 50px;
    }

    .model-name {
      max-width: 120px;
      font-size: 12px;
    }
  }

  .model-selector-wrapper {
    position: relative;
  }

  .model-selector {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    background: none;
    border: none;
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    .model-selector {
      padding: 4px 6px;
    }

    .model-name {
      font-size: 13px;
    }

  .model-selector-wrapper {
    flex: 1;
    min-width: 0;
    position: relative;
  }
  }

  .model-selector:hover {
    background-color: var(--hover-bg);
  }

  .model-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .dropdown-icon {
    color: var(--text-secondary);
  }

  .model-dropdown {
    position: fixed;
    min-width: 280px;
    max-width: 90vw;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: visible;
    z-index: 10000;
    animation: dropdownSlideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @media (max-width: 768px) {
    .model-dropdown {
      min-width: 240px;
      max-width: calc(100vw - 32px);
      left: 16px !important;
      right: 16px;
      width: auto;
    }
  }
  
  .model-group-header {
    padding: 12px 16px 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 4px;
  }
  
  .legacy-submenu {
    position: fixed;
    min-width: 240px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    z-index: 10001;
    animation: dropdownSlideRight 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  @keyframes dropdownSlideRight {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .model-option-header {
    cursor: pointer;
  }
  
  .model-option-header:hover {
    background-color: var(--hover-bg);
  }

  @keyframes dropdownSlideDown {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .model-option {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
    color: var(--text-primary);
  }

  .model-option:hover {
    background-color: var(--hover-bg);
  }

  .model-option.selected {
    background-color: var(--bg-tertiary);
  }

  .model-option.premium {
    position: relative;
  }

  .model-option.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .model-option.disabled:hover {
    background-color: transparent;
  }

  .model-info {
    flex: 1;
  }

  .model-info .model-name {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .premium-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1;
  }

  .premium-badge.pro {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .premium-badge.max {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
  }

  .model-description {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .right-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform: scale(1);
  }

  .icon-button:active {
    transform: scale(0.95);
  }

  .icon-button:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .loading-indicator {
    color: var(--accent-blue);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>

