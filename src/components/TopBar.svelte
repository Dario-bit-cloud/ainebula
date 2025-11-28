<script>
  import { selectedModel, availableModels } from '../stores/models.js';
  import { isGenerating, createNewChat, currentChatId, currentChat, deleteChat } from '../stores/chat.js';
  import { isSettingsOpen, isSidebarOpen, isMobile, isAISettingsModalOpen, isPromptLibraryModalOpen, isPremiumModalOpen } from '../stores/app.js';
  import { user, hasPlanOrHigher } from '../stores/user.js';
  import { isAuthenticatedStore, isLoading } from '../stores/auth.js';
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t } from '../stores/language.js';
  
  const dispatch = createEventDispatcher();
  
  
  function openLoginModal() {
    dispatch('openAuth', { mode: 'login' });
  }
  
  function openRegisterModal() {
    dispatch('openAuth', { mode: 'register' });
  }
  
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
      <button class="menu-toggle" on:click={toggleSidebar} title={$t('menu')}>
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
            Nebula AI 1.5
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
                title={model.premium && !hasPlanOrHigher(model.requiredPlan) ? $t('requiresSubscription', { plan: model.requiredPlan === 'pro' ? $t('pro') : $t('max') }) : ''}
              >
                <div class="model-info">
                  <div class="model-name">
                    {model.name}
                    {#if model.premium}
                      <span class="premium-badge" class:pro={model.requiredPlan === 'pro'} class:max={model.requiredPlan === 'max'}>
                        {model.requiredPlan === 'pro' ? 'PRO' : 'MAX'}
                      </span>
                    {/if}
                    {#if model.vision}
                      <span class="feature-badge vision-badge" title="Vision - Supporta analisi immagini">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Vision
                      </span>
                    {/if}
                    {#if model.reasoning}
                      <span class="feature-badge reasoning-badge" title="Reasoning - Supporta ragionamento avanzato">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                        Reasoning
                      </span>
                    {/if}
                    {#if model.functionCall}
                      <span class="feature-badge function-badge" title="Function Calling - Supporta chiamate a funzioni">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        Functions
                      </span>
                    {/if}
                    {#if model.webSearch}
                      <span class="web-search-badge" title="Ricerca web in tempo reale">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="m21 21-4.35-4.35"/>
                        </svg>
                        Web
                      </span>
                    {/if}
                  </div>
                  {#if model.description}
                    <div class="model-description">{model.description}</div>
                  {/if}
                  {#if model.contextLength}
                    <div class="model-context">Context: {Math.floor(model.contextLength / 1000)}K tokens</div>
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
  <div class="center-section" id="conversation-header-actions">
    <div class="flex items-center justify-center gap-3">
      <div class="flex-shrink-0"></div>
      <div class="flex items-center gap-2">
      </div>
    </div>
  </div>
  <div class="right-section">
    {#if !$isAuthenticatedStore && !$isLoading}
      <button class="auth-button login-button" on:click={openLoginModal}>
        Accedi
      </button>
      <button class="auth-button register-button" on:click={openRegisterModal}>
        Registrati
      </button>
    {:else if $isAuthenticatedStore}
      <button class="icon-button" title="Libreria Prompt" on:click={togglePromptLibrary}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
        </svg>
      </button>
      <!-- Impostazioni AI nascoste per evitare modifiche alla temperatura -->
      <!-- <button class="icon-button" title="Impostazioni AI" on:click={toggleAISettings}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </button> -->
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
    {/if}
  </div>
</div>

<style>
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: transparent;
    border-bottom: none;
    height: 56px;
    position: relative;
    z-index: 1000;
    isolation: isolate;
    box-shadow: none;
  }

  .left-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .menu-toggle {
    display: none;
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-on-surface);
    cursor: pointer;
    padding: 8px;
    border-radius: var(--md-sys-shape-corner-medium);
    transition: all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
    margin-right: 8px;
    box-shadow: var(--md-sys-elevation-level1);
  }

  .menu-toggle:hover {
    background-color: var(--md-sys-color-surface-container-high);
    box-shadow: var(--md-sys-elevation-level2);
  }

  .menu-toggle svg {
    display: block;
  }

  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--md-sys-color-on-surface);
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-medium);
    padding: 8px;
    box-shadow: var(--md-sys-elevation-level1);
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
    padding: 8px 12px;
    border-radius: var(--md-sys-shape-corner-medium);
    transition: all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-on-surface);
    box-shadow: var(--md-sys-elevation-level1);
  }

  @media (max-width: 768px) {
    .model-selector {
      padding: 6px 10px;
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
    background-color: var(--md-sys-color-surface-container-high);
    box-shadow: var(--md-sys-elevation-level2);
  }

  .model-name {
    font-size: var(--md-sys-typescale-body-medium-size);
    font-weight: var(--md-sys-typescale-title-medium-weight);
    font-family: var(--md-sys-typescale-body-medium-font);
    color: var(--md-sys-color-on-surface);
  }

  .dropdown-icon {
    color: var(--text-secondary);
  }

  .model-dropdown {
    position: fixed;
    min-width: 280px;
    max-width: 90vw;
    background-color: var(--md-sys-color-surface-container-high);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-medium);
    box-shadow: var(--md-sys-elevation-level3);
    overflow: visible;
    z-index: 10000;
    animation: dropdownSlideDown var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
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
  
  .web-search-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1;
    margin-left: 6px;
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }
  
  .web-search-badge svg {
    width: 10px;
    height: 10px;
  }
  
  .feature-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1;
    margin-left: 6px;
    color: white;
  }
  
  .feature-badge svg {
    width: 10px;
    height: 10px;
  }
  
  .vision-badge {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  .reasoning-badge {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
  
  .function-badge {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }
  
  .model-context {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 4px;
    opacity: 0.8;
  }
  
  @media (max-width: 768px) {
    .premium-badge {
      display: inline-flex !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    
    .web-search-badge {
      display: inline-flex !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    
    .feature-badge {
      display: inline-flex !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
  }

  .model-description {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .center-section {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
  }


  @media (max-width: 768px) {
    .center-section {
      display: none; /* Nascondi su mobile per risparmiare spazio */
    }
  }

  .right-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-button {
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 8px;
    border-radius: var(--md-sys-shape-corner-medium);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
    transform: scale(1);
    box-shadow: var(--md-sys-elevation-level1);
  }

  .icon-button:active {
    transform: scale(0.95);
  }

  .icon-button:hover {
    background-color: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
    box-shadow: var(--md-sys-elevation-level2);
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
  
  .auth-button {
    padding: 8px 16px;
    border-radius: var(--md-sys-shape-corner-medium);
    font-size: var(--md-sys-typescale-label-large-size);
    font-weight: var(--md-sys-typescale-label-large-weight);
    font-family: var(--md-sys-typescale-label-large-font);
    cursor: pointer;
    transition: all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--md-sys-elevation-level1);
  }
  
  .login-button {
    background: var(--md-sys-color-surface-container);
    color: var(--md-sys-color-on-surface);
    border: 1px solid var(--md-sys-color-outline-variant);
  }
  
  .login-button:hover {
    background: var(--md-sys-color-surface-container-high);
    border-color: var(--md-sys-color-outline);
    box-shadow: var(--md-sys-elevation-level2);
  }
  
  .register-button {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    border: 1px solid var(--md-sys-color-primary);
  }
  
  .register-button:hover {
    background-color: var(--md-sys-color-primary);
    box-shadow: var(--md-sys-elevation-level2);
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    .auth-button {
      padding: 6px 12px;
      font-size: 13px;
    }
    
    .right-section {
      gap: 8px;
    }
  }
  
  @media (max-width: 480px) {
    .auth-button {
      padding: 6px 10px;
      font-size: 12px;
    }
    
    .login-button {
      display: none; /* Nascondi login su schermi molto piccoli, mostra solo registrati */
    }
  }
</style>

