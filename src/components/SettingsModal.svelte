<script>
  import { isSettingsOpen } from '../stores/app.js';
  import { chats } from '../stores/chat.js';
  import { user as userStore } from '../stores/user.js';
  
  let activeSection = 'generale';
  let theme = 'system';
  let language = 'system';
  let improveModel = true;
  let phoneNumber = '';
  
  const sections = [
    { id: 'generale', label: 'Generale', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'profilo', label: 'Profilo', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'dati', label: 'Dati', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    { id: 'informazioni', label: 'Informazioni', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
  ];
  
  function closeModal() {
    isSettingsOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function selectSection(sectionId) {
    activeSection = sectionId;
  }
  
  function handleDisconnect() {
    if (confirm('Sei sicuro di voler disconnetterti da tutti i dispositivi?')) {
      alert('Disconnessione avviata.');
    }
  }
  
  function handleDeleteAccount() {
    if (confirm('Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.')) {
      alert('Eliminazione account avviata.');
    }
  }
  
  function handleExportData() {
    alert('L\'esportazione dei dati è stata avviata. Riceverai un\'email con il link per il download.');
  }
  
  function handleDeleteAllChats() {
    if (confirm('Sei sicuro di voler eliminare tutte le chat? Questa azione è irreversibile.')) {
      chats.set([]);
      localStorage.removeItem('nebula-ai-chats');
      alert('Tutte le chat sono state eliminate.');
    }
  }
  
  function maskEmail(email) {
    if (!email) return '-';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return email;
    const masked = localPart.substring(0, 2) + '*'.repeat(localPart.length - 2) + localPart.slice(-2);
    return `${masked}@${domain}`;
  }
  
  function handleViewTerms() {
    window.open('/terms', '_blank');
  }
  
  function handleViewPrivacy() {
    window.open('/privacy', '_blank');
  }
</script>

{#if $isSettingsOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">Impostazioni</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body-container">
        <!-- Sidebar -->
        <aside class="settings-sidebar">
          {#each sections as section}
            <button
              class="sidebar-item"
              class:active={activeSection === section.id}
              on:click={() => selectSection(section.id)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d={section.icon} />
              </svg>
              <span>{section.label}</span>
            </button>
          {/each}
        </aside>
        
        <!-- Content -->
        <div class="settings-content">
          <!-- Generale -->
          {#if activeSection === 'generale'}
            <div class="setting-section">
              <h3 class="setting-title">Tema</h3>
              <div class="theme-buttons">
                <button 
                  class="theme-button" 
                  class:active={theme === 'light'}
                  on:click={() => theme = 'light'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  <span>Chiaro</span>
                </button>
                <button 
                  class="theme-button" 
                  class:active={theme === 'dark'}
                  on:click={() => theme = 'dark'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                  <span>Scuro</span>
                </button>
                <button 
                  class="theme-button" 
                  class:active={theme === 'system'}
                  on:click={() => theme = 'system'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <span>Sistema</span>
                </button>
              </div>
            </div>
            
            <div class="setting-section">
              <h3 class="setting-title">Lingua</h3>
              <select class="setting-select" bind:value={language}>
                <option value="system">Sistema</option>
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          {/if}
          
          <!-- Profilo -->
          {#if activeSection === 'profilo'}
            <div class="setting-row">
              <div class="setting-label">Indirizzo email</div>
              <div class="setting-value">{maskEmail($userStore.email)}</div>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">Numero di telefono</div>
              <div class="setting-value">{phoneNumber || '-'}</div>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">Disconnetti da tutti i dispositivi</div>
              <button class="danger-button" on:click={handleDisconnect}>Disconnetti</button>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">Elimina account</div>
              <button class="danger-button" on:click={handleDeleteAccount}>Elimina</button>
            </div>
          {/if}
          
          <!-- Dati -->
          {#if activeSection === 'dati'}
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Migliora il modello per tutti</div>
                <div class="setting-description">Consenti l'utilizzo dei tuoi contenuti per addestrare i nostri modelli e migliorare i nostri servizi. Proteggiamo la tua privacy dei dati.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" bind:checked={improveModel} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">Link condivisi</div>
              <button class="manage-button">Gestisci</button>
            </div>
            
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Esporta dati</div>
                <div class="setting-description">Questi dati includono le informazioni del tuo account e tutta la cronologia delle chat. L'esportazione potrebbe richiedere del tempo. Il link per il download sarà valido per 7 giorni.</div>
              </div>
              <button class="manage-button" on:click={handleExportData}>Esporta</button>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">Elimina tutte le chat</div>
              <button class="danger-button" on:click={handleDeleteAllChats}>Cancella tutto</button>
            </div>
          {/if}
          
          <!-- Informazioni -->
          {#if activeSection === 'informazioni'}
            <div class="setting-row">
              <div class="setting-label">Termini di utilizzo</div>
              <button class="view-button" on:click={handleViewTerms}>Visualizza</button>
            </div>
            
            <div class="setting-row">
              <div class="setting-label">Informativa sulla privacy</div>
              <button class="view-button" on:click={handleViewPrivacy}>Visualizza</button>
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
    animation: backdropFadeIn 0.3s ease;
  }

  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background-color: #2d2d2d;
    border-radius: 12px;
    max-width: 800px;
    width: 100%;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.3s ease;
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
    transition: opacity 0.2s;
  }

  .close-button:hover {
    opacity: 0.7;
  }

  .modal-body-container {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .settings-sidebar {
    width: 200px;
    background-color: #2d2d2d;
    border-right: 1px solid #3a3a3a;
    padding: 16px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sidebar-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: none;
    border: none;
    color: #ffffff;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sidebar-item:hover {
    background-color: #3a3a3a;
  }

  .sidebar-item.active {
    background-color: #3a3a3a;
  }

  .sidebar-item svg {
    flex-shrink: 0;
  }

  .settings-content {
    flex: 1;
    padding: 32px;
    overflow-y: auto;
  }

  .setting-section {
    margin-bottom: 32px;
  }

  .setting-section:last-child {
    margin-bottom: 0;
  }

  .setting-title {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    margin: 0 0 16px 0;
  }

  .theme-buttons {
    display: flex;
    gap: 12px;
  }

  .theme-button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background-color: #3a3a3a;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    color: #ffffff;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .theme-button:hover {
    background-color: #454545;
  }

  .theme-button.active {
    background-color: #3a3a3a;
    border-color: #ffffff;
  }

  .theme-button svg {
    flex-shrink: 0;
  }

  .setting-select {
    width: 100%;
    max-width: 300px;
    padding: 10px 12px;
    background-color: #3a3a3a;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    color: #ffffff;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .setting-select:hover {
    border-color: #4a4a4a;
  }

  .setting-select:focus {
    border-color: #3b82f6;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid #3a3a3a;
  }

  .setting-row:last-child {
    border-bottom: none;
  }

  .setting-label {
    font-size: 14px;
    color: #ffffff;
    font-weight: 500;
  }

  .setting-value {
    font-size: 14px;
    color: #a0a0a0;
  }

  .setting-info {
    flex: 1;
    min-width: 0;
  }

  .setting-description {
    font-size: 13px;
    color: #a0a0a0;
    margin-top: 4px;
    line-height: 1.5;
  }

  .manage-button,
  .view-button {
    padding: 8px 16px;
    background-color: #3a3a3a;
    border: none;
    border-radius: 6px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .manage-button:hover,
  .view-button:hover {
    background-color: #454545;
  }

  .danger-button {
    padding: 8px 16px;
    background-color: transparent;
    border: 1px solid #ef4444;
    border-radius: 6px;
    color: #ef4444;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .danger-button:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }

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
    background-color: #3a3a3a;
    transition: all 0.3s;
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
    transition: all 0.3s;
    border-radius: 50%;
  }

  .toggle-switch input:checked + .toggle-slider {
    background-color: #3b82f6;
  }

  .toggle-switch input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 0;
    }

    .modal-content {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
      height: 100vh;
    }

    .settings-sidebar {
      width: 160px;
    }

    .settings-content {
      padding: 20px 16px;
    }

    .theme-buttons {
      flex-direction: column;
    }
  }
</style>
