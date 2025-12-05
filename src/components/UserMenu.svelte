<script>
  import { onMount, onDestroy } from 'svelte';
  import { user as authUser, setUser, isAuthenticatedStore } from '../stores/auth.js';
  import { isUserMenuOpen, isSidebarOpen, isMobile, isIncognitoMode } from '../stores/app.js';
  import { signOut } from '../services/neonAuthService.js';
  import { clearUser } from '../stores/auth.js';
  import { accounts, currentAccountId, currentAccount, otherAccounts, switchAccount, removeAccount } from '../stores/accounts.js';
  import { showConfirm, showAlert } from '../services/dialogService.js';
  import { get } from 'svelte/store';
  import { createNewChat } from '../stores/chat.js';
  import { getUserStats, getUserWorkspaces, checkDatabaseConnection, invalidateUserStatsCache } from '../services/userProfileService.js';

  let hoveredItem = null;
  let activeSubmenu = null;
  let showAccountList = false;
  
  // Stati dinamici dal database
  let userStats = null;
  let workspaces = [];
  let dbStatus = { connected: false, latency: null, status: 'checking' };
  let isLoadingStats = true;
  let isLoadingWorkspaces = true;
  let refreshInterval = null;

  const menuItems = [
    {
      id: 'add-colleagues',
      label: 'Aggiungi colleghi',
      icon: 'M12 4v16m8-8H4'
    },
    {
      id: 'personalization',
      label: 'Personalizzazione',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      id: 'settings',
      label: 'Impostazioni',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    },
    {
      id: 'help',
      label: 'Guida',
      icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
      hasSubmenu: true,
      submenu: [
        { id: 'help-center', label: 'Centro assistenza', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'release-notes', label: 'Note sulla versione', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
        { id: 'terms', label: 'Termini e politiche', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { id: 'report-bug', label: 'Segnala bug', icon: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9' },
        { id: 'download-app', label: 'Scarica app', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
        { id: 'shortcuts', label: 'Scorciatoie da tastiera', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
      ]
    },
    {
      id: 'logout',
      label: 'Esci',
      icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
    }
  ];

  // Carica dati dinamici quando il menu si apre
  async function loadDynamicData() {
    if (!$isAuthenticatedStore) return;
    
    isLoadingStats = true;
    isLoadingWorkspaces = true;
    
    // Carica in parallelo
    const [statsResult, workspacesResult, dbResult] = await Promise.all([
      getUserStats(),
      getUserWorkspaces(),
      checkDatabaseConnection()
    ]);
    
    if (statsResult.success) {
      userStats = statsResult.stats;
    }
    isLoadingStats = false;
    
    if (workspacesResult.success) {
      workspaces = workspacesResult.workspaces;
    }
    isLoadingWorkspaces = false;
    
    dbStatus = dbResult;
  }

  // Refresh periodico dei dati
  function startRefreshInterval() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(async () => {
      if ($isUserMenuOpen && $isAuthenticatedStore) {
        const dbResult = await checkDatabaseConnection();
        dbStatus = dbResult;
      }
    }, 30000); // Ogni 30 secondi
  }

  onMount(() => {
    if ($isUserMenuOpen && $isAuthenticatedStore) {
      loadDynamicData();
      startRefreshInterval();
    }
  });

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval);
  });

  // Reagisce all'apertura del menu
  $: if ($isUserMenuOpen && $isAuthenticatedStore) {
    loadDynamicData();
    startRefreshInterval();
  } else if (!$isUserMenuOpen && refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }

  async function handleRefreshStats() {
    invalidateUserStatsCache();
    await loadDynamicData();
  }

  async function handleLogout() {
    const confirmed = await showConfirm('Sei sicuro di voler uscire?', 'Esci', 'Esci', 'Annulla');
    if (confirmed) {
      try {
        // Logout da Neon Auth
        await signOut();
        // Pulisci lo store locale
        clearUser();
        isUserMenuOpen.set(false);
        // Ricarica la pagina per resettare tutto
        window.location.reload();
      } catch (error) {
        console.error('Errore durante il logout:', error);
        // Fallback: pulisci comunque e ricarica
        clearUser();
        window.location.reload();
      }
    }
  }

  function handleItemClick(item) {
    if (item.id === 'logout') {
      handleLogout();
    } else if (item.id === 'add-colleagues') {
      // Apri modal invita membri (già esiste)
      import('../stores/app.js').then(module => {
        module.isInviteModalOpen.set(true);
      });
      isUserMenuOpen.set(false);
    } else if (item.id === 'settings') {
      // Apri modal impostazioni (già esiste)
      import('../stores/app.js').then(module => {
        module.isSettingsOpen.set(true);
      });
      isUserMenuOpen.set(false);
      // Chiudi la sidebar su mobile quando si apre il popup impostazioni
      if ($isMobile) {
        isSidebarOpen.set(false);
      }
    } else if (item.id === 'personalization') {
      // Apri modal personalizzazione
      import('../stores/app.js').then(module => {
        module.isPersonalizationModalOpen.set(true);
      });
      isUserMenuOpen.set(false);
    } else {
      showAlert(`${item.label} - Funzionalità in arrivo`, 'Info', 'OK', 'info');
      if (!item.hasSubmenu) {
        isUserMenuOpen.set(false);
      }
    }
  }

  function handleItemHover(item) {
    hoveredItem = item.id;
    if (item.hasSubmenu) {
      activeSubmenu = item;
    } else {
      activeSubmenu = null;
    }
  }

  function closeMenu() {
    isUserMenuOpen.set(false);
    hoveredItem = null;
    activeSubmenu = null;
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeMenu();
    }
  }

  function handleSubmenuClick(submenuItem) {
    if (submenuItem.id === 'shortcuts') {
      import('../stores/app.js').then(module => {
        module.isShortcutsModalOpen.set(true);
      });
      closeMenu();
    } else if (submenuItem.id === 'report-bug') {
      import('../stores/app.js').then(module => {
        module.isReportBugModalOpen.set(true);
      });
      closeMenu();
    } else if (submenuItem.id === 'help-center') {
      import('../stores/app.js').then(module => {
        module.isHelpCenterModalOpen.set(true);
      });
      closeMenu();
    } else if (submenuItem.id === 'release-notes') {
      import('../stores/app.js').then(module => {
        module.isReleaseNotesModalOpen.set(true);
      });
      closeMenu();
    } else if (submenuItem.id === 'terms') {
      import('../stores/app.js').then(module => {
        module.isTermsModalOpen.set(true);
      });
      closeMenu();
    } else if (submenuItem.id === 'download-app') {
      import('../stores/app.js').then(module => {
        module.isDownloadAppModalOpen.set(true);
      });
      closeMenu();
    } else {
      showAlert(`${submenuItem.label} - Funzionalità in arrivo`, 'Info', 'OK', 'info');
      closeMenu();
    }
  }

  async function handleAddAccount() {
    // Per aggiungere un account, l'utente deve fare logout e login con un altro account
    // Oppure può aprire il modal di autenticazione
    const { isAuthModalOpen } = await import('../stores/app.js');
    isAuthModalOpen.set(true);
    isUserMenuOpen.set(false);
  }

  async function handleSwitchAccount(account) {
    if (!account) return;
    
    // Disattiva modalità incognito quando si cambia account
    isIncognitoMode.set(false);
    
    // Cambia account nel sistema
    switchAccount(account.id);
    
    // Se l'account ha un token, impostalo
    if (account.token) {
      localStorage.setItem('auth_token', account.token);
    }
    
    // Aggiorna lo store auth con i dati dell'account
    await setUser({
      id: account.id,
      username: account.username
    });
    
    // Ricarica la pagina per applicare il cambio account
    window.location.reload();
  }

  async function handleRemoveAccount(event, accountId) {
    event.stopPropagation();
    
    const confirmed = await showConfirm('Sei sicuro di voler rimuovere questo account?', 'Rimuovi account', 'Rimuovi', 'Annulla', 'danger');
    if (confirmed) {
      removeAccount(accountId);
      
      // Se era l'account corrente, ricarica
      if (get(currentAccountId) === accountId) {
        window.location.reload();
      }
    }
  }

  function toggleAccountList() {
    showAccountList = !showAccountList;
  }

  async function toggleIncognitoMode() {
    const currentIncognito = get(isIncognitoMode);
    isIncognitoMode.set(!currentIncognito);
    
    // Se si attiva la modalità incognito, crea una nuova chat
    if (!currentIncognito) {
      await createNewChat();
    }
    
    isUserMenuOpen.set(false);
  }

  function getStatusColor(status) {
    switch(status) {
      case 'online': return '#22c55e';
      case 'offline': return '#ef4444';
      case 'checking': return '#eab308';
      default: return '#6b7280';
    }
  }

  function formatLatency(latency) {
    if (latency === null) return '—';
    if (latency < 100) return `${latency}ms ⚡`;
    if (latency < 300) return `${latency}ms`;
    return `${latency}ms 🐢`;
  }
</script>

{#if $isUserMenuOpen}
  <div class="menu-backdrop" on:click={handleBackdropClick}>
    <div class="menu-container">
      <!-- Menu principale -->
      <div class="main-menu">
        <!-- Header utente con stato DB -->
        <div class="user-header">
          <div class="user-info" on:click={toggleAccountList} style="cursor: pointer;">
            <div class="user-avatar-small">
              {#if $authUser?.username}
                {$authUser.username.charAt(0).toUpperCase()}
              {:else}
                U
              {/if}
            </div>
            <div class="user-details-col">
              <div class="user-email">
                {$authUser?.username || 'Non autenticato'}
              </div>
              <div class="user-workspace-row">
                <span class="db-status-dot" style="background-color: {getStatusColor(dbStatus.status)}"></span>
                <span class="user-workspace">
                  {#if $isAuthenticatedStore}
                    {dbStatus.status === 'online' ? 'Connesso' : dbStatus.status === 'checking' ? 'Verifica...' : 'Offline'}
                    {#if dbStatus.latency !== null}
                      <span class="latency-badge">{formatLatency(dbStatus.latency)}</span>
                    {/if}
                  {:else}
                    Nessun workspace
                  {/if}
                </span>
              </div>
            </div>
          </div>
          <div class="header-actions">
            <button class="refresh-btn" on:click|stopPropagation={handleRefreshStats} title="Aggiorna statistiche">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class:spinning={isLoadingStats}>
                <path d="M21 12a9 9 0 11-3-6.7"/>
                <path d="M21 4v5h-5"/>
              </svg>
            </button>
            <button class="add-account-btn" on:click={handleAddAccount} title="Aggiungi account">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Statistiche utente dinamiche -->
        {#if $isAuthenticatedStore}
          <div class="stats-section">
            {#if isLoadingStats}
              <div class="stats-grid">
                <div class="stat-item skeleton">
                  <div class="skeleton-text"></div>
                  <div class="skeleton-value"></div>
                </div>
                <div class="stat-item skeleton">
                  <div class="skeleton-text"></div>
                  <div class="skeleton-value"></div>
                </div>
                <div class="stat-item skeleton">
                  <div class="skeleton-text"></div>
                  <div class="skeleton-value"></div>
                </div>
              </div>
            {:else if userStats}
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <span class="stat-value">{userStats.totalChats}</span>
                    <span class="stat-label">Chat</span>
                  </div>
                </div>
                <div class="stat-item">
                  <div class="stat-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <span class="stat-value">{userStats.totalMessages}</span>
                    <span class="stat-label">Messaggi</span>
                  </div>
                </div>
                <div class="stat-item">
                  <div class="stat-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <span class="stat-value">{userStats.storageMB}</span>
                    <span class="stat-label">MB</span>
                  </div>
                </div>
              </div>
              {#if userStats.lastActivityFormatted && userStats.lastActivityFormatted !== 'Mai'}
                <div class="last-activity">
                  Ultima attività: {userStats.lastActivityFormatted}
                </div>
              {/if}
            {:else}
              <div class="stats-empty">
                <span>Nessuna statistica disponibile</span>
              </div>
            {/if}
          </div>
        {/if}
        
        <!-- Lista account e modalità incognito -->
        {#if showAccountList}
          <div class="accounts-section">
            <div class="accounts-header">Account disponibili</div>
            
            <!-- Modalità Incognito -->
            <button 
              class="account-item incognito-item"
              class:active={$isIncognitoMode}
              on:click={toggleIncognitoMode}
            >
              <div class="account-avatar-small incognito-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </div>
              <div class="account-details">
                <div class="account-username">Incognito</div>
                <div class="account-email">Chat temporanee</div>
              </div>
              {#if $isIncognitoMode}
                <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              {/if}
            </button>
            
            <!-- Account registrati -->
            {#each $accounts as account}
              <button 
                class="account-item"
                class:active={account.id === $currentAccountId && !$isIncognitoMode}
                on:click={() => handleSwitchAccount(account)}
              >
                <div class="account-avatar-small">
                  {account.username.charAt(0).toUpperCase()}
                </div>
                <div class="account-details">
                  <div class="account-username">{account.username}</div>
                </div>
                {#if account.id === $currentAccountId && !$isIncognitoMode}
                  <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                {:else if $accounts.length > 1}
                  <button 
                    class="remove-account-btn"
                    on:click={(e) => handleRemoveAccount(e, account.id)}
                    title="Rimuovi account"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Workspace dinamici -->
        {#if $isAuthenticatedStore && workspaces.length > 0}
          <div class="workspaces-section">
            <div class="workspaces-header">
              <span>Progetti</span>
              <span class="workspace-count">{workspaces.length}</span>
            </div>
            <div class="workspaces-list">
              {#each workspaces.slice(0, 3) as workspace}
                <div class="workspace-item">
                  <div class="workspace-color" style="background-color: {workspace.color}"></div>
                  <div class="workspace-info">
                    <span class="workspace-name">{workspace.name}</span>
                    {#if workspace.chatCount > 0}
                      <span class="workspace-chat-count">{workspace.chatCount} chat</span>
                    {/if}
                  </div>
                </div>
              {/each}
              {#if workspaces.length > 3}
                <button class="view-all-workspaces" on:click={() => { closeMenu(); import('../stores/app.js').then(m => m.isProjectModalOpen.set(true)); }}>
                  Vedi tutti ({workspaces.length})
                </button>
              {/if}
            </div>
          </div>
        {/if}
        
        <!-- Menu items -->
        {#each menuItems as item}
          <button
            class="menu-item"
            class:has-submenu={item.hasSubmenu}
            class:hovered={hoveredItem === item.id}
            on:click={() => !item.hasSubmenu && handleItemClick(item)}
            on:mouseenter={() => handleItemHover(item)}
          >
            {#if item.id === 'add-colleagues'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            {:else}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d={item.icon}/>
              </svg>
            {/if}
            <span>{item.label}</span>
            {#if item.hasSubmenu}
              <svg class="arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            {/if}
          </button>
        {/each}
      </div>
      
      <!-- Submenu -->
      {#if activeSubmenu && activeSubmenu.submenu}
        <div class="submenu">
          {#each activeSubmenu.submenu as submenuItem}
            <button
              class="submenu-item"
              on:click={() => handleSubmenuClick(submenuItem)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d={submenuItem.icon}/>
              </svg>
              <span>{submenuItem.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .menu-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1002;
    background-color: transparent;
    animation: backdropFadeIn 0.25s ease forwards;
    backdrop-filter: blur(0);
  }

  @keyframes backdropFadeIn {
    to {
      background-color: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
    }
  }

  .menu-container {
    position: fixed;
    bottom: 80px;
    left: 12px;
    display: flex;
    gap: 8px;
    z-index: 1003;
    animation: menuSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes menuSlideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.92);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .main-menu,
  .submenu {
    background: linear-gradient(180deg, 
      var(--bg-secondary) 0%,
      var(--bg-primary) 100%
    );
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 10px;
    min-width: 300px;
    box-shadow: 
      0 20px 50px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    animation: submenuSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: bottom left;
  }

  @keyframes submenuSlideIn {
    from {
      opacity: 0;
      transform: translateX(-15px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  .user-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px;
    margin-bottom: 6px;
    border-bottom: 1px solid var(--border-color);
    border-radius: 10px 10px 0 0;
    transition: background-color 0.2s ease;
  }

  .user-header:hover {
    background-color: rgba(99, 102, 241, 0.05);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
    transition: transform 0.2s ease;
  }

  .user-info:hover {
    transform: translateX(2px);
  }

  .user-avatar-small {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 15px;
    font-weight: 700;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .user-info:hover .user-avatar-small {
    transform: scale(1.08) rotate(-3deg);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
  }

  .user-details-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .user-email {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-workspace-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .db-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .user-workspace {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .latency-badge {
    font-size: 9px;
    padding: 2px 6px;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
    border-radius: 6px;
    color: #22c55e;
    font-weight: 600;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .refresh-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 8px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .refresh-btn:hover {
    background: var(--hover-bg);
    border-color: #6366f1;
    color: #6366f1;
    transform: rotate(180deg);
  }

  .refresh-btn:active {
    transform: rotate(180deg) scale(0.95);
  }

  .refresh-btn .spinning {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Stats Section */
  .stats-section {
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-color);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: linear-gradient(135deg, 
      var(--bg-tertiary) 0%,
      rgba(99, 102, 241, 0.05) 100%
    );
    border-radius: 12px;
    border: 1px solid transparent;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: default;
    position: relative;
    overflow: hidden;
  }

  .stat-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    transition: left 0.5s ease;
  }

  .stat-item:hover::before {
    left: 100%;
  }

  .stat-item:hover {
    background: linear-gradient(135deg, 
      var(--hover-bg) 0%,
      rgba(99, 102, 241, 0.1) 100%
    );
    border-color: rgba(99, 102, 241, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .stat-item:active {
    transform: translateY(0) scale(0.98);
  }

  .stat-item.skeleton {
    justify-content: center;
  }

  .skeleton-text {
    width: 40px;
    height: 10px;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--hover-bg) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
  }

  .skeleton-value {
    width: 24px;
    height: 14px;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--hover-bg) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
    margin-top: 4px;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .stat-icon {
    color: #6366f1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 6px;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .stat-item:hover .stat-icon {
    background: rgba(99, 102, 241, 0.2);
    transform: scale(1.1);
  }

  .stat-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .stat-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
    transition: color 0.2s ease;
  }

  .stat-item:hover .stat-value {
    color: #6366f1;
  }

  .stat-label {
    font-size: 10px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  .last-activity {
    font-size: 11px;
    color: var(--text-secondary);
    text-align: center;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed var(--border-color);
    opacity: 0.8;
  }

  .stats-empty {
    text-align: center;
    padding: 12px;
    color: var(--text-secondary);
    font-size: 12px;
  }

  /* Workspaces Section */
  .workspaces-section {
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-color);
  }

  .workspaces-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 10px;
  }

  .workspace-count {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.1));
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 10px;
    color: #6366f1;
    font-weight: 600;
  }

  .workspaces-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .workspace-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
  }

  .workspace-item:hover {
    background: var(--hover-bg);
    border-color: var(--border-color);
    transform: translateX(4px);
  }

  .workspace-item:active {
    transform: translateX(4px) scale(0.98);
  }

  .workspace-color {
    width: 14px;
    height: 14px;
    border-radius: 5px;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease;
  }

  .workspace-item:hover .workspace-color {
    transform: scale(1.2);
  }

  .workspace-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  .workspace-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .workspace-chat-count {
    font-size: 10px;
    color: var(--text-secondary);
    background: var(--bg-tertiary);
    padding: 2px 8px;
    border-radius: 10px;
    flex-shrink: 0;
    font-weight: 500;
  }

  .view-all-workspaces {
    background: transparent;
    border: 1px dashed var(--border-color);
    color: #6366f1;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    padding: 8px 12px;
    text-align: center;
    transition: all 0.2s ease;
    border-radius: 10px;
    margin-top: 4px;
  }

  .view-all-workspaces:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: #6366f1;
    border-style: solid;
  }
  
  .accounts-section {
    border-top: 1px solid var(--border-color);
    padding: 10px 0;
    margin-top: 6px;
    animation: accountsSlideIn 0.3s ease;
  }

  @keyframes accountsSlideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .accounts-header {
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 8px 14px 6px;
  }
  
  .account-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  
  .account-item:hover {
    background: linear-gradient(90deg, 
      rgba(99, 102, 241, 0.08) 0%,
      transparent 100%
    );
    transform: translateX(4px);
  }

  .account-item:active {
    transform: translateX(4px) scale(0.98);
  }
  
  .account-item.active {
    background: linear-gradient(90deg, 
      rgba(99, 102, 241, 0.12) 0%,
      rgba(99, 102, 241, 0.02) 100%
    );
    color: var(--text-primary);
  }
  
  .incognito-item {
    border: 1px dashed var(--border-color);
    margin: 0 10px 6px;
    width: calc(100% - 20px);
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(107, 114, 128, 0.03) 10px,
      rgba(107, 114, 128, 0.03) 20px
    );
  }
  
  .incognito-item:hover {
    border-color: #6b7280;
    background: linear-gradient(90deg, 
      rgba(107, 114, 128, 0.1) 0%,
      transparent 100%
    );
  }
  
  .incognito-item.active {
    background: linear-gradient(90deg, 
      rgba(107, 114, 128, 0.15) 0%,
      rgba(107, 114, 128, 0.05) 100%
    );
    border-color: #6b7280;
    border-style: solid;
  }
  
  .incognito-avatar {
    background: linear-gradient(135deg, #6b7280, #4b5563);
    box-shadow: 0 2px 8px rgba(107, 114, 128, 0.3);
  }
  
  .account-avatar-small {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    transition: all 0.25s ease;
  }

  .account-item:hover .account-avatar-small {
    transform: scale(1.08);
  }
  
  .account-details {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .account-username {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .account-email {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .check-icon {
    color: #22c55e;
    flex-shrink: 0;
    animation: checkPop 0.3s ease;
  }

  @keyframes checkPop {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  
  .remove-account-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  
  .account-item:hover .remove-account-btn {
    opacity: 1;
  }
  
  .remove-account-btn:hover {
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    transform: scale(1.1);
  }

  .add-account-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 8px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
  }

  .add-account-btn:hover {
    background: linear-gradient(135deg, #6366f1, #a855f7);
    border-color: transparent;
    color: white;
    transform: rotate(90deg) scale(1.1);
    box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
  }

  .menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .menu-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 0;
    background: linear-gradient(180deg, #6366f1, #a855f7);
    border-radius: 0 3px 3px 0;
    transition: height 0.25s ease;
  }

  .menu-item:hover::before {
    height: 50%;
  }

  .menu-item:hover {
    transform: translateX(6px);
    background: linear-gradient(90deg, 
      rgba(99, 102, 241, 0.1) 0%,
      transparent 100%
    );
    color: var(--text-primary);
  }

  .menu-item:active {
    transform: translateX(6px) scale(0.98);
  }

  .menu-item.hovered {
    background: linear-gradient(90deg, 
      rgba(99, 102, 241, 0.12) 0%,
      transparent 100%
    );
    color: var(--text-primary);
  }

  .menu-item.has-submenu.hovered {
    background: linear-gradient(90deg, 
      rgba(99, 102, 241, 0.15) 0%,
      rgba(99, 102, 241, 0.05) 100%
    );
  }

  .menu-item svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    transition: transform 0.25s ease, color 0.2s ease;
  }

  .menu-item:hover svg {
    transform: scale(1.1);
    color: #6366f1;
  }

  .arrow-icon {
    margin-left: auto;
    transition: transform 0.25s ease !important;
  }

  .menu-item.has-submenu.hovered .arrow-icon {
    transform: translateX(4px) scale(1.1) !important;
  }

  .submenu {
    min-width: 280px;
  }

  .submenu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .submenu-item:hover {
    background: linear-gradient(90deg, 
      rgba(99, 102, 241, 0.1) 0%,
      transparent 100%
    );
    color: var(--text-primary);
    transform: translateX(4px);
  }

  .submenu-item:active {
    transform: translateX(4px) scale(0.98);
  }

  .submenu-item svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    transition: all 0.2s ease;
  }

  .submenu-item:hover svg {
    transform: scale(1.1);
    color: #6366f1;
  }

  @media (max-width: 768px) {
    .menu-container {
      bottom: 12px;
      left: 12px;
      right: 12px;
      max-width: calc(100vw - 24px);
      flex-direction: column;
    }

    .main-menu,
    .submenu {
      min-width: auto;
      width: 100%;
      max-width: 100%;
      border-radius: 20px;
    }

    .user-header {
      padding: 16px;
    }

    .user-avatar-small {
      width: 44px;
      height: 44px;
      font-size: 16px;
      border-radius: 14px;
    }

    .user-email {
      font-size: 15px;
    }

    .user-workspace {
      font-size: 12px;
    }

    .menu-item {
      padding: 14px 16px;
      font-size: 15px;
      min-height: 52px;
      touch-action: manipulation;
      border-radius: 14px;
    }
    
    .menu-item svg {
      width: 22px;
      height: 22px;
    }

    .menu-item:hover {
      transform: translateX(8px);
    }

    .menu-item:active {
      transform: translateX(8px) scale(0.97);
    }

    .submenu-item {
      padding: 14px 16px;
      font-size: 15px;
      min-height: 52px;
      touch-action: manipulation;
      border-radius: 14px;
    }
    
    .submenu-item svg {
      width: 22px;
      height: 22px;
    }
    
    .add-account-btn,
    .refresh-btn {
      min-width: 44px;
      min-height: 44px;
      padding: 10px;
      border-radius: 12px;
    }
    
    .account-item {
      min-height: 60px;
      padding: 14px;
      border-radius: 14px;
    }

    .account-avatar-small {
      width: 38px;
      height: 38px;
      font-size: 15px;
    }
    
    .remove-account-btn {
      min-width: 44px;
      min-height: 44px;
      border-radius: 10px;
      opacity: 0.7;
    }

    .stats-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .stat-item {
      padding: 12px 10px;
      border-radius: 14px;
      flex-direction: column;
      text-align: center;
    }

    .stat-icon {
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 18px;
    }

    .stat-label {
      font-size: 9px;
    }

    .workspace-item {
      min-height: 48px;
      padding: 12px 14px;
      border-radius: 12px;
    }

    .incognito-item {
      margin: 0 12px 8px;
      width: calc(100% - 24px);
      border-radius: 14px;
    }
  }

  @media (max-width: 480px) {
    .menu-container {
      bottom: 8px;
      left: 8px;
      right: 8px;
      max-width: calc(100vw - 16px);
    }

    .main-menu,
    .submenu {
      padding: 8px;
      border-radius: 18px;
    }

    .user-header {
      padding: 12px;
    }

    .user-avatar-small {
      width: 36px;
      height: 36px;
      font-size: 14px;
      border-radius: 12px;
    }

    .user-email {
      font-size: 13px;
    }

    .user-workspace {
      font-size: 10px;
    }

    .menu-item {
      padding: 12px 14px;
      font-size: 14px;
      gap: 12px;
      min-height: 48px;
    }

    .menu-item svg {
      width: 20px;
      height: 20px;
    }

    .submenu-item {
      padding: 12px 14px;
      font-size: 14px;
      gap: 12px;
      min-height: 48px;
    }

    .submenu-item svg {
      width: 20px;
      height: 20px;
    }

    .stat-item {
      padding: 10px 8px;
    }

    .stat-value {
      font-size: 16px;
    }

    .stats-section {
      padding: 8px 10px;
    }

    .workspaces-section {
      padding: 8px 10px;
    }

    .accounts-section {
      padding: 8px 0;
    }
  }
</style>
