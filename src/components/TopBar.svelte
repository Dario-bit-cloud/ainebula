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
  
  let isModelDropdownOpen = false;
  let modelSelectorButton;
  let modelDropdown;
  let dropdownPosition = { top: 0, left: 0 };
  let isThirdPartySubmenuOpen = false;
  let thirdPartySubmenuPosition = { top: 0, left: 0 };
  let thirdPartySubmenuRef;
  let clickHandled = false;
  
  function toggleModelDropdown(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    clickHandled = true;
    isModelDropdownOpen = !isModelDropdownOpen;
    if (isModelDropdownOpen && modelSelectorButton) {
      // Usa setTimeout per assicurarsi che il DOM sia aggiornato
      setTimeout(() => {
        updateDropdownPosition();
      }, 0);
    }
    // Reset dopo un breve delay
    setTimeout(() => {
      clickHandled = false;
    }, 100);
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
  
  async function selectModel(modelId) {
    // Verifica se il modello è premium e se l'utente ha l'abbonamento necessario
    const model = $availableModels.find(m => m.id === modelId);
    if (model?.premium) {
      const requiredPlan = model.requiredPlan;
      if (!hasPlanOrHigher(requiredPlan)) {
        // Apri il modal premium
        isPremiumModalOpen.set(true);
        isModelDropdownOpen = false;
        isThirdPartySubmenuOpen = false;
        return;
      }
    }
    
    // Se il modello è diverso da quello attuale, crea una nuova chat
    const currentModelId = get(selectedModel);
    if (currentModelId !== modelId) {
      selectedModel.set(modelId);
      // Crea una nuova chat quando si cambia modello
      await createNewChat();
    } else {
      selectedModel.set(modelId);
    }
    
    isModelDropdownOpen = false;
    isThirdPartySubmenuOpen = false;
  }
  
  // Mostra sempre tutti i modelli, ma disabilita quelli premium senza abbonamento
  // Raggruppa i modelli per gruppo, escludendo "AI di terze parti" dal dropdown principale
  $: groupedModels = $availableModels.reduce((acc, model) => {
    const group = model.group || 'Altri';
    // Escludi "AI di terze parti" dal dropdown principale
    if (group === 'AI di terze parti') {
      return acc;
    }
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(model);
    return acc;
  }, {});
  
  // Modelli di terze parti separati
  $: thirdPartyModels = $availableModels.filter(m => m.group === 'AI di terze parti');
  
  // Funzione per gestire il click sulla sezione "AI di terze parti"
  function toggleThirdPartySubmenu(event) {
    if (event) {
      event.stopPropagation();
    }
    // Su mobile, non aprire il submenu laterale ma usa il popup
    if ($isMobile) {
      isThirdPartySubmenuOpen = !isThirdPartySubmenuOpen;
    } else {
      if (event && event.currentTarget) {
        updateThirdPartySubmenuPosition(event);
      }
      isThirdPartySubmenuOpen = !isThirdPartySubmenuOpen;
    }
  }
  
  function updateThirdPartySubmenuPosition(event) {
    if (modelDropdown && event && event.currentTarget) {
      const dropdownRect = modelDropdown.getBoundingClientRect();
      const groupRect = event.currentTarget.getBoundingClientRect();
      thirdPartySubmenuPosition = {
        top: groupRect.top,
        left: dropdownRect.right + 8
      };
    }
  }
  
  function closeThirdPartyPopup() {
    isThirdPartySubmenuOpen = false;
  }
  
  function handleThirdPartyBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeThirdPartyPopup();
    }
  }
  
  // Chiudi il submenu quando si chiude il dropdown principale
  $: if (!isModelDropdownOpen) {
    // Su mobile chiudi anche il popup
    if ($isMobile) {
      isThirdPartySubmenuOpen = false;
    } else {
      // Su desktop chiudi solo il submenu laterale
      isThirdPartySubmenuOpen = false;
    }
  }
  
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
    // Ignora se il click è stato gestito dal toggle
    if (clickHandled) {
      return;
    }
    
    // Su mobile, se il popup è aperto, non chiudere con click esterno (gestito dal backdrop)
    if ($isMobile && isThirdPartySubmenuOpen) {
      if (event.target.closest('.third-party-popup-backdrop') && 
          !event.target.closest('.third-party-popup')) {
        return; // Il backdrop gestirà la chiusura
      }
    }
    
    // Non chiudere se si clicca sul bottone del modello o sul dropdown
    if (event.target.closest('.model-selector') || 
        event.target.closest('.model-selector-wrapper') || 
        event.target.closest('.model-dropdown') ||
        event.target.closest('.third-party-submenu') ||
        event.target.closest('.third-party-popup') ||
        event.target.closest('.legacy-submenu')) {
      return;
    }
    
    // Chiudi il dropdown
    isModelDropdownOpen = false;
    // Su desktop chiudi anche il submenu, su mobile il popup si chiude tramite backdrop
    if (!$isMobile) {
      isThirdPartySubmenuOpen = false;
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
    <div class="model-selector-wrapper">
      <button 
        class="model-selector" 
        bind:this={modelSelectorButton} 
        on:click|stopPropagation={toggleModelDropdown}
        aria-label="Seleziona modello AI"
        aria-expanded={isModelDropdownOpen}
        aria-haspopup="listbox"
        type="button"
      >
        <span class="model-name">
          {#if $availableModels.find(m => m.id === $selectedModel)}
            {@const selected = $availableModels.find(m => m.id === $selectedModel)}
            {#if selected.logo}
              <img src={selected.logo} alt="{selected.name} logo" class="model-logo-small" />
            {/if}
            {selected.name}
          {:else}
            Flash Thinking
          {/if}
        </span>
        <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {#if isModelDropdownOpen}
        <div 
          class="model-dropdown" 
          bind:this={modelDropdown} 
          style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;"
          role="listbox"
          aria-label="Lista modelli AI disponibili"
        >
          {#if Object.keys(groupedModels).length === 0 && thirdPartyModels.length === 0}
            <div class="model-option" style="padding: 12px; text-align: center; color: var(--md-sys-color-on-surface-variant);">
              Nessun modello disponibile
            </div>
          {:else}
            {#each Object.entries(groupedModels) as [groupName, models]}
              <div class="model-group-header">{groupName}</div>
              {#each models as model}
              <button 
                class="model-option" 
                class:selected={model.id === $selectedModel}
                class:premium={model.premium}
                class:disabled={model.premium && !hasPlanOrHigher(model.requiredPlan)}
                on:click={() => selectModel(model.id)}
                title={model.premium && !hasPlanOrHigher(model.requiredPlan) ? $t('requiresSubscription', { plan: model.requiredPlan === 'pro' ? 'Pro' : 'Max' }) : ''}
                role="option"
                aria-selected={model.id === $selectedModel}
                aria-disabled={model.premium && !hasPlanOrHigher(model.requiredPlan)}
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
                  <div class="selected-indicator">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                {/if}
              </button>
              {/each}
            {/each}
            <!-- Sezione AI di terze parti con click -->
            {#if thirdPartyModels.length > 0}
            <div 
              class="model-group-header third-party-header"
              class:active={isThirdPartySubmenuOpen}
              on:click={(e) => toggleThirdPartySubmenu(e)}
            >
              AI di terze parti
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 8px; transition: transform 0.2s;">
                <polyline points="9 18 15 12 9 6" style="transform: {isThirdPartySubmenuOpen ? 'rotate(90deg)' : 'rotate(0deg)'};"/>
              </svg>
            </div>
          {/if}
          {/if}
        </div>
      {/if}
      <!-- Tendina AI di terze parti - Desktop -->
      {#if isThirdPartySubmenuOpen && thirdPartyModels.length > 0 && !$isMobile}
        <div 
          class="third-party-submenu" 
          bind:this={thirdPartySubmenuRef}
          style="top: {thirdPartySubmenuPosition.top}px; left: {thirdPartySubmenuPosition.left}px;"
        >
          {#each thirdPartyModels as model}
            <button 
              class="model-option" 
              class:selected={model.id === $selectedModel}
              on:click={() => selectModel(model.id)}
              role="option"
              aria-selected={model.id === $selectedModel}
            >
              <div class="model-info">
                <div class="model-name">
                  {#if model.logo}
                    <img src={model.logo} alt="{model.name} logo" class="model-logo" />
                  {/if}
                  {model.name}
                </div>
                {#if model.description}
                  <div class="model-description">{model.description}</div>
                {/if}
              </div>
              {#if model.id === $selectedModel}
                <div class="selected-indicator">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
      
      <!-- Popup AI di terze parti - Mobile -->
      {#if isThirdPartySubmenuOpen && thirdPartyModels.length > 0 && $isMobile}
        <div 
          class="third-party-popup-backdrop" 
          on:click={handleThirdPartyBackdropClick}
          on:keydown={(e) => e.key === 'Escape' && closeThirdPartyPopup()}
          role="dialog"
          aria-modal="true"
          aria-label="Seleziona AI di terze parti"
        >
          <div 
            class="third-party-popup" 
            bind:this={thirdPartySubmenuRef}
            on:click|stopPropagation
          >
            <div class="third-party-popup-header">
              <h3>AI di terze parti</h3>
              <button 
                class="close-popup-button" 
                on:click={closeThirdPartyPopup}
                aria-label="Chiudi"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="third-party-popup-content">
              {#each thirdPartyModels as model}
                <button 
                  class="model-option" 
                  class:selected={model.id === $selectedModel}
                  on:click={() => {
                    selectModel(model.id);
                    closeThirdPartyPopup();
                  }}
                  role="option"
                  aria-selected={model.id === $selectedModel}
                >
                  <div class="model-info">
                    <div class="model-name">
                      {#if model.logo}
                        <img src={model.logo} alt="{model.name} logo" class="model-logo" />
                      {/if}
                      {model.name}
                    </div>
                    {#if model.description}
                      <div class="model-description">{model.description}</div>
                    {/if}
                  </div>
                  {#if model.id === $selectedModel}
                    <div class="selected-indicator">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
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
    {#if $isAuthenticatedStore}
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
      padding-top: calc(10px + env(safe-area-inset-top));
      height: calc(52px + env(safe-area-inset-top));
      min-height: 52px;
    }

    .menu-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      min-width: 44px;
      min-height: 44px;
      touch-action: manipulation;
      border-radius: 12px;
    }

    .logo-icon {
      display: none; /* Nascondi logo su mobile per più spazio */
    }

    .left-section {
      gap: 10px;
    }

    .model-selector {
      padding: 8px 12px;
      min-height: 44px;
      border-radius: 16px;
    }

    .model-name {
      font-size: 14px;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }

    .right-section {
      gap: 6px;
    }

    .icon-button {
      padding: 10px;
      min-width: 44px;
      min-height: 44px;
      touch-action: manipulation;
      border-radius: 12px;
    }
  }

  @media (max-width: 480px) {
    .top-bar {
      padding: 8px 10px;
      padding-top: calc(8px + env(safe-area-inset-top));
      height: calc(50px + env(safe-area-inset-top));
      min-height: 50px;
    }

    .model-selector {
      padding: 6px 10px;
      min-height: 40px;
    }

    .model-name {
      max-width: 130px;
      font-size: 13px;
    }
    
    .icon-button {
      padding: 8px;
      min-width: 40px;
      min-height: 40px;
    }
    
    .menu-toggle {
      padding: 8px;
      min-width: 40px;
      min-height: 40px;
    }
  }

  .model-selector-wrapper {
    position: relative;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    z-index: 1001 !important;
    pointer-events: auto !important;
  }

  .model-selector {
    display: flex !important;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 10px 16px;
    border-radius: var(--md-sys-shape-corner-large);
    transition: all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized);
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-on-surface);
    box-shadow: var(--md-sys-elevation-level1);
    font-weight: 500;
    visibility: visible !important;
    opacity: 1 !important;
    position: relative !important;
    z-index: 1001 !important;
    pointer-events: auto !important;
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
    transform: translateY(-1px);
  }
  
  .model-selector:active {
    transform: translateY(0);
    box-shadow: var(--md-sys-elevation-level1);
  }

  .model-name {
    font-size: var(--md-sys-typescale-body-medium-size);
    font-weight: var(--md-sys-typescale-title-medium-weight);
    font-family: var(--md-sys-typescale-body-medium-font);
    color: var(--md-sys-color-on-surface);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .model-logo-small {
    width: 16px;
    height: 16px;
    object-fit: contain;
    flex-shrink: 0;
    border-radius: 3px;
  }

  .dropdown-icon {
    color: var(--md-sys-color-on-surface-variant);
    transition: transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
  }
  
  .model-selector[aria-expanded="true"] .dropdown-icon {
    transform: rotate(180deg);
  }

  .model-dropdown {
    position: fixed !important;
    min-width: 240px;
    max-width: 90vw;
    background-color: var(--md-sys-color-surface-container-highest) !important;
    border: 1px solid var(--md-sys-color-outline-variant) !important;
    border-radius: var(--md-sys-shape-corner-medium);
    box-shadow: var(--md-sys-elevation-level4) !important;
    overflow: hidden;
    z-index: 10001 !important;
    animation: dropdownSlideDown var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized);
    backdrop-filter: blur(20px);
    padding: 4px 0;
    visibility: visible !important;
    opacity: 1 !important;
    display: block !important;
    pointer-events: auto !important;
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
    padding: 8px 12px 6px;
    font-size: 10px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface-variant);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin: 4px 0 2px;
    position: relative;
    font-family: var(--md-sys-typescale-label-small-font);
  }
  
  .model-group-header:not(:first-child)::before {
    content: '';
    position: absolute;
    top: 0;
    left: 12px;
    right: 12px;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      var(--md-sys-color-outline-variant) 20%,
      var(--md-sys-color-outline-variant) 80%,
      transparent
    );
  }
  
  .model-group-header.third-party-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    border-radius: var(--md-sys-shape-corner-small);
    margin: 4px 8px 2px;
    padding: 8px 12px;
    background: var(--md-sys-color-surface-container);
  }
  
  .model-group-header.third-party-header:hover {
    background-color: var(--md-sys-color-surface-container-high);
  }
  
  .model-group-header.third-party-header.active {
    background-color: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }
  
  .model-group-header.third-party-header svg {
    transition: transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    color: var(--md-sys-color-primary);
    width: 10px;
    height: 10px;
  }
  
  .model-group-header.third-party-header.active svg {
    color: var(--md-sys-color-on-primary-container);
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
  
  .third-party-submenu {
    position: fixed;
    min-width: 240px;
    background-color: var(--md-sys-color-surface-container-highest);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-medium);
    box-shadow: var(--md-sys-elevation-level5);
    overflow: hidden;
    z-index: 10001;
    animation: dropdownSlideRight var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized);
    backdrop-filter: blur(20px);
    padding: 4px 0;
  }
  
  /* Popup Mobile per AI di terze parti */
  .third-party-popup-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    padding: 20px;
    animation: backdropFadeIn var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
  }
  
  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .third-party-popup {
    background-color: var(--md-sys-color-surface-container-highest);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-extra-large);
    box-shadow: var(--md-sys-elevation-level5);
    width: 100%;
    max-width: 400px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: popupSlideUp var(--md-sys-motion-duration-medium4) var(--md-sys-motion-easing-emphasized);
    z-index: 10003;
  }
  
  @media (max-width: 480px) {
    .third-party-popup-backdrop {
      padding: 16px;
    }
    
    .third-party-popup {
      max-width: 100%;
      border-radius: var(--md-sys-shape-corner-large);
    }
    
    .third-party-popup-header {
      padding: 16px 20px 12px;
    }
    
    .third-party-popup-header h3 {
      font-size: var(--md-sys-typescale-title-medium-size);
    }
  }
  
  @keyframes popupSlideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .third-party-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
  }
  
  .third-party-popup-header h3 {
    font-size: var(--md-sys-typescale-title-large-size);
    font-weight: var(--md-sys-typescale-title-large-weight);
    font-family: var(--md-sys-typescale-title-large-font);
    color: var(--md-sys-color-on-surface);
    margin: 0;
  }
  
  .close-popup-button {
    background: none;
    border: none;
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--md-sys-shape-corner-small);
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    min-width: 40px;
    min-height: 40px;
    touch-action: manipulation;
  }
  
  .close-popup-button:hover {
    background-color: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
  }
  
  .close-popup-button:active {
    transform: scale(0.95);
  }
  
  .third-party-popup-content {
    padding: 8px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    max-height: calc(80vh - 80px);
  }
  
  .third-party-popup-content .model-option {
    margin: 2px 4px;
    padding: 12px 16px;
    min-height: 56px;
    border-radius: var(--md-sys-shape-corner-medium);
  }
  
  .third-party-popup-content .model-info .model-name {
    font-size: var(--md-sys-typescale-body-large-size);
    font-weight: var(--md-sys-typescale-body-large-weight);
  }
  
  .third-party-popup-content .model-description {
    font-size: var(--md-sys-typescale-body-medium-size);
    margin-top: 4px;
  }
  
  @keyframes dropdownSlideRight {
    from {
      opacity: 0;
      transform: translateX(-12px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
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
      transform: translateY(-8px) scale(0.97);
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
    padding: 8px 12px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    color: var(--md-sys-color-on-surface);
    margin: 1px 4px;
    border-radius: var(--md-sys-shape-corner-small);
    position: relative;
  }
  
  .model-option::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 0;
    background: var(--md-sys-color-primary);
    border-radius: 0 1px 1px 0;
    transition: height var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
  }

  .model-option:hover {
    background-color: var(--md-sys-color-surface-container-high);
  }
  
  .model-option:hover::before {
    height: 50%;
  }

  .model-option.selected {
    background-color: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }
  
  .model-option.selected::before {
    height: 70%;
    background: var(--md-sys-color-primary);
  }
  
  .selected-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    animation: checkmarkAppear var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized);
    flex-shrink: 0;
  }
  
  .selected-indicator svg {
    width: 12px;
    height: 12px;
  }
  
  @keyframes checkmarkAppear {
    from {
      opacity: 0;
      transform: scale(0.5) rotate(-90deg);
    }
    to {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
  }

  .model-option.premium {
    position: relative;
  }

  .model-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    position: relative;
  }
  
  .model-option.disabled::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--md-sys-color-surface-container);
    opacity: 0.3;
    border-radius: var(--md-sys-shape-corner-medium);
    pointer-events: none;
  }

  .model-option.disabled:hover {
    background-color: transparent;
    transform: none;
  }
  
  .model-option.disabled:hover::before {
    height: 0;
  }

  .model-info {
    flex: 1;
    min-width: 0;
  }

  .model-info .model-name {
    font-size: 13px;
    font-weight: 500;
    font-family: var(--md-sys-typescale-body-medium-font);
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    line-height: 1.3;
  }

  .model-logo {
    width: 18px;
    height: 18px;
    object-fit: contain;
    flex-shrink: 0;
    border-radius: 4px;
  }

  .premium-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: var(--md-sys-shape-corner-extra-small);
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.1;
    box-shadow: var(--md-sys-elevation-level1);
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
  }

  .premium-badge.premium {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
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
    gap: 3px;
    padding: 2px 5px;
    border-radius: var(--md-sys-shape-corner-extra-small);
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    line-height: 1.1;
    margin-left: 4px;
    background: linear-gradient(135deg, rgba(79, 172, 254, 0.15) 0%, rgba(0, 242, 254, 0.15) 100%);
    border: 1px solid rgba(79, 172, 254, 0.3);
    color: #60a5fa;
  }
  
  .web-search-badge svg {
    width: 9px;
    height: 9px;
  }
  
  
  .feature-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 5px;
    border-radius: var(--md-sys-shape-corner-extra-small);
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    line-height: 1.1;
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    margin-left: 4px;
    color: var(--md-sys-color-on-surface-variant);
  }
  
  .feature-badge svg {
    width: 9px;
    height: 9px;
  }
  
  .model-option.selected .feature-badge {
    background: var(--md-sys-color-primary-container);
    border-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary-container);
  }
  
  .feature-badge svg {
    width: 10px;
    height: 10px;
  }
  
  .vision-badge {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
    border-color: rgba(102, 126, 234, 0.3);
    color: #a78bfa;
  }
  
  .reasoning-badge {
    background: linear-gradient(135deg, rgba(240, 147, 251, 0.15) 0%, rgba(245, 87, 108, 0.15) 100%);
    border-color: rgba(240, 147, 251, 0.3);
    color: #f472b6;
  }
  
  .function-badge {
    background: linear-gradient(135deg, rgba(79, 172, 254, 0.15) 0%, rgba(0, 242, 254, 0.15) 100%);
    border-color: rgba(79, 172, 254, 0.3);
    color: #60a5fa;
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
    font-size: 11px;
    font-weight: 400;
    font-family: var(--md-sys-typescale-body-medium-font);
    color: var(--md-sys-color-on-surface-variant);
    line-height: 1.4;
    margin-top: 2px;
    letter-spacing: 0;
    opacity: 0.8;
  }
  
  .model-option.selected .model-description {
    color: var(--md-sys-color-on-primary-container);
    opacity: 0.85;
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

