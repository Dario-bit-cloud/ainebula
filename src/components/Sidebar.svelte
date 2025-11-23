<script>
  import { user as userStore } from '../stores/user.js';
  import { chats, currentChatId, createNewChat, loadChat, deleteChat } from '../stores/chat.js';
  import { selectedModel, setModel } from '../stores/models.js';
  import { sidebarView, isSearchOpen, searchQuery, isInviteModalOpen, isProjectModalOpen, isUserMenuOpen, isSidebarOpen, isMobile } from '../stores/app.js';
  import { createProject } from '../stores/projects.js';
  
  let activeItem = 'new-chat';
  let searchInput = '';
  let filteredChats = [];
  let showChatList = true;
  
  $: {
    if ($searchQuery) {
      filteredChats = $chats.filter(chat => 
        chat.title.toLowerCase().includes($searchQuery.toLowerCase()) ||
        chat.messages.some(msg => msg.content.toLowerCase().includes($searchQuery.toLowerCase()))
      );
    } else {
      filteredChats = $chats.slice(0, 10); // Mostra le ultime 10 chat
    }
  }
  
  // Aggiorna activeItem in base alla vista corrente
  $: {
    if ($sidebarView === 'chat') {
      // Quando si è in una chat, nessun item del menu è attivo
      activeItem = null;
    } else if ($sidebarView === 'search') {
      activeItem = 'search';
    } else if ($sidebarView === 'library') {
      activeItem = 'library';
    }
  }
  
  function handleMenuClick(itemId) {
    switch(itemId) {
      case 'new-chat':
        createNewChat();
        sidebarView.set('chat');
        activeItem = null; // Nessun item attivo quando si è in una chat
        if ($isMobile) {
          isSidebarOpen.set(false);
        }
        break;
      case 'search':
        isSearchOpen.set(true);
        sidebarView.set('search');
        activeItem = 'search';
        break;
      case 'library':
        sidebarView.set('library');
        activeItem = 'library';
        showChatList = true;
        break;
      case 'codex':
        setModel('codex');
        sidebarView.set('chat');
        activeItem = null;
        if ($isMobile) {
          isSidebarOpen.set(false);
        }
        break;
      case 'gpt':
        setModel('gpt-4');
        sidebarView.set('chat');
        activeItem = null;
        if ($isMobile) {
          isSidebarOpen.set(false);
        }
        break;
      case 'projects':
        isProjectModalOpen.set(true);
        if ($isMobile) {
          isSidebarOpen.set(false);
        }
        break;
    }
  }
  
  function handleChatClick(chatId) {
    loadChat(chatId);
    sidebarView.set('chat');
    activeItem = null; // Nessun item attivo quando si è in una chat
    isSearchOpen.set(false);
    searchQuery.set('');
    if ($isMobile) {
      isSidebarOpen.set(false);
    }
  }

  function closeSidebar() {
    isSidebarOpen.set(false);
  }
  
  function handleDeleteChat(event, chatId) {
    event.stopPropagation();
    if (confirm('Sei sicuro di voler eliminare questa chat?')) {
      deleteChat(chatId);
    }
  }
  
  function handleInviteClick() {
    isInviteModalOpen.set(true);
    if ($isMobile) {
      isSidebarOpen.set(false);
    }
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Oggi';
    if (days === 1) return 'Ieri';
    if (days < 7) return `${days} giorni fa`;
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  }
</script>

{#if $isMobile && $isSidebarOpen}
  <div class="sidebar-overlay" on:click={closeSidebar}></div>
{/if}

<aside class="sidebar" class:sidebar-open={$isSidebarOpen} class:sidebar-mobile={$isMobile}>
  {#if $isMobile}
    <div class="sidebar-header-mobile">
      <h3>Menu</h3>
      <button class="close-sidebar-btn" on:click={closeSidebar}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  {/if}
  <nav class="sidebar-nav">
    {#each [
      { id: 'new-chat', label: 'Nuova chat', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
      { id: 'search', label: 'Cerca chat', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
      { id: 'library', label: 'Libreria', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
      { id: 'codex', label: 'Codex', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'gpt', label: 'GPT', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
      { id: 'projects', label: 'Progetti', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' }
    ] as item}
      <button 
        class="nav-item" 
        class:active={activeItem === item.id}
        on:click={() => handleMenuClick(item.id)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d={item.icon} />
        </svg>
        <span>{item.label}</span>
        {#if item.id === 'projects'}
          <svg class="plus-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        {/if}
      </button>
    {/each}
    
    {#if $sidebarView === 'search' || $sidebarView === 'library'}
      <div class="chat-list">
        {#if $sidebarView === 'search'}
          <div class="search-input-wrapper">
            <input 
              type="text" 
              class="search-input" 
              placeholder="Cerca nelle chat..."
              bind:value={searchInput}
              on:input={(e) => searchQuery.set(e.target.value)}
            />
          </div>
        {/if}
        
        {#if filteredChats.length > 0}
          {#each filteredChats as chat}
            <div 
              class="chat-item" 
              class:active={chat.id === $currentChatId}
              on:click={() => handleChatClick(chat.id)}
            >
              <div class="chat-info">
                <div class="chat-title">{chat.title}</div>
                <div class="chat-date">{formatDate(chat.updatedAt)}</div>
              </div>
              <button 
                class="chat-delete" 
                on:click={(e) => handleDeleteChat(e, chat.id)}
                title="Elimina chat"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          {/each}
        {:else if $sidebarView === 'search' && $searchQuery}
          <div class="empty-state">
            <p>Nessuna chat trovata</p>
          </div>
        {:else}
          <div class="empty-state">
            <p>Nessuna chat ancora</p>
            <p class="empty-hint">Crea una nuova chat per iniziare</p>
          </div>
        {/if}
      </div>
    {/if}
  </nav>
  
  <div class="user-section">
    <button class="user-info" on:click={() => isUserMenuOpen.set(!$isUserMenuOpen)}>
      <div class="user-avatar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="user-details">
        <div class="username">{$userStore.name || 'Utente'}</div>
        <div class="workspace">{$userStore.email || 'Nessun workspace'}</div>
      </div>
    </button>
    <button class="invite-button" on:click={handleInviteClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
      <span>Invita membri del team</span>
    </button>
  </div>
</aside>

<style>
  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 998;
    animation: overlayFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes overlayFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .sidebar {
    width: 240px;
    background-color: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color);
    height: 100%;
    animation: sidebarSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 999;
  }

  @keyframes sidebarSlideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .sidebar-header-mobile {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .sidebar-header-mobile h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .close-sidebar-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .close-sidebar-btn:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      z-index: 999;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
    }

    .sidebar.sidebar-open {
      transform: translateX(0);
    }

    .sidebar-header-mobile {
      display: flex;
    }
  }

  .sidebar-nav {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    text-align: left;
    flex-shrink: 0;
    transform: translateX(0);
  }

  .nav-item:hover {
    transform: translateX(4px);
  }

  .nav-item:active {
    transform: translateX(2px) scale(0.98);
  }

  .nav-item:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .nav-item.active {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .nav-item svg {
    flex-shrink: 0;
  }

  .plus-icon {
    margin-left: auto;
    opacity: 0.6;
  }

  .chat-list {
    margin-top: 8px;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .search-input-wrapper {
    padding: 8px;
  }

  .search-input {
    width: 100%;
    padding: 8px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .search-input:focus {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    transform: scale(1.02);
  }

  .search-input::placeholder {
    color: var(--text-secondary);
  }

  .chat-item {
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    animation: chatItemSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation-fill-mode: both;
  }

  .chat-item:nth-child(1) { animation-delay: 0.05s; }
  .chat-item:nth-child(2) { animation-delay: 0.1s; }
  .chat-item:nth-child(3) { animation-delay: 0.15s; }
  .chat-item:nth-child(4) { animation-delay: 0.2s; }
  .chat-item:nth-child(n+5) { animation-delay: 0.25s; }

  @keyframes chatItemSlideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .chat-item:hover {
    background-color: var(--hover-bg);
  }

  .chat-item.active {
    background-color: var(--bg-tertiary);
  }

  .chat-item:hover .chat-delete {
    opacity: 1;
  }

  .chat-info {
    flex: 1;
    min-width: 0;
  }

  .chat-title {
    font-size: 13px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }

  .chat-date {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .chat-delete {
    opacity: 0;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    border-radius: 4px;
    transform: scale(0.9);
  }

  .chat-item:hover .chat-delete {
    opacity: 1;
    transform: scale(1);
  }

  .chat-delete:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
    transform: scale(1.1);
  }

  .empty-state {
    padding: 24px 12px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .empty-hint {
    font-size: 11px;
    margin-top: 4px;
    opacity: 0.7;
  }

  .user-section {
    padding: 12px;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    padding: 8px;
    border-radius: 8px;
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .user-info:hover {
    background-color: var(--hover-bg);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-blue), #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }

  .user-details {
    flex: 1;
    min-width: 0;
  }

  .username {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .workspace {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .invite-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateY(0);
  }

  .invite-button:hover {
    background-color: var(--hover-bg);
    border-color: var(--accent-blue);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }

  .invite-button:active {
    transform: translateY(0);
  }

  .invite-button svg {
    flex-shrink: 0;
  }
</style>
