<script>
  import { isProjectModalOpen } from '../stores/app.js';
  import { projects, createProject } from '../stores/projects.js';
  
  let projectName = '';
  let projectDescription = '';
  let isCreating = false;
  
  function closeModal() {
    isProjectModalOpen.set(false);
    projectName = '';
    projectDescription = '';
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function handleCreateProject() {
    if (!projectName.trim()) {
      alert('Inserisci un nome per il progetto');
      return;
    }
    
    isCreating = true;
    createProject(projectName.trim(), projectDescription.trim());
    isCreating = false;
    closeModal();
  }
</script>

{#if $isProjectModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Nuovo Progetto</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-section">
          <label class="form-label">Nome progetto</label>
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
        
        {#if $projects.length > 0}
          <div class="projects-list">
            <h3>Progetti esistenti</h3>
            {#each $projects as project}
              <div class="project-item">
                <div class="project-info">
                  <div class="project-name">{project.name}</div>
                  {#if project.description}
                    <div class="project-description">{project.description}</div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button class="cancel-button" on:click={closeModal}>Annulla</button>
        <button class="create-button" on:click={handleCreateProject} disabled={isCreating || !projectName.trim()}>
          Crea progetto
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

  .projects-list {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--border-color);
  }

  .projects-list h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
  }

  .project-item {
    padding: 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    margin-bottom: 8px;
  }

  .project-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .project-description {
    font-size: 12px;
    color: var(--text-secondary);
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

