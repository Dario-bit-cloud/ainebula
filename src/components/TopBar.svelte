<script>
  import { selectedModel, availableModels } from '../stores/models.js';
  import { isGenerating } from '../stores/chat.js';
  import { isSettingsOpen, isSidebarOpen, isMobile } from '../stores/app.js';
  
  let isModelDropdownOpen = false;
  
  function toggleModelDropdown() {
    isModelDropdownOpen = !isModelDropdownOpen;
  }
  
  function selectModel(modelId) {
    selectedModel.set(modelId);
    isModelDropdownOpen = false;
  }
  
  function toggleSettings() {
    isSettingsOpen.update(open => !open);
  }
  
  function toggleSidebar() {
    isSidebarOpen.update(open => !open);
  }
  
  // Chiudi dropdown quando si clicca fuori
  function handleClickOutside(event) {
    if (!event.target.closest('.model-selector-wrapper')) {
      isModelDropdownOpen = false;
    }
  }
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
      <button class="model-selector" on:click={toggleModelDropdown}>
        <span class="model-name">
          {$availableModels.find(m => m.id === $selectedModel)?.name || 'Nebula AI 5.1 Instant'}
        </span>
        <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {#if isModelDropdownOpen}
        <div class="model-dropdown">
          {#each $availableModels as model}
            <button 
              class="model-option" 
              class:selected={model.id === $selectedModel}
              on:click={() => selectModel(model.id)}
            >
              <div class="model-info">
                <div class="model-name">{model.name}</div>
                <div class="model-description">{model.description}</div>
              </div>
              {#if model.id === $selectedModel}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  <div class="right-section">
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
    z-index: 100;
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
    .menu-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
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
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    min-width: 280px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    z-index: 1000;
    animation: dropdownSlideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1);
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

  .model-info {
    flex: 1;
  }

  .model-info .model-name {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 2px;
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
