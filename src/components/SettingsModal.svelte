<script>
  import { isSettingsOpen } from '../stores/app.js';
  import { selectedModel, availableModels } from '../stores/models.js';
  
  function closeModal() {
    isSettingsOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
</script>

{#if $isSettingsOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Impostazioni</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="settings-section">
          <h3>Modello Predefinito</h3>
          <p class="section-description">Scegli il modello AI da utilizzare per le conversazioni</p>
          <div class="model-list">
            {#each $availableModels as model}
              <label class="model-option">
                <input 
                  type="radio" 
                  name="model" 
                  value={model.id}
                  checked={model.id === $selectedModel}
                  on:change={() => selectedModel.set(model.id)}
                />
                <div class="model-info">
                  <div class="model-name">{model.name}</div>
                  <div class="model-description">{model.description}</div>
                </div>
              </label>
            {/each}
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Informazioni</h3>
          <div class="info-item">
            <span class="info-label">Versione:</span>
            <span class="info-value">Nebula AI 1.0.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">Licenza:</span>
            <span class="info-value">MIT</span>
          </div>
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
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    font-size: 20px;
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
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .settings-section {
    margin-bottom: 32px;
  }

  .settings-section:last-child {
    margin-bottom: 0;
  }

  .settings-section h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
  }

  .section-description {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
  }

  .model-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .model-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .model-option:hover {
    background-color: var(--hover-bg);
    border-color: var(--accent-blue);
  }

  .model-option input[type="radio"] {
    margin: 0;
    cursor: pointer;
  }

  .model-info {
    flex: 1;
  }

  .model-info .model-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .model-info .model-description {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-color);
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-label {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .info-value {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
  }
</style>

