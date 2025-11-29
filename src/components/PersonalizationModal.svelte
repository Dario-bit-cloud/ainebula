<script>
  import { personalization } from '../stores/personalization.js';
  import { isPersonalizationModalOpen } from '../stores/app.js';
  import { get } from 'svelte/store';
  
  let localPrefs = {
    enabled: false,
    baseStyle: 'default',
    customInstructions: '',
    alternativeName: '',
    occupation: ''
  };
  
  let showStyleSuggestions = false;
  
  const styleOptions = [
    { value: 'default', label: 'Predefinita' },
    { value: 'conversational', label: 'Discorsiva' },
    { value: 'witty', label: 'Arguta' },
    { value: 'blunt', label: 'Schietta' },
    { value: 'encouraging', label: 'Incoraggiante' },
    { value: 'genz', label: 'Gen Z' }
  ];
  
  const styleSuggestions = [
    'Discorsiva',
    'Arguta',
    'Schietta',
    'Incoraggiante',
    'Gen Z'
  ];
  
  // Carica le preferenze quando il modal si apre
  $: if ($isPersonalizationModalOpen) {
    const currentPrefs = get(personalization);
    localPrefs = { ...currentPrefs };
  }
  
  function closeModal() {
    isPersonalizationModalOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function handleSave() {
    personalization.set(localPrefs);
    closeModal();
  }
  
  function handleStyleSuggestionClick(suggestion) {
    const styleMap = {
      'Discorsiva': 'conversational',
      'Arguta': 'witty',
      'Schietta': 'blunt',
      'Incoraggiante': 'encouraging',
      'Gen Z': 'genz'
    };
    localPrefs.baseStyle = styleMap[suggestion] || 'default';
    showStyleSuggestions = false;
  }
  
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      closeModal();
      event.preventDefault();
      event.stopPropagation();
    }
  }
</script>

{#if $isPersonalizationModalOpen}
  <div 
    class="personalization-modal" 
    on:click={handleBackdropClick}
    on:keydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="personalization-title"
    tabindex="-1"
  >
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2 id="personalization-title">Personalizzazione</h2>
        <button class="modal-close" on:click={closeModal} aria-label="Chiudi" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- Sezione 1: Abilita personalizzazione -->
        <div class="section">
          <div class="section-header">
            <div class="section-title-group">
              <h3>Abilita personalizzazione</h3>
              <p class="section-description">Personalizza le modalità di risposta di Nebula AI.</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                bind:checked={localPrefs.enabled}
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- Sezione 2: Stile e tono di base -->
        <div class="section">
          <div class="section-header">
            <div class="section-title-group">
              <h3>Stile e tono di base</h3>
              <p class="section-description">Imposta lo stile e il tono che Nebula AI usa quando risponde.</p>
            </div>
            <div class="dropdown-wrapper">
              <select bind:value={localPrefs.baseStyle} class="style-dropdown">
                {#each styleOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- Sezione 3: Istruzioni personalizzate -->
        <div class="section">
          <h3>Istruzioni personalizzate</h3>
          <textarea
            bind:value={localPrefs.customInstructions}
            placeholder="Preferenze aggiuntive relative a comportamento, stile e tono"
            class="custom-instructions-input"
            rows="4"
          ></textarea>
          <div class="suggestions-container">
            {#each styleSuggestions as suggestion}
              <button
                type="button"
                class="suggestion-tag"
                on:click={() => handleStyleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            {/each}
            <button type="button" class="suggestion-tag more" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1"/>
                <circle cx="19" cy="12" r="1"/>
                <circle cx="5" cy="12" r="1"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- Sezione 4: Informazioni su di te -->
        <div class="section">
          <h3>Informazioni su di te</h3>
          
          <div class="info-field">
            <label>Nome alternativo</label>
            <input
              type="text"
              bind:value={localPrefs.alternativeName}
              placeholder="Come deve chiamarti Nebula AI?"
              class="info-input"
            />
          </div>
          
          <div class="info-field">
            <label>Occupazione</label>
            <input
              type="text"
              bind:value={localPrefs.occupation}
              placeholder="Es: Sviluppatore software, Studente, etc."
              class="info-input"
            />
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-btn" on:click={closeModal} type="button">Annulla</button>
        <button class="save-btn" on:click={handleSave} type="button">Salva</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .personalization-modal {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .modal-content {
    background-color: #1a1a1a;
    border-radius: 16px;
    max-width: 640px;
    width: 90%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .modal-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .modal-close:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }
  
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }
  
  .section {
    margin-bottom: 16px;
  }
  
  .section:last-child {
    margin-bottom: 0;
  }
  
  .section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  
  .section-title-group {
    flex: 1;
  }
  
  .section h3 {
    margin: 0 0 3px 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .section-description {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.4;
  }
  
  .divider {
    height: 1px;
    background-color: rgba(255, 255, 255, 0.1);
    margin: 16px 0;
  }
  
  /* Toggle Switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
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
    background-color: rgba(255, 255, 255, 0.2);
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
    background-color: #3b82f6;
  }
  
  .toggle-switch input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }
  
  /* Dropdown */
  .dropdown-wrapper {
    flex-shrink: 0;
  }
  
  .style-dropdown {
    padding: 8px 32px 8px 12px;
    background-color: #16171d;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    cursor: pointer;
    outline: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%23bdbecb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    transition: border-color 0.2s;
  }
  
  .style-dropdown:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .style-dropdown:focus {
    border-color: #3b82f6;
  }
  
  /* Custom Instructions */
  .custom-instructions-input {
    width: 100%;
    padding: 12px;
    background-color: #16171d;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s;
    margin-top: 8px;
  }
  
  .custom-instructions-input:focus {
    border-color: #3b82f6;
  }
  
  .custom-instructions-input::placeholder {
    color: var(--text-secondary);
  }
  
  .suggestions-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  
  .suggestion-tag {
    padding: 6px 12px;
    background-color: #16171d;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .suggestion-tag:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: var(--text-primary);
  }
  
  .suggestion-tag:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Info Fields */
  .info-field {
    margin-bottom: 16px;
  }
  
  .info-field:last-child {
    margin-bottom: 0;
  }
  
  .info-field label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .info-input {
    width: 100%;
    padding: 10px 12px;
    background-color: #16171d;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  
  .info-input:focus {
    border-color: #3b82f6;
  }
  
  .info-input::placeholder {
    color: var(--text-secondary);
  }
  
  /* Footer */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 12px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .cancel-btn,
  .save-btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  
  .cancel-btn {
    background: none;
    color: var(--text-secondary);
  }
  
  .cancel-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }
  
  .save-btn {
    background-color: #3b82f6;
    color: white;
  }
  
  .save-btn:hover {
    background-color: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  .save-btn:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    .personalization-modal {
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    }
    
    .modal-content {
      width: 100%;
      max-width: 100%;
      max-height: 100vh;
      height: 100vh;
      border-radius: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
    }
    
    .modal-header {
      padding: 16px;
      padding-top: calc(16px + env(safe-area-inset-top));
      flex-shrink: 0;
    }
    
    .modal-header h2 {
      font-size: 20px;
    }
    
    .modal-close {
      min-width: 44px;
      min-height: 44px;
      padding: 12px;
    }
    
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }
    
    .section {
      margin-bottom: 20px;
    }
    
    .section-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
    }
    
    .section-title-group {
      width: 100%;
    }
    
    .section h3 {
      font-size: 16px;
    }
    
    .section-description {
      font-size: 13px;
      margin-top: 4px;
    }
    
    .toggle-switch {
      align-self: flex-start;
      width: 48px;
      height: 28px;
    }
    
    .toggle-slider:before {
      height: 22px;
      width: 22px;
    }
    
    .toggle-switch input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }
    
    .dropdown-wrapper {
      width: 100%;
    }
    
    .style-dropdown {
      width: 100%;
      padding: 12px 40px 12px 16px;
      font-size: 15px;
      min-height: 48px;
    }
    
    .custom-instructions-input {
      padding: 14px;
      font-size: 15px;
      min-height: 120px;
      -webkit-appearance: none;
    }
    
    .suggestions-container {
      gap: 10px;
      margin-top: 16px;
    }
    
    .suggestion-tag {
      padding: 10px 16px;
      font-size: 14px;
      min-height: 44px;
      touch-action: manipulation;
    }
    
    .info-input {
      padding: 14px 16px;
      font-size: 15px;
      min-height: 48px;
      -webkit-appearance: none;
    }
    
    .info-field label {
      font-size: 15px;
      margin-bottom: 8px;
    }
    
    .modal-footer {
      padding: 16px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom));
      flex-shrink: 0;
      gap: 12px;
      flex-direction: column-reverse;
    }
    
    .cancel-btn,
    .save-btn {
      width: 100%;
      padding: 14px 20px;
      font-size: 16px;
      min-height: 48px;
      touch-action: manipulation;
    }
    
    .divider {
      margin: 20px 0;
    }
  }
  
  @media (max-width: 480px) {
    .modal-header h2 {
      font-size: 18px;
    }
    
    .section h3 {
      font-size: 15px;
    }
    
    .suggestions-container {
      gap: 8px;
    }
    
    .suggestion-tag {
      padding: 8px 14px;
      font-size: 13px;
    }
  }
</style>

