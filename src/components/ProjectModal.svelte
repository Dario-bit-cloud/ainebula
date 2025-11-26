<script>
  import { isProjectModalOpen } from '../stores/app.js';
  import { showAlert } from '../services/dialogService.js';
  import { projects, createProject } from '../stores/projects.js';
  
  let projectName = '';
  let projectDescription = '';
  let selectedColor = '#3b82f6';
  let selectedIcon = 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z';
  let isCreating = false;
  
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];
  
  const icons = [
    { name: 'Cartella', path: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { name: 'Stella', path: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { name: 'Impostazioni', path: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
    { name: 'Appunti', path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { name: 'Orologio', path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Cuore', path: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { name: 'Lampadina', path: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { name: 'Rocket', path: 'M13 10V3L4 14h7v7l9-11h-7z' }
  ];
  
  function closeModal() {
    isProjectModalOpen.set(false);
    projectName = '';
    projectDescription = '';
    selectedColor = '#3b82f6';
    selectedIcon = icons[0].path;
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  async function handleCreateProject() {
    if (!projectName.trim()) {
      await showAlert('Inserisci un nome per la cartella', 'Nome mancante', 'OK', 'warning');
      return;
    }
    
    isCreating = true;
    try {
      await createProject(projectName.trim(), projectDescription.trim(), selectedColor, selectedIcon);
      closeModal();
    } catch (error) {
      console.error('Errore creazione progetto:', error);
      await showAlert('Errore durante la creazione della cartella', 'Errore', 'OK', 'danger');
    } finally {
      isCreating = false;
    }
  }
</script>

{#if $isProjectModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Nuova Cartella</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-section">
          <label class="form-label">Nome cartella</label>
          <input 
            type="text"
            class="form-input"
            placeholder="Es: Progetto Marketing"
            bind:value={projectName}
            on:keydown={(e) => e.key === 'Enter' && handleCreateProject()}
          />
        </div>
        
        <div class="form-section">
          <label class="form-label">Descrizione (opzionale)</label>
          <textarea 
            class="form-textarea"
            placeholder="Aggiungi una descrizione..."
            bind:value={projectDescription}
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-section">
          <label class="form-label">Colore</label>
          <div class="color-picker">
            {#each colors as color}
              <button
                class="color-option"
                class:selected={selectedColor === color}
                style="background-color: {color}"
                on:click={() => selectedColor = color}
                title={color}
              ></button>
            {/each}
          </div>
        </div>
        
        <div class="form-section">
          <label class="form-label">Icona</label>
          <div class="icon-picker">
            {#each icons as icon}
              <button
                class="icon-option"
                class:selected={selectedIcon === icon.path}
                on:click={() => selectedIcon = icon.path}
                title={icon.name}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d={icon.path}/>
                </svg>
              </button>
            {/each}
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-button" on:click={closeModal}>Annulla</button>
        <button class="create-button" on:click={handleCreateProject} disabled={isCreating || !projectName.trim()}>
          Crea cartella
        </button>
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
    background-color: rgba(0, 0, 0, 0);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes backdropFadeIn {
    to {
      background-color: rgba(0, 0, 0, 0.7);
    }
  }

  .modal-content {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
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

  .form-section {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
  }

  .form-input:focus,
  .form-textarea:focus {
    border-color: var(--accent-blue);
  }

  .form-textarea {
    resize: vertical;
  }

  .color-picker {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .color-option {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
  }

  .color-option:hover {
    transform: scale(1.1);
  }

  .color-option.selected {
    border-color: var(--text-primary);
    box-shadow: 0 0 0 2px var(--bg-secondary);
  }

  .icon-picker {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .icon-option {
    width: 48px;
    height: 48px;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .icon-option:hover {
    border-color: var(--accent-blue);
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .icon-option.selected {
    border-color: var(--accent-blue);
    background-color: rgba(59, 130, 246, 0.1);
    color: var(--accent-blue);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid var(--border-color);
  }

  .cancel-button,
  .create-button {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .cancel-button {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .cancel-button:hover {
    background-color: var(--hover-bg);
  }

  .create-button {
    background-color: var(--accent-blue);
    color: white;
  }

  .create-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .create-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
