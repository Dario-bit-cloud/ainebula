<script>
  import { user as authUser } from '../stores/auth.js';
  import { isUserMenuOpen } from '../stores/app.js';
  import { logout } from '../services/authService.js';
  import { clearUser } from '../stores/auth.js';
  
  let hoveredItem = null;
  let activeSubmenu = null;
  
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
    if (confirm('Sei sicuro di voler uscire?')) {
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
    } else if (item.id === 'personalization') {
      // Apri modal personalizzazione
      import('../stores/app.js').then(module => {
        module.isPersonalizationModalOpen.set(true);
      });
      isUserMenuOpen.set(false);
    } else {
      alert(`${item.label} - Funzionalità in arrivo`);
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
      alert(`${submenuItem.label} - Funzionalità in arrivo`);
      closeMenu();
    }
  }
  
  function handleAddAccount() {
    alert('Aggiungi account - Funzionalità in arrivo');
  }
</script>

{#if $isUserMenuOpen}
  <div class="menu-backdrop" on:click={handleBackdropClick}>
    <div class="menu-container">
      <!-- Menu principale -->
      <div class="main-menu">
        <!-- Header utente -->
        <div class="user-header">
          <div class="user-info">
            <div class="user-avatar-small">
              {#if $authUser?.username}
                {$authUser.username.charAt(0).toUpperCase()}
              {:else}
                U
              {/if}
            </div>
            <div class="user-email">
              {$authUser?.username || 'Non autenticato'}
            </div>
          </div>
          <button class="add-account-btn" on:click={handleAddAccount} title="Aggiungi account">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        
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
    z-index: 1000;
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
    z-index: 1001;
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

  .user-email {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
</style>

