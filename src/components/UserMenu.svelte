<script>
  import { user as authUser } from '../stores/auth.js';
  import { isUserMenuOpen, isSidebarOpen, isMobile } from '../stores/app.js';
  import { logout } from '../services/authService.js';
  import { clearUser, setUser as setAuthUser } from '../stores/auth.js';
  import { accounts, currentAccountId, getCurrentAccount, getOtherAccounts, switchAccount, removeAccount } from '../stores/accounts.js';
  import { isAuthModalOpen } from '../stores/app.js';
  import { showConfirm, showAlert } from '../services/dialogService.js';
  
  let hoveredItem = null;
  let activeSubmenu = null;
  let showAccountList = false;
  
  $: currentAccount = getCurrentAccount();
  $: otherAccounts = getOtherAccounts();
  
  const menuItems = [
    {
      id: 'add-colleagues',
      label: 'Aggiungi colleghi',
      icon: 'M12 4v16m8-8H4'
    },
    {
      id: 'workspace-settings',
      label: 'Impostazioni dell\'area di lavoro',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
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
  
  async function handleLogout() {
    const confirmed = await showConfirm('Sei sicuro di voler uscire?', 'Esci', 'Esci', 'Annulla');
    if (confirmed) {
      await logout();
      clearUser();
      isUserMenuOpen.set(false);
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
    } else {
      showAlert(`${submenuItem.label} - Funzionalità in arrivo`, 'Info', 'OK', 'info');
      closeMenu();
    }
  }
  
  async function handleAddAccount() {
    // Apri modal di login/registrazione
    isAuthModalOpen.set(true);
    isUserMenuOpen.set(false);
  }
  
  async function handleSwitchAccount(account) {
    // Cambia account
    switchAccount(account.id);
    
    // Imposta il token nel localStorage
    localStorage.setItem('auth_token', account.token);
    
    // Aggiorna lo store auth
    setAuthUser({
      id: account.userId,
      username: account.username,
      email: account.email
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
</script>

{#if $isUserMenuOpen}
  <div class="menu-backdrop" on:click={handleBackdropClick}>
    <div class="menu-container">
      <!-- Menu principale -->
      <div class="main-menu">
        <!-- Header utente -->
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
              {#if currentAccount}
                <div class="user-workspace">{currentAccount.email || 'Nessun workspace'}</div>
              {/if}
            </div>
          </div>
          <button class="add-account-btn" on:click={handleAddAccount} title="Aggiungi account">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        
        <!-- Lista account (se ci sono altri account) -->
        {#if showAccountList && $accounts.length > 1}
          <div class="accounts-section">
            <div class="accounts-header">Account disponibili</div>
            {#each $accounts as account}
              <button 
                class="account-item"
                class:active={account.id === $currentAccountId}
                on:click={() => handleSwitchAccount(account)}
              >
                <div class="account-avatar-small">
                  {account.username.charAt(0).toUpperCase()}
                </div>
                <div class="account-details">
                  <div class="account-username">{account.username}</div>
                  <div class="account-email">{account.email}</div>
                </div>
                {#if account.id === $currentAccountId}
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
    animation: backdropFadeIn 0.2s ease forwards;
  }

  @keyframes backdropFadeIn {
    to {
      background-color: rgba(0, 0, 0, 0.3);
    }
  }

  .menu-container {
    position: fixed;
    bottom: 80px;
    left: 12px;
    display: flex;
    gap: 8px;
    z-index: 1003;
    animation: menuSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes menuSlideUp {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .main-menu,
  .submenu {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 8px;
    min-width: 280px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: submenuSlideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes submenuSlideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .user-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--border-color);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .user-avatar-small {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-blue), #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
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
  
  .user-workspace {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .accounts-section {
    border-top: 1px solid var(--border-color);
    padding: 8px 0;
    margin-top: 4px;
  }
  
  .accounts-header {
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 12px 4px;
  }
  
  .account-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    position: relative;
  }
  
  .account-item:hover {
    background-color: var(--hover-bg);
  }
  
  .account-item.active {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }
  
  .account-avatar-small {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-blue), #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
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
    font-weight: 500;
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
    color: var(--accent-blue);
    flex-shrink: 0;
  }
  
  .remove-account-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  
  .account-item:hover .remove-account-btn {
    opacity: 1;
  }
  
  .remove-account-btn:hover {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  .add-account-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .add-account-btn:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    transform: translateX(0);
  }

  .menu-item:hover {
    transform: translateX(4px);
  }

  .menu-item:hover,
  .menu-item.hovered {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .menu-item.has-submenu.hovered {
    background-color: var(--bg-tertiary);
  }

  .menu-item svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }

  .arrow-icon {
    margin-left: auto;
  }

  .submenu {
    min-width: 260px;
  }

  .submenu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .submenu-item:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .submenu-item svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }

  @media (max-width: 768px) {
    .menu-container {
      bottom: 12px;
      left: 12px;
      right: 12px;
      max-width: calc(100vw - 24px);
    }

    .main-menu,
    .submenu {
      min-width: auto;
      width: 100%;
      max-width: 100%;
    }

    .user-header {
      padding: 12px;
    }

    .user-avatar-small {
      width: 32px;
      height: 32px;
      font-size: 13px;
    }

    .user-email {
      font-size: 13px;
    }

    .user-workspace {
      font-size: 11px;
    }

    .menu-item {
      padding: 12px 14px;
      font-size: 14px;
      min-height: 48px; /* Touch target più grande */
    }
    
    .menu-item svg {
      width: 20px;
      height: 20px;
    }

    .submenu-item {
      padding: 12px 14px;
      font-size: 14px;
      min-height: 48px;
    }
    
    .submenu-item svg {
      width: 20px;
      height: 20px;
    }
    
    .add-account-btn {
      min-width: 44px;
      min-height: 44px;
      padding: 8px;
    }
    
    .account-item {
      min-height: 56px;
      padding: 12px;
    }
    
    .remove-account-btn {
      min-width: 44px;
      min-height: 44px;
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
      padding: 6px;
    }

    .user-header {
      padding: 8px;
    }

    .user-avatar-small {
      width: 24px;
      height: 24px;
      font-size: 11px;
    }

    .user-email {
      font-size: 11px;
    }

    .user-workspace {
      font-size: 9px;
    }

    .menu-item {
      padding: 8px 10px;
      font-size: 12px;
      gap: 10px;
    }

    .menu-item svg {
      width: 16px;
      height: 16px;
    }

    .submenu-item {
      padding: 8px 10px;
      font-size: 12px;
      gap: 10px;
    }

    .submenu-item svg {
      width: 16px;
      height: 16px;
    }
  }
</style>

