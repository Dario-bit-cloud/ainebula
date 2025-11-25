<script>
  import { isSharedLinksModalOpen } from '../stores/app.js';
  import { chats } from '../stores/chat.js';
  import { getSharedLinks, createSharedLink, deleteSharedLink } from '../services/sharedLinksService.js';
  import { showAlert, showConfirm } from '../services/dialogService.js';
  import { onMount } from 'svelte';
  
  let sharedLinks = [];
  let isLoading = false;
  let selectedChatId = '';
  let linkTitle = '';
  let expiresInDays = 30;
  let isCreating = false;
  
  onMount(() => {
    loadSharedLinks();
  });
  
  async function loadSharedLinks() {
    isLoading = true;
    try {
      const result = await getSharedLinks();
      if (result.success) {
        sharedLinks = result.links || [];
      } else {
        await showAlert(result.message || 'Errore nel caricamento dei link', 'Errore', 'OK', 'error');
      }
    } catch (error) {
      await showAlert('Errore nel caricamento dei link condivisi', 'Errore', 'OK', 'error');
    } finally {
      isLoading = false;
    }
  }
  
  async function handleCreateLink() {
    if (!selectedChatId) {
      await showAlert('Seleziona una chat', 'Errore', 'OK', 'error');
      return;
    }
    
    isCreating = true;
    try {
      const result = await createSharedLink(selectedChatId, linkTitle || null, expiresInDays || null);
      if (result.success) {
        await showAlert('Link condiviso creato con successo!', 'Successo', 'OK', 'success');
        linkTitle = '';
        selectedChatId = '';
        await loadSharedLinks();
      } else {
        await showAlert(result.message || 'Errore nella creazione del link', 'Errore', 'OK', 'error');
      }
    } catch (error) {
      await showAlert('Errore nella creazione del link', 'Errore', 'OK', 'error');
    } finally {
      isCreating = false;
    }
  }
  
  async function handleDeleteLink(linkId) {
    const confirmed = await showConfirm(
      'Sei sicuro di voler eliminare questo link condiviso?',
      'Elimina link',
      'Elimina',
      'Annulla',
      'danger'
    );
    
    if (!confirmed) return;
    
    try {
      const result = await deleteSharedLink(linkId);
      if (result.success) {
        await showAlert('Link eliminato con successo', 'Successo', 'OK', 'success');
        await loadSharedLinks();
      } else {
        await showAlert(result.message || 'Errore nell\'eliminazione del link', 'Errore', 'OK', 'error');
      }
    } catch (error) {
      await showAlert('Errore nell\'eliminazione del link', 'Errore', 'OK', 'error');
    }
  }
  
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showAlert('Link copiato negli appunti!', 'Copiato', 'OK', 'success');
    }).catch(() => {
      showAlert('Errore nella copia del link', 'Errore', 'OK', 'error');
    });
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'Mai';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  }
  
  function closeModal() {
    isSharedLinksModalOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  $: availableChats = $chats.filter(chat => !chat.isTemporary);
</script>

{#if $isSharedLinksModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Link condivisi</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- Form per creare nuovo link -->
        <div class="create-section">
          <h3>Crea nuovo link</h3>
          <div class="form-group">
            <label for="chat-select">Seleziona chat</label>
            <select id="chat-select" bind:value={selectedChatId} class="form-select">
              <option value="">-- Seleziona una chat --</option>
              {#each availableChats as chat}
                <option value={chat.id}>{chat.title}</option>
              {/each}
            </select>
          </div>
          
          <div class="form-group">
            <label for="link-title">Titolo (opzionale)</label>
            <input 
              id="link-title" 
              type="text" 
              bind:value={linkTitle} 
              placeholder="Titolo personalizzato per il link"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label for="expires-days">Scadenza (giorni, opzionale)</label>
            <input 
              id="expires-days" 
              type="number" 
              bind:value={expiresInDays} 
              min="1"
              max="365"
              class="form-input"
            />
            <small>Lascia vuoto per link senza scadenza</small>
          </div>
          
          <button 
            class="create-button" 
            on:click={handleCreateLink}
            disabled={!selectedChatId || isCreating}
          >
            {isCreating ? 'Creazione...' : 'Crea link'}
          </button>
        </div>
        
        <!-- Lista link esistenti -->
        <div class="links-section">
          <h3>Link esistenti</h3>
          {#if isLoading}
            <div class="loading">Caricamento...</div>
          {:else if sharedLinks.length === 0}
            <div class="empty-state">Nessun link condiviso</div>
          {:else}
            <div class="links-list">
              {#each sharedLinks as link}
                <div class="link-item">
                  <div class="link-info">
                    <div class="link-title">{link.title || link.chatTitle}</div>
                    <div class="link-details">
                      <span>Chat: {link.chatTitle}</span>
                      <span>Accessi: {link.accessCount}</span>
                      <span>Scadenza: {formatDate(link.expiresAt)}</span>
                    </div>
                    <div class="link-url">
                      <input type="text" readonly value={link.shareUrl} class="url-input" />
                      <button class="copy-button" on:click={() => copyToClipboard(link.shareUrl)}>
                        Copia
                      </button>
                    </div>
                  </div>
                  <button 
                    class="delete-button" 
                    on:click={() => handleDeleteLink(link.id)}
                    title="Elimina link"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              {/each}
            </div>
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
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  
  .modal-content {
    background-color: #2d2d2d;
    border-radius: 12px;
    max-width: 700px;
    width: 100%;
    max-height: 85vh;
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
    border-bottom: 1px solid #3a3a3a;
  }
  
  .modal-title {
    font-size: 20px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
  }
  
  .close-button {
    background: none;
    border: none;
    color: #ffffff;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    border-radius: 4px;
  }
  
  .close-button:hover {
    opacity: 0.7;
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .modal-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }
  
  .create-section {
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid #3a3a3a;
  }
  
  .create-section h3,
  .links-section h3 {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    margin: 0 0 16px 0;
  }
  
  .form-group {
    margin-bottom: 16px;
  }
  
  .form-group label {
    display: block;
    font-size: 14px;
    color: #ffffff;
    margin-bottom: 8px;
  }
  
  .form-group small {
    display: block;
    font-size: 12px;
    color: #a0a0a0;
    margin-top: 4px;
  }
  
  .form-select,
  .form-input {
    width: 100%;
    padding: 10px 12px;
    background-color: #3a3a3a;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    color: #ffffff;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: all 0.2s;
  }
  
  .form-select:hover,
  .form-input:hover {
    border-color: #4a4a4a;
  }
  
  .form-select:focus,
  .form-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
  
  .create-button {
    padding: 10px 20px;
    background-color: #3b82f6;
    border: none;
    border-radius: 8px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .create-button:hover:not(:disabled) {
    background-color: #2563eb;
    transform: translateY(-1px);
  }
  
  .create-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .links-section {
    margin-top: 24px;
  }
  
  .loading,
  .empty-state {
    text-align: center;
    padding: 40px;
    color: #a0a0a0;
  }
  
  .links-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .link-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background-color: #3a3a3a;
    border-radius: 8px;
    border: 1px solid #3a3a3a;
    transition: all 0.2s;
  }
  
  .link-item:hover {
    border-color: #4a4a4a;
  }
  
  .link-info {
    flex: 1;
    min-width: 0;
  }
  
  .link-title {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 8px;
  }
  
  .link-details {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 12px;
    color: #a0a0a0;
    margin-bottom: 12px;
  }
  
  .link-url {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  .url-input {
    flex: 1;
    padding: 8px 12px;
    background-color: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 6px;
    color: #ffffff;
    font-size: 12px;
    font-family: monospace;
  }
  
  .copy-button {
    padding: 8px 12px;
    background-color: #3a3a3a;
    border: none;
    border-radius: 6px;
    color: #ffffff;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .copy-button:hover {
    background-color: #4a4a4a;
  }
  
  .delete-button {
    padding: 8px;
    background-color: transparent;
    border: 1px solid #ef4444;
    border-radius: 6px;
    color: #ef4444;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  
  .delete-button:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }
</style>

