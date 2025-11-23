<script>
  import { promptTemplates, savedPrompts, savePrompt, deletePrompt, fillPromptTemplate } from '../stores/promptLibrary.js';
  import { isPromptLibraryModalOpen } from '../stores/app.js';
  import { isMobile } from '../stores/app.js';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let selectedCategory = 'Tutti';
  let searchTerm = '';
  let showAddPrompt = false;
  let newPrompt = {
    name: '',
    category: 'Personalizzato',
    prompt: '',
    tags: []
  };
  
  const categories = ['Tutti', 'Sviluppo', 'Comunicazione', 'Educazione', 'Creatività', 'Business', 'Produttività', 'Linguistica', 'Scrittura', 'Personalizzato'];
  
  $: filteredTemplates = $promptTemplates.filter(t => {
    const matchesCategory = selectedCategory === 'Tutti' || t.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });
  
  $: filteredSaved = $savedPrompts.filter(p => {
    const matchesCategory = selectedCategory === 'Personalizzato';
    const matchesSearch = searchTerm === '' || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  function closeModal() {
    isPromptLibraryModalOpen.set(false);
    showAddPrompt = false;
    resetNewPrompt();
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function usePrompt(template) {
    dispatch('select', template);
    closeModal();
  }
  
  function resetNewPrompt() {
    newPrompt = {
      name: '',
      category: 'Personalizzato',
      prompt: '',
      tags: []
    };
  }
  
  function handleSavePrompt() {
    if (newPrompt.name && newPrompt.prompt) {
      savePrompt(newPrompt);
      resetNewPrompt();
      showAddPrompt = false;
    }
  }
  
  function handleDeleteSaved(id) {
    if (confirm('Sei sicuro di voler eliminare questo prompt personalizzato?')) {
      deletePrompt(id);
    }
  }
</script>

{#if $isPromptLibraryModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content" class:modal-mobile={$isMobile}>
      <div class="modal-header">
        <h2>Libreria Prompt</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="search-bar">
          <input
            type="text"
            class="search-input"
            placeholder="Cerca prompt..."
            bind:value={searchTerm}
          />
        </div>
        
        <div class="categories">
          {#each categories as category}
            <button
              class="category-button"
              class:active={selectedCategory === category}
              on:click={() => selectedCategory = category}
            >
              {category}
            </button>
          {/each}
        </div>
        
        {#if !showAddPrompt}
          <button class="add-prompt-button" on:click={() => showAddPrompt = true}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Aggiungi Prompt Personalizzato
          </button>
        {/if}
        
        {#if showAddPrompt}
          <div class="add-prompt-form">
            <h3>Nuovo Prompt Personalizzato</h3>
            <input
              type="text"
              class="form-input"
              placeholder="Nome prompt"
              bind:value={newPrompt.name}
            />
            <textarea
              class="form-textarea"
              placeholder="Contenuto del prompt (usa {nome_variabile} per variabili dinamiche)"
              bind:value={newPrompt.prompt}
              rows="6"
            ></textarea>
            <div class="form-actions">
              <button class="cancel-btn" on:click={() => { showAddPrompt = false; resetNewPrompt(); }}>
                Annulla
              </button>
              <button class="save-btn" on:click={handleSavePrompt}>
                Salva
              </button>
            </div>
          </div>
        {/if}
        
        <div class="prompts-list">
          <h3>Templates Predefiniti</h3>
          {#if filteredTemplates.length > 0}
            {#each filteredTemplates as template}
              <div class="prompt-card" on:click={() => usePrompt(template)}>
                <div class="prompt-header">
                  <h4>{template.name}</h4>
                  <span class="prompt-category">{template.category}</span>
                </div>
                <p class="prompt-preview">{template.prompt.substring(0, 150)}...</p>
                <div class="prompt-tags">
                  {#each template.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
                <button class="use-button">Usa questo prompt</button>
              </div>
            {/each}
          {:else}
            <p class="empty-state">Nessun template trovato</p>
          {/if}
          
          {#if selectedCategory === 'Personalizzato' && filteredSaved.length > 0}
            <h3>I Tuoi Prompt</h3>
            {#each filteredSaved as prompt}
              <div class="prompt-card">
                <div class="prompt-header">
                  <h4>{prompt.name}</h4>
                  <button class="delete-button" on:click={() => handleDeleteSaved(prompt.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
                <p class="prompt-preview">{prompt.prompt.substring(0, 150)}...</p>
                <button class="use-button" on:click={() => usePrompt(prompt)}>Usa questo prompt</button>
              </div>
            {/each}
          {/if}
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
    animation: backdropFadeIn 0.3s ease;
  }

  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.4s ease;
  }

  @keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.95) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
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
    transition: color 0.2s;
  }

  .close-button:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: 24px;
    flex: 1;
    overflow-y: auto;
  }

  .search-bar {
    margin-bottom: 20px;
  }

  .search-input {
    width: 100%;
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
  }

  .categories {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }

  .category-button {
    padding: 6px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  .category-button:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .category-button.active {
    background-color: var(--accent-blue);
    color: white;
    border-color: var(--accent-blue);
  }

  .add-prompt-button {
    width: 100%;
    padding: 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
    transition: all 0.2s;
  }

  .add-prompt-button:hover {
    background-color: var(--hover-bg);
    border-color: var(--accent-blue);
  }

  .add-prompt-form {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .add-prompt-form h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 16px;
    color: var(--text-primary);
  }

  .form-input,
  .form-textarea {
    width: 100%;
    padding: 10px 12px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    margin-bottom: 12px;
    outline: none;
  }

  .form-textarea {
    resize: vertical;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .cancel-btn,
  .save-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .cancel-btn {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .save-btn {
    background-color: var(--accent-blue);
    color: white;
  }

  .save-btn:hover {
    background-color: #2563eb;
  }

  .prompts-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .prompts-list h3 {
    font-size: 16px;
    color: var(--text-primary);
    margin: 16px 0 8px 0;
  }

  .prompt-card {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .prompt-card:hover {
    border-color: var(--accent-blue);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .prompt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .prompt-header h4 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary);
  }

  .prompt-category {
    font-size: 12px;
    color: var(--text-secondary);
    background-color: var(--bg-secondary);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .prompt-preview {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 12px;
    line-height: 1.5;
  }

  .prompt-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .tag {
    font-size: 11px;
    color: var(--accent-blue);
    background-color: rgba(59, 130, 246, 0.1);
    padding: 3px 8px;
    border-radius: 4px;
  }

  .use-button {
    width: 100%;
    padding: 8px;
    background-color: var(--accent-blue);
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  }

  .use-button:hover {
    background-color: #2563eb;
  }

  .delete-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    transition: color 0.2s;
  }

  .delete-button:hover {
    color: #ef4444;
  }

  .empty-state {
    text-align: center;
    color: var(--text-secondary);
    padding: 40px;
  }

  @media (max-width: 768px) {
    .modal-content.modal-mobile {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
      height: 100vh;
    }
    .modal-header, .modal-body {
      padding: 16px;
    }
  }
</style>

