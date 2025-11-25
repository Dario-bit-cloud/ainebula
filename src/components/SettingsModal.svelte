<script>
  import { isSettingsOpen } from '../stores/app.js';
  import { chats } from '../stores/chat.js';
  import { user as userStore } from '../stores/user.js';
  import { user as authUser, isAuthenticatedStore, clearUser } from '../stores/auth.js';
  import { deleteAccount } from '../services/authService.js';
  import { getCurrentAccount, removeAccount } from '../stores/accounts.js';
  import { onMount } from 'svelte';
  
  let activeSection = 'generale';
  let theme = 'system';
  let language = 'system';
  let phoneNumber = '';
  
  const sections = [
    { id: 'generale', label: 'Generale', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'profilo', label: 'Profilo', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'dati', label: 'Dati', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    { id: 'informazioni', label: 'Informazioni', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
  ];
  
  onMount(() => {
    // Carica tema salvato
    const savedTheme = localStorage.getItem('nebula-theme');
    if (savedTheme) {
      theme = savedTheme;
      applyTheme(savedTheme);
    }
    
    // Carica lingua salvata
    const savedLanguage = localStorage.getItem('nebula-language');
    if (savedLanguage) {
      language = savedLanguage;
    }
  });
  
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
  
  function applyTheme(newTheme) {
    const root = document.documentElement;
    if (newTheme === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f5f5f5');
      root.style.setProperty('--bg-tertiary', '#e5e5e5');
      root.style.setProperty('--text-primary', '#171717');
      root.style.setProperty('--text-secondary', '#525252');
      root.style.setProperty('--border-color', '#d4d4d4');
    } else if (newTheme === 'dark') {
      root.style.setProperty('--bg-primary', '#171717');
      root.style.setProperty('--bg-secondary', '#1f1f1f');
      root.style.setProperty('--bg-tertiary', '#2a2a2a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#a0a0a0');
      root.style.setProperty('--border-color', '#3a3a3a');
    } else {
      // Sistema - usa preferenza sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.style.setProperty('--bg-primary', '#171717');
        root.style.setProperty('--bg-secondary', '#1f1f1f');
        root.style.setProperty('--bg-tertiary', '#2a2a2a');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#a0a0a0');
        root.style.setProperty('--border-color', '#3a3a3a');
      } else {
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--bg-secondary', '#f5f5f5');
        root.style.setProperty('--bg-tertiary', '#e5e5e5');
        root.style.setProperty('--text-primary', '#171717');
        root.style.setProperty('--text-secondary', '#525252');
        root.style.setProperty('--border-color', '#d4d4d4');
      }
    }
  }
  
  function handleThemeChange(newTheme) {
    theme = newTheme;
    localStorage.setItem('nebula-theme', newTheme);
    applyTheme(newTheme);
  }
  
  function handleLanguageChange() {
    localStorage.setItem('nebula-language', language);
    // Qui potresti implementare il cambio lingua dell'app
  }
  
  function handleDisconnect() {
    if (confirm('Sei sicuro di voler disconnetterti da tutti i dispositivi?')) {
      // Rimuovi token di autenticazione
      localStorage.removeItem('nebula-auth-token');
      localStorage.removeItem('nebula-session');
      alert('Disconnessione completata. Ricarica la pagina.');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }
  
  let isDeletingAccount = false;
  
  async function handleDeleteAccount() {
    // Prima conferma: richiedi di digitare "ELIMINA"
    const firstConfirmation = prompt('⚠️ ATTENZIONE: Questa azione è IRREVERSIBILE!\n\nTutti i tuoi dati verranno eliminati permanentemente:\n- Account e profilo\n- Tutte le chat e messaggi\n- Tutti i progetti\n- Tutte le impostazioni\n- Tutti gli abbonamenti\n\nPer confermare, digita "ELIMINA" in maiuscolo:');
    
    if (firstConfirmation !== 'ELIMINA') {
      if (firstConfirmation !== null) {
        alert('Conferma non valida. Operazione annullata.');
      }
      return;
    }
    
    // Seconda conferma: dialog di conferma finale
    const secondConfirmation = confirm('⚠️ ULTIMA CONFERMA ⚠️\n\nSei ASSOLUTAMENTE SICURO di voler eliminare il tuo account?\n\nQuesta azione NON può essere annullata.\n\nTutti i tuoi dati verranno eliminati permanentemente dal database.');
    
    if (!secondConfirmation) {
      return;
    }
    
    try {
      isDeletingAccount = true;
      
      // Chiama l'API per eliminare l'account
      const result = await deleteAccount();
      
      if (result.success) {
        // Pulisci tutti gli store locali
        clearUser();
        chats.set([]);
        
        // Rimuovi l'account dal sistema account multipli se presente
        const currentAccount = getCurrentAccount();
        if (currentAccount) {
          removeAccount(currentAccount.id);
        }
        
        // Pulisci tutto il localStorage
        localStorage.clear();
        
        alert('✅ Account eliminato con successo. Tutti i dati sono stati rimossi permanentemente.\n\nLa pagina verrà ricaricata.');
        
        // Ricarica la pagina dopo un breve delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        isDeletingAccount = false;
        alert(`❌ Errore durante l'eliminazione dell'account: ${result.message || 'Errore sconosciuto'}`);
      }
    } catch (error) {
      isDeletingAccount = false;
      console.error('Errore durante eliminazione account:', error);
      alert(`❌ Errore durante l'eliminazione dell'account: ${error.message}`);
    }
  }
  
  function handleExportData() {
    const exportData = {
      user: $userStore,
      chats: $chats,
      settings: {
        theme,
        language
      },
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nebula-ai-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Dati esportati con successo! Il file sarà valido per 7 giorni.');
  }
  
  function handleDownloadSubscriptionKey() {
    const userData = $userStore;
    if (!userData.subscription?.key) {
      alert('Nessuna chiave di abbonamento disponibile. Attiva un abbonamento per ottenere una chiave.');
      return;
    }
    
    const keyData = {
      subscriptionKey: userData.subscription.key,
      plan: userData.subscription.plan,
      expiresAt: userData.subscription.expiresAt,
      exportDate: new Date().toISOString(),
      instructions: 'Importa questa chiave nelle impostazioni di un altro dispositivo per ripristinare il tuo abbonamento.'
    };
    
    const blob = new Blob([JSON.stringify(keyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nebula-subscription-key-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Chiave di abbonamento scaricata con successo! Conservala in un luogo sicuro per ripristinare l\'abbonamento su altri dispositivi.');
  }
  
  function handleImportSubscriptionKey() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const keyData = JSON.parse(event.target.result);
          if (keyData.subscriptionKey) {
            // Aggiorna lo store utente con la chiave importata
            userStore.update(user => ({
              ...user,
              subscription: {
                ...user.subscription,
                key: keyData.subscriptionKey,
                plan: keyData.plan || user.subscription.plan,
                expiresAt: keyData.expiresAt || user.subscription.expiresAt,
                active: true
              }
            }));
            alert('Chiave di abbonamento importata con successo!');
          } else {
            alert('File non valido. Il file deve contenere una chiave di abbonamento.');
          }
        } catch (error) {
          alert('Errore durante l\'importazione della chiave. Verifica che il file sia valido.');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
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
    // Apri in una nuova finestra o mostra modal
    window.open('https://nebula-ai.com/terms', '_blank');
  }
  
  function handleViewPrivacy() {
    // Apri in una nuova finestra o mostra modal
    window.open('https://nebula-ai.com/privacy', '_blank');
  }
  
  function handleManageSharedLinks() {
    alert('Gestione link condivisi - Funzionalità in arrivo');
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
        <div class="settings-content" class:content-visible={$isSettingsOpen}>
          <!-- Generale -->
          {#if activeSection === 'generale'}
            <div class="setting-section" class:section-visible={activeSection === 'generale'}>
              <h3 class="setting-title">Tema</h3>
              <div class="theme-buttons">
                <button 
                  class="theme-button" 
                  class:active={theme === 'light'}
                  on:click={() => handleThemeChange('light')}
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
                  on:click={() => handleThemeChange('dark')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                  <span>Scuro</span>
                </button>
                <button 
                  class="theme-button" 
                  class:active={theme === 'system'}
                  on:click={() => handleThemeChange('system')}
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
            
            <div class="setting-section" class:section-visible={activeSection === 'generale'}>
              <h3 class="setting-title">Lingua</h3>
              <select class="setting-select" bind:value={language} on:change={handleLanguageChange}>
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
            <div class="setting-row" class:row-visible={activeSection === 'profilo'}>
              <div class="setting-label">Username</div>
              <div class="setting-value">
                {#if $isAuthenticatedStore && $authUser?.username}
                  {$authUser.username}
                {:else if $userStore.name}
                  {$userStore.name}
                {:else}
                  -
                {/if}
              </div>
            </div>
            
            <div class="setting-row" class:row-visible={activeSection === 'profilo'}>
              <div class="setting-label">Numero di telefono</div>
              <div class="setting-value">{phoneNumber || '-'}</div>
            </div>
            
            <div class="setting-row" class:row-visible={activeSection === 'profilo'}>
              <div class="setting-label">Disconnetti da tutti i dispositivi</div>
              <button class="danger-button" on:click={handleDisconnect}>Disconnetti</button>
            </div>
            
            <div class="setting-row" class:row-visible={activeSection === 'profilo'}>
              <div class="setting-label">Elimina account</div>
              <button class="danger-button" on:click={handleDeleteAccount} disabled={isDeletingAccount}>
                {isDeletingAccount ? 'Eliminazione in corso...' : 'Elimina'}
              </button>
            </div>
          {/if}
          
          <!-- Dati -->
          {#if activeSection === 'dati'}
            <div class="setting-row" class:row-visible={activeSection === 'dati'}>
              <div class="setting-label">Link condivisi</div>
              <button class="manage-button" on:click={handleManageSharedLinks}>Gestisci</button>
            </div>
            
            <div class="setting-row" class:row-visible={activeSection === 'dati'}>
              <div class="setting-info">
                <div class="setting-label">Esporta dati</div>
                <div class="setting-description">Questi dati includono le informazioni del tuo account e tutta la cronologia delle chat. L'esportazione potrebbe richiedere del tempo. Il link per il download sarà valido per 7 giorni.</div>
              </div>
              <button class="manage-button" on:click={handleExportData}>Esporta</button>
            </div>
            
            {#if $userStore.subscription?.active && $userStore.subscription?.key}
              <div class="setting-row" class:row-visible={activeSection === 'dati'}>
                <div class="setting-info">
                  <div class="setting-label">Chiave abbonamento</div>
                  <div class="setting-description">Scarica la chiave del tuo abbonamento per ripristinarlo su altri dispositivi. Conserva questa chiave in un luogo sicuro.</div>
                </div>
                <div class="setting-actions">
                  <button class="manage-button" on:click={handleDownloadSubscriptionKey}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Scarica chiave
                  </button>
                  <button class="manage-button secondary" on:click={handleImportSubscriptionKey}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Importa chiave
                  </button>
                </div>
              </div>
            {/if}
            
            <div class="setting-row" class:row-visible={activeSection === 'dati'}>
              <div class="setting-label">Elimina tutte le chat</div>
              <button class="danger-button" on:click={handleDeleteAllChats}>Cancella tutto</button>
            </div>
          {/if}
          
          <!-- Informazioni -->
          {#if activeSection === 'informazioni'}
            <div class="setting-row" class:row-visible={activeSection === 'informazioni'}>
              <div class="setting-label">Termini di utilizzo</div>
              <button class="view-button" on:click={handleViewTerms}>Visualizza</button>
            </div>
            
            <div class="setting-row" class:row-visible={activeSection === 'informazioni'}>
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
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
    border-bottom: 1px solid #3a3a3a;
    animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 4px;
  }

  .close-button:hover {
    opacity: 0.7;
    background-color: rgba(255, 255, 255, 0.1);
    transform: rotate(90deg);
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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .sidebar-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 3px;
    background-color: #3b82f6;
    transform: scaleY(0);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar-item:hover {
    background-color: #3a3a3a;
    transform: translateX(4px);
  }

  .sidebar-item.active {
    background-color: #3a3a3a;
  }

  .sidebar-item.active::before {
    transform: scaleY(1);
  }

  .sidebar-item svg {
    flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar-item:hover svg {
    transform: scale(1.1);
  }

  .settings-content {
    flex: 1;
    padding: 32px;
    overflow-y: auto;
  }

  .content-visible {
    animation: fadeInContent 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
  }

  @keyframes fadeInContent {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .setting-section {
    margin-bottom: 32px;
    animation: slideInLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  .section-visible {
    animation-delay: 0.1s;
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .theme-button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .theme-button:hover::before {
    width: 300px;
    height: 300px;
  }

  .theme-button:hover {
    background-color: #454545;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .theme-button.active {
    background-color: #3a3a3a;
    border-color: #ffffff;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
  }

  .theme-button svg {
    flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 1;
  }

  .theme-button:hover svg {
    transform: scale(1.1) rotate(5deg);
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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .setting-select:hover {
    border-color: #4a4a4a;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .setting-select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid #3a3a3a;
    animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  .row-visible {
    animation-delay: calc(var(--row-index, 0) * 0.05s);
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }

  .manage-button::before,
  .view-button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .manage-button:hover::before,
  .view-button:hover::before {
    width: 300px;
    height: 300px;
  }

  .manage-button:hover,
  .view-button:hover {
    background-color: #454545;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .manage-button:active,
  .view-button:active {
    transform: translateY(0);
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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }

  .danger-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: rgba(239, 68, 68, 0.1);
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .danger-button:hover::before {
    left: 0;
  }

  .danger-button:hover {
    background-color: rgba(239, 68, 68, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .danger-button:active {
    transform: translateY(0);
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
