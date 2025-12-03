<script>
  import { aiSettings, presetPrompts, loadPreset } from '../stores/aiSettings.js';
  import { isAISettingsModalOpen } from '../stores/app.js';
  import { isMobile } from '../stores/app.js';
  
  let localSettings = {
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0
  };
  
  // Carica le impostazioni dallo store quando il modal si apre
  $: if ($isAISettingsModalOpen) {
    const unsubscribe = aiSettings.subscribe(settings => {
      if (settings && settings.systemPrompt !== undefined) {
        localSettings = { ...settings };
      }
    });
    // Unsubscribe dopo il primo valore
    unsubscribe();
  }
  
  function closeModal() {
    isAISettingsModalOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function saveSettings() {
    aiSettings.set({ ...localSettings });
    closeModal();
  }
  
  function loadPresetPrompt(key) {
    loadPreset(key);
    // Aggiorna localSettings direttamente
    const preset = presetPrompts[key];
    if (preset) {
      localSettings.systemPrompt = preset.prompt;
    }
  }
</script>

{#if $isAISettingsModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content" class:modal-mobile={$isMobile}>
      <div class="modal-header">
        <h2>Impostazioni AI</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="settings-section">
          <h3>System Prompt</h3>
          <p class="section-description">Definisci il comportamento e la personalità dell'AI</p>
          
          <div class="preset-buttons">
            {#each Object.entries(presetPrompts) as [key, preset]}
              <button class="preset-button" on:click={() => loadPresetPrompt(key)}>
                {preset.name}
              </button>
            {/each}
          </div>
          
          <textarea
            class="prompt-input"
            bind:value={localSettings.systemPrompt}
            placeholder="Sei Nebula AI, un assistente AI utile, amichevole e professionale..."
            rows="6"
          ></textarea>
        </div>

        <div class="settings-section">
          <h3>Parametri di Generazione</h3>
          
          <div class="param-group">
            <label>
              <span>Temperature: {localSettings.temperature}</span>
              <span class="param-description">Controlla la creatività (0.0 = deterministico, 2.0 = molto creativo)</span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              bind:value={localSettings.temperature}
            />
          </div>

          <div class="param-group">
            <label>
              <span>Max Tokens: {localSettings.maxTokens}</span>
              <span class="param-description">Numero massimo di token nella risposta</span>
            </label>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              bind:value={localSettings.maxTokens}
            />
          </div>

          <div class="param-group">
            <label>
              <span>Top P: {localSettings.topP}</span>
              <span class="param-description">Controlla la diversità (0.0-1.0)</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              bind:value={localSettings.topP}
            />
          </div>

          <div class="param-group">
            <label>
              <span>Frequency Penalty: {localSettings.frequencyPenalty}</span>
              <span class="param-description">Riduce la ripetizione (-2.0 a 2.0)</span>
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              bind:value={localSettings.frequencyPenalty}
            />
          </div>

          <div class="param-group">
            <label>
              <span>Presence Penalty: {localSettings.presencePenalty}</span>
              <span class="param-description">Incoraggia nuovi argomenti (-2.0 a 2.0)</span>
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              bind:value={localSettings.presencePenalty}
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-button" on:click={closeModal}>Annulla</button>
        <button class="save-button" on:click={saveSettings}>Salva</button>
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
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.95) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .close-button:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: 16px 20px;
    flex: 1;
    overflow-y: auto;
    color: var(--text-primary);
  }

  .settings-section {
    margin-bottom: 16px;
  }

  .settings-section h3 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--text-primary);
  }

  .section-description {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 10px;
  }

  .preset-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .preset-button {
    padding: 5px 10px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .preset-button:hover {
    background-color: var(--hover-bg);
    border-color: var(--accent-blue);
  }

  .prompt-input {
    width: 100%;
    min-height: 100px;
    padding: 10px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 13px;
    resize: vertical;
  }

  .param-group {
    margin-bottom: 14px;
  }

  .param-group label {
    display: block;
    margin-bottom: 6px;
  }

  .param-group label > span:first-child {
    display: block;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .param-description {
    display: block;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .param-group input[type="range"] {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--bg-tertiary);
    outline: none;
    -webkit-appearance: none;
  }

  .param-group input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent-blue);
    cursor: pointer;
  }

  .param-group input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent-blue);
    cursor: pointer;
    border: none;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 12px 20px;
    border-top: 1px solid var(--border-color);
  }

  .cancel-button,
  .save-button {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-button {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .cancel-button:hover {
    background-color: var(--hover-bg);
  }

  .save-button {
    background-color: var(--accent-blue);
    color: white;
  }

  .save-button:hover {
    background-color: #2563eb;
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 0;
      align-items: flex-end;
      background-color: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .modal-content,
    .modal-content.modal-mobile {
      max-width: 100% !important;
      width: 100% !important;
      max-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom)) !important;
      height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom)) !important;
      border-radius: 20px 20px 0 0 !important;
      margin: 0 !important;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3) !important;
      animation: modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      padding: calc(16px + env(safe-area-inset-top)) env(safe-area-inset-left) 16px env(safe-area-inset-right) !important;
    }

    .modal-body {
      padding: 16px env(safe-area-inset-left) calc(16px + env(safe-area-inset-bottom)) env(safe-area-inset-right) !important;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .modal-footer {
      padding: 16px env(safe-area-inset-left) calc(16px + env(safe-area-inset-bottom)) env(safe-area-inset-right) !important;
      flex-direction: column-reverse;
      gap: 10px;
    }

    .cancel-button,
    .save-button {
      width: 100%;
      min-height: 48px !important;
      font-size: 15px !important;
      touch-action: manipulation;
    }
  }
</style>

