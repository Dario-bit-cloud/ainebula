<script>
  import { isWorkspaceSettingsModalOpen, isInviteModalOpen } from '../stores/app.js';
  import { user as authUser, isAuthenticatedStore } from '../stores/auth.js';
  import { getToken } from '../services/authService.js';
  import { getCurrentAccount } from '../stores/accounts.js';
  import { showAlert, showConfirm } from '../services/dialogService.js';
  import { onMount } from 'svelte';
  
  let workspaceName = '';
  let workspaceDescription = '';
  let isLoading = true;
  let isSaving = false;
  let members = [];
  let stats = {
    totalMembers: 0,
    totalChats: 0,
    totalProjects: 0,
    createdAt: null
  };
  
  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001/api';
      }
      const backendUrl = import.meta.env.VITE_API_BASE_URL;
      if (backendUrl) {
        return `${backendUrl}/api`;
      }
      return '/api';
    }
    return 'http://localhost:3001/api';
  };
  
  async function loadWorkspaceData() {
    if (!$isAuthenticatedStore) {
      isLoading = false;
      return;
    }
    
    isLoading = true;
    const token = getToken();
    
    if (!token) {
      isLoading = false;
      return;
    }
    
    try {
      // Carica dati workspace (per ora usa i dati dell'account corrente)
      const currentAccount = getCurrentAccount();
      if (currentAccount) {
        workspaceName = currentAccount.email || 'Workspace personale';
        workspaceDescription = 'Il tuo workspace personale';
      }
      
      // Carica statistiche (mock per ora)
      stats = {
        totalMembers: 1,
        totalChats: 0,
        totalProjects: 0,
        createdAt: new Date().toISOString()
      };
      
      // Carica membri (mock per ora)
      members = [];
    } catch (error) {
      console.error('Errore nel caricamento dati workspace:', error);
      await showAlert('Errore nel caricamento dei dati del workspace', 'Errore', 'OK', 'error');
    } finally {
      isLoading = false;
    }
  }
  
  function closeModal() {
    isWorkspaceSettingsModalOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  async function handleSave() {
    if (isSaving) return;
    
    if (!workspaceName || workspaceName.trim().length < 3) {
      await showAlert('Il nome del workspace deve essere di almeno 3 caratteri', 'Errore', 'OK', 'error');
      return;
    }
    
    isSaving = true;
    try {
      // Salva le impostazioni del workspace
      // TODO: Implementare API per salvare le impostazioni del workspace
      await new Promise(resolve => setTimeout(resolve, 500)); // Simula salvataggio
      
      await showAlert('Impostazioni del workspace salvate con successo', 'Successo', 'OK', 'success');
      closeModal();
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
      await showAlert('Errore durante il salvataggio delle impostazioni', 'Errore', 'OK', 'error');
    } finally {
      isSaving = false;
    }
  }
  
  function handleInviteMembers() {
    isInviteModalOpen.set(true);
    closeModal();
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  }
  
  onMount(() => {
    if ($isWorkspaceSettingsModalOpen) {
      loadWorkspaceData();
    }
  });
  
  // Ricarica i dati quando il modal si apre
  $: if ($isWorkspaceSettingsModalOpen) {
    loadWorkspaceData();
  }
</script>

{#if $isWorkspaceSettingsModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Impostazioni dell'area di lavoro</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        {#if isLoading}
          <div class="loading-state">
            <p>Caricamento...</p>
          </div>
        {:else}
          <!-- Informazioni generali -->
          <div class="section">
            <h3 class="section-title">Informazioni generali</h3>
            
            <div class="form-field">
              <label class="form-label">Nome workspace</label>
              <input 
                type="text"
                class="form-input"
                bind:value={workspaceName}
                placeholder="Nome del workspace"
                disabled={isSaving}
              />
            </div>
            
            <div class="form-field">
              <label class="form-label">Descrizione</label>
              <textarea
                class="form-textarea"
                bind:value={workspaceDescription}
                placeholder="Descrizione del workspace (opzionale)"
                rows="3"
                disabled={isSaving}
              ></textarea>
            </div>
          </div>
          
          <!-- Statistiche -->
          <div class="section">
            <h3 class="section-title">Statistiche</h3>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{stats.totalMembers}</div>
                <div class="stat-label">Membri</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{stats.totalChats}</div>
                <div class="stat-label">Chat</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{stats.totalProjects}</div>
                <div class="stat-label">Progetti</div>
              </div>
            </div>
            
            {#if stats.createdAt}
              <div class="info-row">
                <span class="info-label">Creato il:</span>
                <span class="info-value">{formatDate(stats.createdAt)}</span>
              </div>
            {/if}
          </div>
          
          <!-- Membri -->
          <div class="section">
            <div class="section-header">
              <h3 class="section-title">Membri del team</h3>
              <button class="invite-button" on:click={handleInviteMembers}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Invita membri
              </button>
            </div>
            
            {#if members.length === 0}
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                  <path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
                <p>Nessun membro aggiunto</p>
                <p class="empty-hint">Invita colleghi per collaborare nel workspace</p>
              </div>
            {:else}
              <div class="members-list">
                {#each members as member}
                  <div class="member-item">
                    <div class="member-avatar">
                      {member.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div class="member-info">
                      <div class="member-name">{member.name || 'Utente'}</div>
                      <div class="member-email">{member.email}</div>
                    </div>
                    <div class="member-role">{member.role || 'Membro'}</div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
      
      {#if !isLoading}
        <div class="modal-footer">
          <button class="cancel-button" on:click={closeModal} disabled={isSaving}>
            Annulla
          </button>
          <button class="save-button" on:click={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      {/if}
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
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
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
    border-radius: 4px;
  }

  .close-button:hover {
    color: var(--text-primary);
    background-color: var(--hover-bg);
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .loading-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
  }

  .section {
    margin-bottom: 32px;
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 16px 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .section-header .section-title {
    margin: 0;
  }

  .form-field {
    margin-bottom: 16px;
  }

  .form-field:last-child {
    margin-bottom: 0;
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
    transition: border-color 0.2s;
  }

  .form-input:focus,
  .form-textarea:focus {
    border-color: var(--accent-blue);
  }

  .form-input:disabled,
  .form-textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat-card {
    padding: 16px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    text-align: center;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-top: 1px solid var(--border-color);
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

  .invite-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background-color: var(--accent-blue);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .invite-button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
  }

  .empty-state svg {
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 8px 0;
    font-size: 14px;
  }

  .empty-hint {
    font-size: 12px;
    color: var(--text-secondary);
    opacity: 0.7;
  }

  .members-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .member-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .member-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-blue), #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .member-info {
    flex: 1;
    min-width: 0;
  }

  .member-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .member-email {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .member-role {
    font-size: 12px;
    color: var(--text-secondary);
    padding: 4px 8px;
    background-color: var(--bg-primary);
    border-radius: 4px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--border-color);
  }

  .cancel-button,
  .save-button {
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

  .cancel-button:hover:not(:disabled) {
    background-color: var(--hover-bg);
  }

  .save-button {
    background-color: var(--accent-blue);
    color: white;
  }

  .save-button:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .cancel-button:disabled,
  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .modal-content {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .invite-button {
      width: 100%;
      justify-content: center;
    }
  }
</style>





