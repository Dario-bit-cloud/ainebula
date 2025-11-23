<script>
  import { isSettingsOpen } from '../stores/app.js';
  import { selectedModel, availableModels } from '../stores/models.js';
  import { chats } from '../stores/chat.js';
  import { user as userStore } from '../stores/user.js';
  
  let activeSection = 'generale';
  let appearanceValue = 'system';
  let accentColor = 'default';
  let language = 'auto';
  let spokenLanguage = 'auto';
  let voiceModel = 'Juniper';
  let showOtherModels = false;
  
  // Notifiche
  let notificationResponses = 'push';
  let notificationActivity = 'push-email';
  let notificationProjects = 'email';
  let notificationSuggestions = 'push-email';
  
  // Personalizzazione
  let personalizationEnabled = false;
  let styleAndTone = 'default';
  let customInstructions = '';
  let alternativeName = '';
  let occupation = '';
  
  // Connettori
  const connectors = [
    { id: 'aha', name: 'Aha!', icon: '🔵' },
    { id: 'asana', name: 'Asana', icon: '🔺' },
    { id: 'azure', name: 'Azure Boards', icon: '⬡' },
    { id: 'basecamp', name: 'Basecamp', icon: '✅' },
    { id: 'box', name: 'Box', icon: '📦' },
    { id: 'outlook-cal', name: 'Calendario Outlook', icon: '📅' },
    { id: 'clickup', name: 'ClickUp', icon: '👆' },
    { id: 'google-contacts', name: 'Contatti Google', icon: '👤' },
    { id: 'dropbox', name: 'Dropbox', icon: '📦' },
    { id: 'outlook-email', name: 'E-mail Outlook', icon: '✉️' },
    { id: 'github', name: 'GitHub', icon: '🐙' },
    { id: 'gitlab', name: 'GitLab Issues', icon: '🦊' },
    { id: 'gmail', name: 'Gmail', icon: '📧' },
    { id: 'google-calendar', name: 'Google Calendar', icon: '📆' },
    { id: 'google-drive', name: 'Google Drive', icon: '🔺' }
  ];
  
  // Controlli dati
  let improveModel = true;
  let remoteBrowserData = true;
  
  // Sicurezza
  let mfaAuthenticator = false;
  let mfaPush = false;
  
  const sections = [
    { id: 'generale', label: 'Generale', icon: '⚙️' },
    { id: 'notifiche', label: 'Notifiche', icon: '🔔' },
    { id: 'personalizzazione', label: 'Personalizzazione', icon: '🕒' },
    { id: 'connettori', label: 'App e connettori', icon: '🔗' },
    { id: 'pianificazioni', label: 'Pianificazioni', icon: '📅' },
    { id: 'controlli-dati', label: 'Controlli dati', icon: '💾' },
    { id: 'sicurezza', label: 'Sicurezza', icon: '🔒' },
    { id: 'account', label: 'Account', icon: '👤' }
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
  
  function handleArchiveAll() {
    if (confirm('Sei sicuro di voler archiviare tutte le chat?')) {
      alert('Tutte le chat sono state archiviate.');
    }
  }
  
  function handleDeleteAll() {
    if (confirm('Sei sicuro di voler eliminare tutte le chat? Questa azione è irreversibile.')) {
      chats.set([]);
      localStorage.removeItem('nebula-ai-chats');
      alert('Tutte le chat sono state eliminate.');
    }
  }
  
  function handleLogout() {
    if (confirm('Sei sicuro di voler uscire da questo dispositivo?')) {
      alert('Logout effettuato.');
      closeModal();
    }
  }
  
  function handleLogoutAll() {
    if (confirm('Sei sicuro di voler uscire da tutti i dispositivi? Potrebbero essere necessari fino a 30 minuti per completare l\'operazione.')) {
      alert('Logout da tutti i dispositivi avviato.');
      closeModal();
    }
  }
</script>

{#if $isSettingsOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
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
              <span class="sidebar-icon">{section.icon}</span>
              <span>{section.label}</span>
            </button>
          {/each}
        </aside>
        
        <!-- Content -->
        <div class="settings-content">
          <!-- Generale -->
          {#if activeSection === 'generale'}
            <h2 class="section-title">Generali</h2>
            
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Aspetto</div>
                </div>
                <select class="setting-select" bind:value={appearanceValue}>
                  <option value="system">Sistema</option>
                  <option value="dark">Scuro</option>
                  <option value="light">Chiaro</option>
                </select>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Colore complementare</div>
                </div>
                <select class="setting-select" bind:value={accentColor}>
                  <option value="default">Predefinito</option>
                  <option value="blue">Blu</option>
                  <option value="green">Verde</option>
                  <option value="purple">Viola</option>
                </select>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Lingua</div>
                </div>
                <select class="setting-select" bind:value={language}>
                  <option value="auto">Rilevamento automatico</option>
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Lingua parlata</div>
                  <div class="setting-description">Per ottenere risultati migliori, seleziona la tua lingua principale; se non è elencata, potrebbe essere comunque supportata tramite il rilevamento automatico.</div>
                </div>
                <select class="setting-select" bind:value={spokenLanguage}>
                  <option value="auto">Rilevamento automatico</option>
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Vocali</div>
                </div>
                <div class="setting-controls">
                  <button class="play-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </button>
                  <select class="setting-select" bind:value={voiceModel}>
                    <option value="Juniper">Juniper</option>
                    <option value="Alloy">Alloy</option>
                    <option value="Echo">Echo</option>
                  </select>
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Mostra altri modelli</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" bind:checked={showOtherModels} />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          {/if}
          
          <!-- Notifiche -->
          {#if activeSection === 'notifiche'}
            <h2 class="section-title">Notifiche</h2>
            
            <div class="setting-group">
              <div class="notification-item">
                <div class="notification-info">
                  <div class="notification-label">Risposte</div>
                  <div class="notification-description">Ricevi una notifica quando Nebula AI risponde a richieste che richiedono tempo, come la ricerca o la generazione di immagini.</div>
                </div>
                <select class="setting-select" bind:value={notificationResponses}>
                  <option value="push">Notifiche push</option>
                  <option value="email">E-mail</option>
                  <option value="none">Nessuna</option>
                </select>
              </div>
              
              <div class="notification-item">
                <div class="notification-info">
                  <div class="notification-label">Attività</div>
                  <div class="notification-description">Ricevi una notifica quando le attività che hai creato vengono aggiornate.</div>
                  <a href="#" class="link-text">Gestisci attività</a>
                </div>
                <select class="setting-select" bind:value={notificationActivity}>
                  <option value="push-email">Notifiche push, via e-mail</option>
                  <option value="push">Notifiche push</option>
                  <option value="email">E-mail</option>
                  <option value="none">Nessuna</option>
                </select>
              </div>
              
              <div class="notification-item">
                <div class="notification-info">
                  <div class="notification-label">Projects</div>
                  <div class="notification-description">Ricevi una notifica quando hai un invito via e-mail a un progetto condiviso.</div>
                </div>
                <select class="setting-select" bind:value={notificationProjects}>
                  <option value="email">E-mail</option>
                  <option value="push">Notifiche push</option>
                  <option value="none">Nessuna</option>
                </select>
              </div>
              
              <div class="notification-item">
                <div class="notification-info">
                  <div class="notification-label">Suggerimenti</div>
                  <div class="notification-description">Rimani aggiornato su nuovi strumenti, suggerimenti e funzionalità di Nebula AI.</div>
                </div>
                <select class="setting-select" bind:value={notificationSuggestions}>
                  <option value="push-email">Notifiche push, via e-mail</option>
                  <option value="push">Notifiche push</option>
                  <option value="email">E-mail</option>
                  <option value="none">Nessuna</option>
                </select>
              </div>
            </div>
          {/if}
          
          <!-- Personalizzazione -->
          {#if activeSection === 'personalizzazione'}
            <h2 class="section-title">Personalizzazione</h2>
            
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Abilita personalizzazione</div>
                  <div class="setting-description">Personalizza le modalità di risposta di Nebula AI. <a href="#" class="link-text">Scopri di più</a></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" bind:checked={personalizationEnabled} />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Stile e tono di base</div>
                  <div class="setting-description">Imposta lo stile e il tono che Nebula AI usa quando risponde.</div>
                </div>
                <select class="setting-select" bind:value={styleAndTone}>
                  <option value="default">Predefinita</option>
                  <option value="casual">Casuale</option>
                  <option value="professional">Professionale</option>
                  <option value="friendly">Amichevole</option>
                </select>
              </div>
              
              <div class="setting-item-full">
                <div class="setting-info">
                  <div class="setting-label">Istruzioni personalizzate</div>
                  <div class="setting-description">Preferenze aggiuntive relative a comportamento, stile e tono</div>
                </div>
                <textarea 
                  class="setting-textarea" 
                  bind:value={customInstructions}
                  placeholder="Preferenze aggiuntive relative a comportamento, stile e tono"
                ></textarea>
                <div class="style-pills">
                  <button class="style-pill">Discorsiva</button>
                  <button class="style-pill">Arguta</button>
                  <button class="style-pill">Schietta</button>
                  <button class="style-pill">Incoraggiante</button>
                  <button class="style-pill">Gen Z</button>
                </div>
              </div>
              
              <div class="setting-item-full">
                <div class="setting-info">
                  <div class="setting-label">Informazioni su di te</div>
                </div>
                
                <div class="setting-subsection">
                  <div class="setting-info">
                    <div class="setting-label">Nome alternativo</div>
                    <div class="setting-description">Come deve chiamarti Nebula AI?</div>
                  </div>
                  <input 
                    type="text" 
                    class="setting-input" 
                    bind:value={alternativeName}
                    placeholder="Come deve chiamarti Nebula AI?"
                  />
                </div>
                
                <div class="setting-subsection">
                  <div class="setting-info">
                    <div class="setting-label">Occupazione</div>
                  </div>
                  <input 
                    type="text" 
                    class="setting-input" 
                    bind:value={occupation}
                    placeholder="Es: Studente di ingegneria"
                  />
                </div>
              </div>
            </div>
          {/if}
          
          <!-- Connettori -->
          {#if activeSection === 'connettori'}
            <h2 class="section-title">Connettori</h2>
            <p class="section-description">
              Nebula AI può accedere alle informazioni provenienti dai tuoi strumenti collegati per fornirti risposte più utili. 
              Le tue autorizzazioni vengono sempre rispettate. <a href="#" class="link-text">Scopri di più</a>
            </p>
            
            <div class="connectors-grid">
              {#each connectors as connector}
                <div class="connector-card">
                  <div class="connector-icon">{connector.icon}</div>
                  <div class="connector-name">{connector.name}</div>
                </div>
              {/each}
            </div>
          {/if}
          
          <!-- Pianificazioni -->
          {#if activeSection === 'pianificazioni'}
            <h2 class="section-title">Pianificazioni</h2>
            <p class="section-description">
              È possibile pianificare Nebula AI in modo che venga eseguito nuovamente dopo aver completato un'attività. 
              Scegli 📅 Pianifica dal menu ••• in una conversazione per impostare le esecuzioni future.
            </p>
            <button class="manage-button">Gestisci</button>
          {/if}
          
          <!-- Controlli dati -->
          {#if activeSection === 'controlli-dati'}
            <h2 class="section-title">Controlli dati</h2>
            
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Migliora il modello per tutti</div>
                </div>
                <div class="setting-status">
                  <span>{improveModel ? 'Attiva' : 'Disattiva'}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Dati del browser remoto</div>
                </div>
                <div class="setting-status">
                  <span>{remoteBrowserData ? 'Attiva' : 'Disattiva'}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Link condivisi</div>
                </div>
                <button class="manage-button">Gestisci</button>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Chat archiviate</div>
                </div>
                <button class="manage-button">Gestisci</button>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Archivia tutte le chat</div>
                </div>
                <button class="manage-button" on:click={handleArchiveAll}>Archivia tutto</button>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Elimina tutte le chat</div>
                </div>
                <button class="delete-button" on:click={handleDeleteAll}>Elimina tutto</button>
              </div>
            </div>
          {/if}
          
          <!-- Sicurezza -->
          {#if activeSection === 'sicurezza'}
            <h2 class="section-title">Sicurezza</h2>
            
            <div class="setting-group">
              <div class="setting-section-header">Autenticazione a più fattori (MFA)</div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">App di autenticazione</div>
                  <div class="setting-description">Utilizza i codici monouso generati da un'app di autenticazione.</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" bind:checked={mfaAuthenticator} />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Notifiche push</div>
                  <div class="setting-description">Approva gli accessi con una notifica push inviata al tuo dispositivo affidabile</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" bind:checked={mfaPush} />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Esci da questo dispositivo</div>
                </div>
                <button class="manage-button" on:click={handleLogout}>Esci</button>
              </div>
              
              <div class="setting-item-full">
                <div class="setting-info">
                  <div class="setting-label">Esci da tutti i dispositivi</div>
                  <div class="setting-description">
                    Esci da tutte le sessioni attive su tutti i dispositivi, inclusa la sessione corrente. 
                    Potrebbero essere necessari fino a 30 minuti perché venga effettuata la disconnessione sugli altri dispositivi.
                  </div>
                </div>
                <button class="delete-button" on:click={handleLogoutAll}>Esci da tutto</button>
              </div>
              
              <div class="setting-item-full">
                <div class="setting-info">
                  <div class="setting-label">Accesso protetto con Nebula AI</div>
                  <div class="setting-description">
                    Accedi a siti web e app su internet con la sicurezza affidabile di Nebula AI. 
                    <a href="#" class="link-text">Scopri di più</a>
                  </div>
                </div>
                <div class="info-box">
                  Non hai ancora usato Nebula AI per accedere a siti web o app. Quando lo farai, appariranno qui.
                </div>
              </div>
            </div>
          {/if}
          
          <!-- Account -->
          {#if activeSection === 'account'}
            <h2 class="section-title">Profilo generatore GPT</h2>
            <p class="section-description">
              Personalizza il tuo profilo generatore per collegarti con gli utenti dei tuoi GPT. 
              Queste impostazioni vengono usate per i GPT condivisi con il pubblico.
            </p>
            
            <div class="setting-group">
              <div class="preview-box">
                <div class="preview-icon">⬜</div>
                <div class="preview-name">PlaceholderGPT</div>
                <div class="preview-author">Di {$userStore.name || 'utente'}</div>
              </div>
              <div class="preview-label">Anteprima</div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Nome</div>
                </div>
                <div class="setting-controls">
                  <input type="text" class="setting-input" value={$userStore.name || 'utente'} />
                  <label class="toggle-switch">
                    <input type="checkbox" checked />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              
              <div class="setting-item-full">
                <div class="setting-info">
                  <div class="setting-label">Link</div>
                </div>
                <select class="setting-select">
                  <option>Seleziona un dominio</option>
                </select>
                <div class="link-items">
                  <div class="link-item">
                    <span>🌐 in LinkedIn</span>
                    <button class="add-button">Aggiungi</button>
                  </div>
                  <div class="link-item">
                    <span>💻 GitHub</span>
                    <button class="add-button">Aggiungi</button>
                  </div>
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">E-mail</div>
                </div>
                <div class="setting-controls">
                  <span>{$userStore.email || 'utente@esempio.com'}</span>
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">Ricevi e-mail di feedback</div>
                </div>
                <label class="checkbox-label">
                  <input type="checkbox" />
                  <span></span>
                </label>
              </div>
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
    max-width: 900px;
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
    justify-content: flex-end;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
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

  .modal-body-container {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .settings-sidebar {
    width: 220px;
    background-color: var(--bg-primary);
    border-right: 1px solid var(--border-color);
    padding: 12px 0;
    overflow-y: auto;
  }

  .sidebar-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sidebar-item:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .sidebar-item.active {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .sidebar-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
  }

  .settings-content {
    flex: 1;
    padding: 32px;
    overflow-y: auto;
  }

  .section-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 24px 0;
  }

  .section-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
    line-height: 1.6;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .setting-item,
  .setting-item-full,
  .notification-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border-color);
  }

  .setting-item-full {
    flex-direction: column;
    align-items: stretch;
  }

  .setting-item:last-child,
  .setting-item-full:last-child,
  .notification-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-info {
    flex: 1;
    min-width: 0;
  }

  .setting-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .setting-description {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-top: 4px;
  }

  .setting-select,
  .setting-input,
  .setting-textarea {
    min-width: 200px;
    padding: 8px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
  }

  .setting-select:focus,
  .setting-input:focus,
  .setting-textarea:focus {
    border-color: var(--accent-blue);
  }

  .setting-textarea {
    width: 100%;
    min-height: 100px;
    resize: vertical;
    margin-top: 8px;
  }

  .setting-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .play-button {
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .play-button:hover {
    background-color: var(--hover-bg);
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
    background-color: var(--bg-tertiary);
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
    background-color: var(--accent-blue);
  }

  .toggle-switch input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  .style-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .style-pill {
    padding: 6px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .style-pill:hover {
    background-color: var(--hover-bg);
    border-color: var(--accent-blue);
  }

  .setting-subsection {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
  }

  .notification-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .notification-description {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-top: 4px;
  }

  .link-text {
    color: var(--accent-blue);
    text-decoration: underline;
    cursor: pointer;
  }

  .connectors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
    margin-top: 24px;
  }

  .connector-card {
    padding: 16px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .connector-card:hover {
    background-color: var(--hover-bg);
    border-color: var(--accent-blue);
  }

  .connector-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .connector-name {
    font-size: 13px;
    color: var(--text-primary);
  }

  .manage-button,
  .delete-button {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    white-space: nowrap;
  }

  .manage-button {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .manage-button:hover {
    background-color: var(--hover-bg);
  }

  .delete-button {
    background-color: #ef4444;
    color: white;
  }

  .delete-button:hover {
    background-color: #dc2626;
  }

  .setting-status {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .setting-section-header {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
  }

  .info-box {
    padding: 16px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 13px;
    margin-top: 12px;
  }

  .preview-box {
    padding: 24px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    text-align: center;
    margin-bottom: 8px;
  }

  .preview-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .preview-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .preview-author {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .preview-label {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }

  .link-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }

  .link-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
  }

  .add-button {
    padding: 4px 12px;
    background-color: var(--accent-blue);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 13px;
    cursor: pointer;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .checkbox-label input {
    margin-right: 8px;
  }
</style>
