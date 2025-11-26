<script>
  import { selectedModel, availableModels } from '../stores/models.js';
  import { isGenerating, createNewChat, currentChatId, currentChat } from '../stores/chat.js';
  import { isSettingsOpen, isSidebarOpen, isMobile, isAISettingsModalOpen, isPromptLibraryModalOpen, isPremiumModalOpen } from '../stores/app.js';
  import { user, hasPlanOrHigher } from '../stores/user.js';
  import { isAuthenticatedStore, isLoading } from '../stores/auth.js';
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t } from '../stores/language.js';
  
  const dispatch = createEventDispatcher();
  
  let isTemporaryChatMode = false;
  
  // Aggiorna lo stato del pulsante in base alla chat corrente
  $: {
    const chat = get(currentChat);
    isTemporaryChatMode = chat?.isTemporary === true;
  }
  
  async function toggleTemporaryChat() {
    const currentId = get(currentChatId);
    const chat = get(currentChat);
    
    if (isTemporaryChatMode) {
      // Se la chat corrente è temporanea, crea una nuova chat normale
      await createNewChat(null, false); // false = non temporanea
    } else {
      // Se la chat corrente non è temporanea, crea una nuova chat temporanea
      await createNewChat(null, true); // true = isTemporary
    }
  }
  
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
  <div class="center-section" id="conversation-header-actions">
    <div class="flex items-center justify-center gap-3">
      <div class="flex-shrink-0"></div>
      <div class="flex items-center gap-2">
        <div class="flex items-center">
          <span class="" data-state="closed">
            <button 
              class="temporary-chat-button" 
              aria-label="Attiva chat temporanea"
              on:click={toggleTemporaryChat}
              class:active={isTemporaryChatMode}
              title={isTemporaryChatMode ? "Disattiva chat temporanea" : "Attiva chat temporanea"}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" class="icon">
                <path d="M4.52148 15.1664C4.61337 14.8108 4.39951 14.4478 4.04395 14.3559C3.73281 14.2756 3.41605 14.4295 3.28027 14.7074L3.2334 14.8334C3.13026 15.2324 3.0046 15.6297 2.86133 16.0287L2.71289 16.4281C2.63179 16.6393 2.66312 16.8775 2.79688 17.06C2.93067 17.2424 3.14825 17.3443 3.37402 17.3305L3.7793 17.3002C4.62726 17.2265 5.44049 17.0856 6.23438 16.8764C6.84665 17.1788 7.50422 17.4101 8.19434 17.558C8.55329 17.6348 8.9064 17.4062 8.9834 17.0473C9.06036 16.6882 8.83177 16.3342 8.47266 16.2572C7.81451 16.1162 7.19288 15.8862 6.62305 15.5815C6.50913 15.5206 6.38084 15.4946 6.25391 15.5053L6.12793 15.5277C5.53715 15.6955 4.93256 15.819 4.30566 15.9027C4.33677 15.8053 4.36932 15.7081 4.39844 15.6098L4.52148 15.1664Z"></path>
                <path d="M15.7998 14.5365C15.5786 14.3039 15.2291 14.2666 14.9668 14.4301L14.8604 14.5131C13.9651 15.3633 12.8166 15.9809 11.5273 16.2572C11.1682 16.3342 10.9396 16.6882 11.0166 17.0473C11.0936 17.4062 11.4467 17.6348 11.8057 17.558C13.2388 17.2509 14.5314 16.5858 15.5713 15.6645L15.7754 15.477C16.0417 15.2241 16.0527 14.8028 15.7998 14.5365Z"></path>
                <path d="M2.23828 7.58927C1.97668 8.34847 1.83496 9.15958 1.83496 10.0004C1.835 10.736 1.94324 11.4483 2.14551 12.1234L2.23828 12.4106C2.35793 12.7576 2.73588 12.9421 3.08301 12.8227C3.3867 12.718 3.56625 12.4154 3.52637 12.1088L3.49512 11.977C3.2808 11.3549 3.16508 10.6908 3.16504 10.0004C3.16504 9.30977 3.28072 8.64514 3.49512 8.02286C3.61476 7.67563 3.43024 7.2968 3.08301 7.17716C2.73596 7.05778 2.35799 7.24232 2.23828 7.58927Z"></path>
                <path d="M16.917 12.8227C17.2641 12.9421 17.6421 12.7576 17.7617 12.4106C18.0233 11.6515 18.165 10.8411 18.165 10.0004C18.165 9.15958 18.0233 8.34847 17.7617 7.58927C17.642 7.24231 17.264 7.05778 16.917 7.17716C16.5698 7.2968 16.3852 7.67563 16.5049 8.02286C16.7193 8.64514 16.835 9.30977 16.835 10.0004C16.8349 10.6908 16.7192 11.3549 16.5049 11.977C16.3852 12.3242 16.5698 12.703 16.917 12.8227Z"></path>
                <path d="M8.9834 2.95255C8.90632 2.59374 8.55322 2.3651 8.19434 2.44181C6.76126 2.74892 5.46855 3.41405 4.42871 4.33536L4.22461 4.52286C3.95829 4.77577 3.94729 5.19697 4.2002 5.46329C4.42146 5.69604 4.77088 5.73328 5.0332 5.56973L5.13965 5.4877C6.03496 4.63748 7.18337 4.0189 8.47266 3.74259C8.83177 3.66563 9.06036 3.31166 8.9834 2.95255Z"></path>
                <path d="M15.5713 4.33536C14.5314 3.41405 13.2387 2.74892 11.8057 2.44181C11.4468 2.3651 11.0937 2.59374 11.0166 2.95255C10.9396 3.31166 11.1682 3.66563 11.5273 3.74259C12.7361 4.00163 13.8209 4.56095 14.6895 5.33048L14.8604 5.4877L14.9668 5.56973C15.2291 5.73327 15.5785 5.69604 15.7998 5.46329C16.0211 5.23026 16.0403 4.87903 15.8633 4.6254L15.7754 4.52286L15.5713 4.33536Z"></path>
              </svg>
              {#if isTemporaryChatMode}
                <span class="temporary-badge">Temporanea</span>
              {/if}
            </button>
          </span>
        </div>
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
  
  @media (max-width: 768px) {
    .premium-badge {
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

  .temporary-chat-button {
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: var(--md-sys-shape-corner-medium);
    transition: all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
    position: relative;
    box-shadow: var(--md-sys-elevation-level1);
  }

  .temporary-chat-button:hover {
    background-color: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
    box-shadow: var(--md-sys-elevation-level2);
  }

  .temporary-chat-button.active {
    color: var(--md-sys-color-on-primary-container);
    background-color: var(--md-sys-color-primary-container);
    border: 1px solid var(--md-sys-color-primary);
    box-shadow: var(--md-sys-elevation-level2);
  }

  .temporary-chat-button.active:hover {
    background-color: var(--md-sys-color-primary-container);
    box-shadow: var(--md-sys-elevation-level3);
  }

  .temporary-chat-button svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .temporary-badge {
    font-size: var(--md-sys-typescale-label-small-size);
    font-weight: var(--md-sys-typescale-label-small-weight);
    font-family: var(--md-sys-typescale-label-small-font);
    color: var(--md-sys-color-primary);
    white-space: nowrap;
    animation: fadeInScale var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
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

