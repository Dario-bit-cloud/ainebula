<script>
  import { promptTemplates, savedPrompts, savePrompt, updatePrompt, deletePrompt, duplicatePrompt, fillPromptTemplate, extractVariables, incrementUsageCount, exportPrompts, importPrompts } from '../stores/promptLibrary.js';
  import { isPromptLibraryModalOpen, selectedPrompt } from '../stores/app.js';
  import { isMobile } from '../stores/app.js';
  import { createEventDispatcher } from 'svelte';
  import { showConfirm, showAlert, showPrompt } from '../services/dialogService.js';
  
  const dispatch = createEventDispatcher();
  
  let selectedCategory = 'Tutti';
  let searchTerm = '';
  let showAddPrompt = false;
  let editingPromptId = null;
  let viewingPrompt = null;
  let sortBy = 'name'; // 'name', 'usage', 'date'
  let showVariablesDialog = false;
  let variablesToFill = {};
  let promptWithVariables = null;
  
  let newPrompt = {
    name: '',
    category: 'Personalizzato',
    prompt: '',
    tags: [],
    description: ''
  };
  
  const categories = ['Tutti', 'Sviluppo', 'Comunicazione', 'Educazione', 'Creatività', 'Business', 'Produttività', 'Linguistica', 'Scrittura', 'Personalizzato'];
  const promptPlaceholder = 'Contenuto del prompt (usa {nome_variabile} per variabili dinamiche)';
  
  $: allPrompts = [...$promptTemplates, ...$savedPrompts];
  
  $: filteredPrompts = allPrompts.filter(p => {
    const matchesCategory = selectedCategory === 'Tutti' || 
      (selectedCategory === 'Personalizzato' ? $savedPrompts.includes(p) : p.category === selectedCategory);
    const matchesSearch = searchTerm === '' || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'usage') {
      return (b.usageCount || 0) - (a.usageCount || 0);
    } else if (sortBy === 'date') {
      const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return bDate - aDate;
    } else {
      return (a.name || '').localeCompare(b.name || '');
    }
  });
  
  $: templatesCount = filteredPrompts.filter(p => $promptTemplates.includes(p)).length;
  $: savedCount = filteredPrompts.filter(p => $savedPrompts.includes(p)).length;
  
  function closeModal() {
    isPromptLibraryModalOpen.set(false);
    showAddPrompt = false;
    editingPromptId = null;
    viewingPrompt = null;
    resetNewPrompt();
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !showVariablesDialog) {
      closeModal();
    }
  }
  
  async function usePrompt(prompt) {
    const variables = extractVariables(prompt.prompt || '');
    
    if (variables.length > 0) {
      // Chiedi i valori delle variabili
      promptWithVariables = prompt;
      variablesToFill = {};
      showVariablesDialog = true;
    } else {
      // Usa direttamente il prompt
      await applyPrompt(prompt);
    }
  }
  
  async function applyPrompt(prompt) {
    let finalPrompt = prompt.prompt || '';
    
    // Se ci sono variabili da riempire, compila il template
    if (Object.keys(variablesToFill).length > 0) {
      finalPrompt = fillPromptTemplate(prompt, variablesToFill);
    }
    
    // Incrementa contatore utilizzo
    incrementUsageCount(prompt.id);
    
    // Invia il prompt
    dispatch('select', { ...prompt, prompt: finalPrompt });
    closeModal();
  }
  
  async function fillVariables() {
    if (!promptWithVariables) return;
    
    // Verifica che tutte le variabili siano compilate
    const variables = extractVariables(promptWithVariables.prompt || '');
    const missing = variables.filter(v => !variablesToFill[v] || !variablesToFill[v].trim());
    
    if (missing.length > 0) {
      showAlert(`Compila tutte le variabili. Mancano: ${missing.join(', ')}`, 'Attenzione', 'OK', 'warning');
      return;
    }
    
    await applyPrompt(promptWithVariables);
    showVariablesDialog = false;
    promptWithVariables = null;
    variablesToFill = {};
  }
  
  function resetNewPrompt() {
    newPrompt = {
      name: '',
      category: 'Personalizzato',
      prompt: '',
      tags: [],
      description: ''
    };
  }
  
  function handleSavePrompt() {
    if (!newPrompt.name || !newPrompt.prompt) {
      showAlert('Nome e contenuto del prompt sono obbligatori', 'Errore', 'OK', 'error');
      return;
    }
    
    if (editingPromptId) {
      updatePrompt(editingPromptId, newPrompt);
      showAlert('Prompt aggiornato con successo', 'Successo', 'OK', 'success');
    } else {
      savePrompt(newPrompt);
      showAlert('Prompt salvato con successo', 'Successo', 'OK', 'success');
    }
    
    resetNewPrompt();
    showAddPrompt = false;
    editingPromptId = null;
  }
  
  function startEdit(prompt) {
    editingPromptId = prompt.id;
    newPrompt = {
      name: prompt.name || '',
      category: prompt.category || 'Personalizzato',
      prompt: prompt.prompt || '',
      tags: prompt.tags || [],
      description: prompt.description || ''
    };
    showAddPrompt = true;
  }
  
  function cancelEdit() {
    resetNewPrompt();
    showAddPrompt = false;
    editingPromptId = null;
  }
  
  async function handleDeleteSaved(id) {
    const confirmed = await showConfirm(
      'Sei sicuro di voler eliminare questo prompt personalizzato?',
      'Elimina prompt',
      'Elimina',
      'Annulla',
      'danger'
    );
    if (confirmed) {
      deletePrompt(id);
      showAlert('Prompt eliminato', 'Successo', 'OK', 'success');
    }
  }
  
  async function handleDuplicate(prompt) {
    const duplicated = duplicatePrompt(prompt.id);
    if (duplicated) {
      showAlert('Prompt duplicato con successo', 'Successo', 'OK', 'success');
    }
  }
  
  function viewPrompt(prompt) {
    viewingPrompt = prompt;
  }
  
  function closeView() {
    viewingPrompt = null;
  }
  
  async function handleExport() {
    try {
      exportPrompts();
      showAlert('Prompt esportati con successo', 'Successo', 'OK', 'success');
    } catch (error) {
      showAlert('Errore durante l\'esportazione', 'Errore', 'OK', 'error');
    }
  }
  
  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const count = await importPrompts(file);
          showAlert(`${count} prompt importati con successo`, 'Successo', 'OK', 'success');
        } catch (error) {
          showAlert('Errore durante l\'importazione: ' + error.message, 'Errore', 'OK', 'error');
        }
      }
    };
    input.click();
  }
  
  function addTag(tag) {
    if (tag && !newPrompt.tags.includes(tag)) {
      newPrompt.tags = [...newPrompt.tags, tag];
    }
  }
  
  function removeTag(tag) {
    newPrompt.tags = newPrompt.tags.filter(t => t !== tag);
  }
</script>

{#if $isPromptLibraryModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && !showVariablesDialog && closeModal()}>
    <div class="modal-content" class:modal-mobile={$isMobile}>
      <div class="modal-header">
        <h2>Libreria Prompt</h2>
        <div class="header-actions">
          <button class="icon-button" on:click={handleExport} title="Esporta prompt">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button class="icon-button" on:click={handleImport} title="Importa prompt">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
          <button class="close-button" on:click={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="modal-body">
        <div class="search-bar">
          <input
            type="text"
            class="search-input"
            placeholder="Cerca prompt per nome, contenuto, tag..."
            bind:value={searchTerm}
          />
        </div>
        
        <div class="controls-row">
          <div class="categories">
            {#each categories as category}
              <button
                class="category-button"
                class:active={selectedCategory === category}
                on:click={() => selectedCategory = category}
              >
                {category}
                {#if category === 'Personalizzato' && savedCount > 0}
                  <span class="badge">{savedCount}</span>
                {/if}
              </button>
            {/each}
          </div>
          
          <div class="sort-controls">
            <label>Ordina per:</label>
            <select bind:value={sortBy} class="sort-select">
              <option value="name">Nome</option>
              <option value="usage">Utilizzo</option>
              <option value="date">Data</option>
            </select>
          </div>
        </div>
        
        {#if !showAddPrompt && !viewingPrompt}
          <button class="add-prompt-button" on:click={() => { showAddPrompt = true; editingPromptId = null; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Aggiungi Prompt Personalizzato
          </button>
        {/if}
        
        {#if showAddPrompt && !viewingPrompt}
          <div class="add-prompt-form">
            <h3>{editingPromptId ? 'Modifica Prompt' : 'Nuovo Prompt Personalizzato'}</h3>
            <input
              type="text"
              class="form-input"
              placeholder="Nome prompt"
              bind:value={newPrompt.name}
            />
            <input
              type="text"
              class="form-input"
              placeholder="Descrizione (opzionale)"
              bind:value={newPrompt.description}
            />
            <textarea
              class="form-textarea"
              placeholder={promptPlaceholder}
              bind:value={newPrompt.prompt}
              rows="8"
            ></textarea>
            <div class="tags-input">
              <label>Tag (separati da virgola):</label>
              <input
                type="text"
                class="form-input"
                placeholder="es: codice, review, programmazione"
                on:keydown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    e.preventDefault();
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                    tags.forEach(tag => addTag(tag));
                    e.target.value = '';
                  }
                }}
              />
              <div class="tags-list">
                {#each newPrompt.tags as tag}
                  <span class="tag-input">
                    {tag}
                    <button class="tag-remove" on:click={() => removeTag(tag)}>×</button>
                  </span>
                {/each}
              </div>
            </div>
            <div class="form-actions">
              <button class="cancel-btn" on:click={cancelEdit}>
                Annulla
              </button>
              <button class="save-btn" on:click={handleSavePrompt}>
                {editingPromptId ? 'Aggiorna' : 'Salva'}
              </button>
            </div>
          </div>
        {/if}
        
        {#if viewingPrompt}
          <div class="prompt-view">
            <div class="view-header">
              <h3>{viewingPrompt.name}</h3>
              <button class="close-view" on:click={closeView}>×</button>
            </div>
            {#if viewingPrompt.description}
              <p class="view-description">{viewingPrompt.description}</p>
            {/if}
            <div class="view-meta">
              <span class="view-category">{viewingPrompt.category}</span>
              {#if viewingPrompt.usageCount > 0}
                <span class="view-usage">Usato {viewingPrompt.usageCount} volte</span>
              {/if}
            </div>
            <div class="view-content">
              <pre>{viewingPrompt.prompt}</pre>
            </div>
            {#if viewingPrompt.tags && viewingPrompt.tags.length > 0}
              <div class="view-tags">
                {#each viewingPrompt.tags as tag}
                  <span class="tag">{tag}</span>
                {/each}
              </div>
            {/if}
            <div class="view-actions">
              <button class="use-button" on:click={() => { closeView(); usePrompt(viewingPrompt); }}>
                Usa questo prompt
              </button>
            </div>
          </div>
        {/if}
        
        {#if !showAddPrompt && !viewingPrompt}
          <div class="prompts-list">
            {#if filteredPrompts.length > 0}
              <div class="prompts-stats">
                {#if templatesCount > 0}
                  <span>{templatesCount} template{templatesCount !== 1 ? 's' : ''} predefinit{templatesCount !== 1 ? 'i' : 'o'}</span>
                {/if}
                {#if savedCount > 0}
                  <span>{savedCount} prompt personalizzat{savedCount !== 1 ? 'i' : 'o'}</span>
                {/if}
              </div>
              
              {#each filteredPrompts as prompt}
                <div class="prompt-card">
                  <div class="prompt-header">
                    <div class="prompt-title-row">
                      <h4 on:click={() => viewPrompt(prompt)}>{prompt.name}</h4>
                      {#if prompt.usageCount > 0}
                        <span class="usage-badge">{prompt.usageCount}</span>
                      {/if}
                    </div>
                    <div class="prompt-actions">
                      {#if $savedPrompts.includes(prompt)}
                        <button class="action-button" on:click={() => startEdit(prompt)} title="Modifica">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button class="action-button" on:click={() => handleDuplicate(prompt)} title="Duplica">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                          </svg>
                        </button>
                        <button class="action-button delete" on:click|stopPropagation={() => handleDeleteSaved(prompt.id)} title="Elimina">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      {/if}
                    </div>
                  </div>
                  {#if prompt.description}
                    <p class="prompt-description">{prompt.description}</p>
                  {/if}
                  <p class="prompt-preview" on:click={() => viewPrompt(prompt)}>
                    {prompt.prompt?.substring(0, 200)}
                    {#if prompt.prompt?.length > 200}...{/if}
                  </p>
                  {#if prompt.tags && prompt.tags.length > 0}
                    <div class="prompt-tags">
                      {#each prompt.tags as tag}
                        <span class="tag">{tag}</span>
                      {/each}
                    </div>
                  {/if}
                  <div class="prompt-footer">
                    <span class="prompt-category">{prompt.category}</span>
                    <button class="use-button" on:click|stopPropagation={() => usePrompt(prompt)}>
                      Usa questo prompt
                    </button>
                  </div>
                </div>
              {/each}
            {:else}
              <p class="empty-state">
                {searchTerm ? 'Nessun prompt trovato per la ricerca' : 'Nessun prompt disponibile'}
              </p>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if showVariablesDialog && promptWithVariables}
  <div class="variables-dialog-backdrop" on:click={() => { showVariablesDialog = false; promptWithVariables = null; }}>
    <div class="variables-dialog" on:click|stopPropagation>
      <h3>Compila Variabili</h3>
      <p>Questo prompt contiene variabili che devono essere compilate.</p>
      <div class="variables-list">
        {#each extractVariables(promptWithVariables.prompt || []) as varName}
          <div class="variable-item">
            <label>{varName}:</label>
            <input
              type="text"
              bind:value={variablesToFill[varName]}
              placeholder={`Valore per ${varName}`}
            />
          </div>
        {/each}
      </div>
      <div class="variables-actions">
        <button class="cancel-btn" on:click={() => { showVariablesDialog = false; promptWithVariables = null; variablesToFill = {}; }}>
          Annulla
        </button>
        <button class="save-btn" on:click={fillVariables}>
          Conferma
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
    max-width: 900px;
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
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .icon-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
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
    padding: 16px 20px;
    flex: 1;
    overflow-y: auto;
  }

  .search-bar {
    margin-bottom: 14px;
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
    transition: border-color 0.2s;
  }

  .search-input:focus {
    border-color: var(--accent-blue);
  }

  .controls-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .categories {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1;
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
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
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

  .badge {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
  }

  .sort-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sort-controls label {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .sort-select {
    padding: 6px 10px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    cursor: pointer;
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
    font-size: 14px;
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
    box-sizing: border-box;
  }

  .form-textarea {
    resize: vertical;
    min-height: 150px;
  }

  .tags-input {
    margin-bottom: 12px;
  }

  .tags-input label {
    display: block;
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .tag-input {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background-color: var(--accent-blue);
    color: white;
    border-radius: 12px;
    font-size: 12px;
  }

  .tag-remove {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tag-remove:hover {
    opacity: 0.8;
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
    background-color: var(--bg-secondary);
    color: var(--text-primary);
  }

  .cancel-btn:hover {
    background-color: var(--hover-bg);
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

  .prompts-stats {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .prompt-card {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
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
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .prompt-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .prompt-title-row h4 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary);
    cursor: pointer;
    transition: color 0.2s;
  }

  .prompt-title-row h4:hover {
    color: var(--accent-blue);
  }

  .usage-badge {
    font-size: 11px;
    color: var(--text-secondary);
    background-color: var(--bg-secondary);
    padding: 2px 6px;
    border-radius: 10px;
  }

  .prompt-actions {
    display: flex;
    gap: 4px;
  }

  .action-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-button:hover {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
  }

  .action-button.delete:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }

  .prompt-description {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    font-style: italic;
  }

  .prompt-preview {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 12px;
    line-height: 1.5;
    cursor: pointer;
    white-space: pre-wrap;
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

  .prompt-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .prompt-category {
    font-size: 12px;
    color: var(--text-secondary);
    background-color: var(--bg-secondary);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .use-button {
    padding: 8px 16px;
    background-color: var(--accent-blue);
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
    white-space: nowrap;
  }

  .use-button:hover {
    background-color: #2563eb;
  }

  .prompt-view {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .view-header h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-primary);
  }

  .close-view {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 24px;
    line-height: 1;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-view:hover {
    color: var(--text-primary);
  }

  .view-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 12px;
    font-style: italic;
  }

  .view-meta {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .view-category {
    font-size: 12px;
    color: var(--text-secondary);
    background-color: var(--bg-secondary);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .view-usage {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .view-content {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .view-content pre {
    margin: 0;
    font-size: 13px;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: inherit;
  }

  .view-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }

  .view-actions {
    display: flex;
    justify-content: flex-end;
  }

  .empty-state {
    text-align: center;
    color: var(--text-secondary);
    padding: 40px;
    font-size: 14px;
  }

  .variables-dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
  }

  .variables-dialog {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .variables-dialog h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 18px;
    color: var(--text-primary);
  }

  .variables-dialog p {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 20px;
  }

  .variables-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .variable-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .variable-item label {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .variable-item input {
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
  }

  .variable-item input:focus {
    border-color: var(--accent-blue);
  }

  .variables-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
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
    .controls-row {
      flex-direction: column;
      align-items: stretch;
    }
    .sort-controls {
      width: 100%;
    }
    .sort-select {
      width: 100%;
    }
    .prompt-footer {
      flex-direction: column;
    }
    .use-button {
      width: 100%;
    }
  }
</style>
