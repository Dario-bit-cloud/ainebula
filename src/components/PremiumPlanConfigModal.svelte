<script>
  import { onMount } from 'svelte';
  import { showAlert } from '../services/dialogService.js';
  
  export let isOpen = false;
  export let onClose = () => {};
  export let onSave = (config) => {};
  
  // Dati del piano
  let planName = 'Nebula Premium';
  let monthlyPrice = 5;
  let description = '';
  let coverImage = null;
  let coverImagePreview = null;
  let benefits = [];
  let freeTrialEnabled = false;
  let freeTrialDays = 7;
  let showAdvancedOptions = false;
  
  // Editor di testo ricco (semplificato)
  let isEditingDescription = false;
  
  // Gestione benefit
  let newBenefit = '';
  
  function addBenefit() {
    if (newBenefit.trim()) {
      benefits = [...benefits, newBenefit.trim()];
      newBenefit = '';
    }
  }
  
  function removeBenefit(index) {
    benefits = benefits.filter((_, i) => i !== index);
  }
  
  function handleCoverImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        coverImage = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          coverImagePreview = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        showAlert('Per favore seleziona un file immagine', 'Formato non valido', 'OK', 'error');
      }
    }
  }
  
  function removeCoverImage() {
    coverImage = null;
    coverImagePreview = null;
  }
  
  function toggleFreeTrial() {
    freeTrialEnabled = !freeTrialEnabled;
  }
  
  function handleSave() {
    const config = {
      name: planName,
      monthlyPrice: monthlyPrice,
      description: description,
      coverImage: coverImage,
      coverImagePreview: coverImagePreview,
      benefits: benefits,
      freeTrial: {
        enabled: freeTrialEnabled,
        days: freeTrialDays
      }
    };
    
    onSave(config);
    onClose();
  }
  
  function handleClose() {
    onClose();
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" role="button" tabindex="-1" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && handleClose()}>
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="plan-config-title">
      <div class="modal-header">
        <h2 id="plan-config-title">Nuovo livello</h2>
        <button class="close-button" on:click={handleClose} aria-label="Chiudi">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- Personalizza livello -->
        <div class="config-section">
          <h3 class="section-title">Personalizza livello</h3>
          
          <!-- Nome -->
          <div class="form-group">
            <label for="plan-name" class="form-label">Nome</label>
            <input
              id="plan-name"
              type="text"
              class="form-input"
              bind:value={planName}
              placeholder="Nebula Premium"
            />
          </div>
          
          <!-- Prezzo mensile -->
          <div class="form-group">
            <label for="monthly-price" class="form-label">Prezzo mensile</label>
            <div class="price-input-group">
              <input
                id="monthly-price"
                type="number"
                class="form-input"
                bind:value={monthlyPrice}
                min="0"
                step="0.01"
                placeholder="5"
              />
              <span class="currency">€</span>
              <button class="icon-button" type="button" title="Visualizza dettagli prezzo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Descrizione livello -->
          <div class="form-group">
            <label for="plan-description" class="form-label">Descrizione livello (opzionale)</label>
            <div class="rich-text-editor">
              <div class="editor-toolbar">
                <button type="button" class="toolbar-button" title="Codice">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 18 22 12 16 6"/>
                    <polyline points="8 6 2 12 8 18"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Paragrafo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"/>
                    <line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/>
                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Grassetto">
                  <strong>B</strong>
                </button>
                <button type="button" class="toolbar-button" title="Corsivo">
                  <em>I</em>
                </button>
                <button type="button" class="toolbar-button" title="Barrato">
                  <s>S</s>
                </button>
                <button type="button" class="toolbar-button" title="Elenco puntato">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Elenco numerato">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="6" y1="6" x2="20" y2="6"/>
                    <line x1="6" y1="12" x2="20" y2="12"/>
                    <line x1="6" y1="18" x2="20" y2="18"/>
                    <line x1="2" y1="6" x2="4" y2="6"/>
                    <line x1="2" y1="12" x2="4" y2="12"/>
                    <line x1="2" y1="18" x2="4" y2="18"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Allinea a sinistra">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="21" y1="10" x2="7" y2="10"/>
                    <line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/>
                    <line x1="21" y1="18" x2="7" y2="18"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Centra">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="10" x2="6" y2="10"/>
                    <line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/>
                    <line x1="18" y1="18" x2="6" y2="18"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Allinea a destra">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="14" x2="21" y2="14"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Giustifica">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="21" y1="10" x2="3" y2="10"/>
                    <line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/>
                    <line x1="21" y1="18" x2="3" y2="18"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Immagine">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Video">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </button>
                <button type="button" class="toolbar-button" title="Altre opzioni">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
              <textarea
                id="plan-description"
                class="editor-textarea"
                bind:value={description}
                placeholder="Descrivi i benefit e i contenuti esclusivi che le persone possono aspettarsi di ottenere iscrivendosi."
                rows="6"
              ></textarea>
            </div>
          </div>
          
          <!-- Immagine di copertina -->
          <div class="form-group">
            <label class="form-label">Immagine di copertina (opzionale)</label>
            {#if coverImagePreview}
              <div class="cover-image-preview">
                <img src={coverImagePreview} alt="Anteprima copertina" />
                <button type="button" class="remove-image-button" on:click={removeCoverImage}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            {:else}
              <label for="cover-image-upload" class="cover-image-upload-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Aggiungi immagine di copertina</span>
              </label>
              <input
                id="cover-image-upload"
                type="file"
                accept="image/*"
                on:change={handleCoverImageUpload}
                style="display: none;"
              />
            {/if}
            <p class="image-recommendation">Dimensioni consigliate: 460 x 200 pixel</p>
          </div>
        </div>
        
        <!-- Benefit del livello -->
        <div class="config-section">
          <h3 class="section-title">Benefit del livello (opzionale)</h3>
          <p class="section-description">Fai sapere ai tuoi membri cosa possono aspettarsi di ricevere con questo livello di abbonamento</p>
          
          <div class="benefits-list">
            {#each benefits as benefit, index}
              <div class="benefit-item">
                <span>{benefit}</span>
                <button type="button" class="remove-benefit-button" on:click={() => removeBenefit(index)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            {/each}
          </div>
          
          <div class="add-benefit-group">
            <input
              type="text"
              class="form-input"
              bind:value={newBenefit}
              placeholder="Aggiungi un benefit"
              on:keydown={(e) => e.key === 'Enter' && addBenefit()}
            />
            <button type="button" class="add-benefit-button" on:click={addBenefit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Aggiungi benefit</span>
            </button>
          </div>
        </div>
        
        <!-- Prova gratuita -->
        <div class="config-section">
          <h3 class="section-title">Prova gratuita</h3>
          <div class="free-trial-toggle">
            <p>Consenti ai membri di provare questo livello per {freeTrialDays} giorni prima che inizino a pagarlo.</p>
            <label class="toggle-switch">
              <input type="checkbox" bind:checked={freeTrialEnabled} on:change={toggleFreeTrial} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <!-- Opzioni avanzate -->
        <div class="config-section">
          <button type="button" class="advanced-options-button" on:click={() => showAdvancedOptions = !showAdvancedOptions}>
            <span>Opzioni avanzate</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class:rotated={showAdvancedOptions}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          
          {#if showAdvancedOptions}
            <div class="advanced-options-content">
              <p class="section-description">Opzioni avanzate per la configurazione del piano verranno aggiunte qui.</p>
            </div>
          {/if}
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="cancel-button" on:click={handleClose}>Annulla</button>
        <button type="button" class="save-button" on:click={handleSave}>Salva</button>
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
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    padding: 20px;
  }
  
  .modal-content {
    background-color: var(--bg-secondary, #1a1a1a);
    border: 1px solid var(--border-color, #333);
    border-radius: 12px;
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
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
    border-bottom: 1px solid var(--border-color, #333);
  }
  
  .modal-header h2 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary, #fff);
    margin: 0;
  }
  
  .close-button {
    background: none;
    border: none;
    color: var(--text-primary, #fff);
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .close-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .modal-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }
  
  .config-section {
    background-color: var(--bg-tertiary, #252525);
    border: 1px solid var(--border-color, #333);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }
  
  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #fff);
    margin: 0 0 16px 0;
  }
  
  .section-description {
    font-size: 14px;
    color: var(--text-secondary, #999);
    margin: 0 0 16px 0;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #fff);
    margin-bottom: 8px;
  }
  
  .form-input {
    width: 100%;
    padding: 10px 12px;
    background-color: var(--bg-secondary, #1a1a1a);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    color: var(--text-primary, #fff);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  
  .form-input:focus {
    border-color: var(--accent-blue, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .price-input-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .price-input-group .form-input {
    flex: 1;
  }
  
  .currency {
    font-size: 16px;
    color: var(--text-primary, #fff);
  }
  
  .icon-button {
    background: none;
    border: none;
    color: var(--text-secondary, #999);
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.2s;
  }
  
  .icon-button:hover {
    color: var(--text-primary, #fff);
  }
  
  .rich-text-editor {
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    overflow: hidden;
  }
  
  .editor-toolbar {
    display: flex;
    gap: 4px;
    padding: 8px;
    background-color: var(--bg-secondary, #1a1a1a);
    border-bottom: 1px solid var(--border-color, #333);
    flex-wrap: wrap;
  }
  
  .toolbar-button {
    background: none;
    border: none;
    color: var(--text-secondary, #999);
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
    font-size: 14px;
  }
  
  .toolbar-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text-primary, #fff);
  }
  
  .editor-textarea {
    width: 100%;
    padding: 12px;
    background-color: var(--bg-secondary, #1a1a1a);
    border: none;
    color: var(--text-primary, #fff);
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    min-height: 120px;
  }
  
  .cover-image-upload-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background-color: var(--bg-secondary, #1a1a1a);
    border: 1px dashed var(--border-color, #333);
    border-radius: 6px;
    color: var(--text-primary, #fff);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cover-image-upload-button:hover {
    border-color: var(--accent-blue, #3b82f6);
    background-color: rgba(59, 130, 246, 0.1);
  }
  
  .cover-image-preview {
    position: relative;
    margin-bottom: 8px;
  }
  
  .cover-image-preview img {
    width: 100%;
    max-height: 200px;
    object-fit: cover;
    border-radius: 6px;
  }
  
  .remove-image-button {
    position: absolute;
    top: 8px;
    right: 8px;
    background-color: rgba(0, 0, 0, 0.7);
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }
  
  .remove-image-button:hover {
    background-color: rgba(0, 0, 0, 0.9);
  }
  
  .image-recommendation {
    font-size: 12px;
    color: var(--text-secondary, #999);
    margin: 8px 0 0 0;
  }
  
  .benefits-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .benefit-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background-color: var(--bg-secondary, #1a1a1a);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    color: var(--text-primary, #fff);
  }
  
  .remove-benefit-button {
    background: none;
    border: none;
    color: var(--text-secondary, #999);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.2s;
  }
  
  .remove-benefit-button:hover {
    color: var(--text-primary, #fff);
  }
  
  .add-benefit-group {
    display: flex;
    gap: 8px;
  }
  
  .add-benefit-group .form-input {
    flex: 1;
  }
  
  .add-benefit-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background-color: var(--accent-blue, #3b82f6);
    border: none;
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .add-benefit-button:hover {
    background-color: #2563eb;
  }
  
  .free-trial-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background-color: var(--bg-secondary, #1a1a1a);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
  }
  
  .free-trial-toggle p {
    margin: 0;
    font-size: 14px;
    color: var(--text-primary, #fff);
    flex: 1;
  }
  
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
  }
  
  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #555;
    transition: 0.3s;
    border-radius: 24px;
  }
  
  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
  
  .toggle-switch input:checked + .toggle-slider {
    background-color: var(--accent-blue, #3b82f6);
  }
  
  .toggle-switch input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }
  
  .advanced-options-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: none;
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    color: var(--text-primary, #fff);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .advanced-options-button:hover {
    background-color: var(--bg-secondary, #1a1a1a);
  }
  
  .advanced-options-button svg {
    transition: transform 0.2s;
  }
  
  .advanced-options-button svg.rotated {
    transform: rotate(180deg);
  }
  
  .advanced-options-content {
    margin-top: 16px;
    padding: 16px;
    background-color: var(--bg-secondary, #1a1a1a);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid var(--border-color, #333);
  }
  
  .cancel-button,
  .save-button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-button {
    background-color: var(--bg-tertiary, #252525);
    color: var(--text-primary, #fff);
    border: 1px solid var(--border-color, #333);
  }
  
  .cancel-button:hover {
    background-color: var(--bg-secondary, #1a1a1a);
  }
  
  .save-button {
    background-color: var(--accent-blue, #3b82f6);
    color: #fff;
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

    .modal-content {
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

    input, textarea, select {
      font-size: 16px !important;
      min-height: 48px !important;
      padding: 14px 16px !important;
    }
  }
</style>

