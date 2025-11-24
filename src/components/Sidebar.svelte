<script>
  import { user as userStore } from '../stores/user.js';
  import { chats, currentChatId, createNewChat, loadChat, deleteChat, moveChatToProject, removeChatFromProject } from '../stores/chat.js';
  import { selectedModel, setModel } from '../stores/models.js';
  import { sidebarView, isSearchOpen, searchQuery, isInviteModalOpen, isProjectModalOpen, isUserMenuOpen, isSidebarOpen, isMobile } from '../stores/app.js';
  import { projects, updateProject, deleteProject } from '../stores/projects.js';
  
  let activeItem = 'new-chat';
  let searchInput = '';
  let filteredChats = [];
  let showChatList = true;
  let expandedProjects = new Set();
  let showMoveMenu = false;
  let moveMenuChatId = null;
  let moveMenuPosition = { x: 0, y: 0 };
  
  // Organizza le chat per progetto
  $: organizedChats = (() => {
    const organized = {
      projects: {},
      unassigned: []
    };
    
    $chats.forEach(chat => {
      if (chat.isTemporary) return;
      if (chat.projectId) {
        if (!organized.projects[chat.projectId]) {
          organized.projects[chat.projectId] = [];
        }
        organized.projects[chat.projectId].push(chat);
      } else {
        organized.unassigned.push(chat);
      }
    });
    
    // Ordina le chat per data di aggiornamento
    Object.keys(organized.projects).forEach(projectId => {
      organized.projects[projectId].sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    });
    organized.unassigned.sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    
    return organized;
  })();
  
  // Espandi automaticamente i progetti con chat
  $: {
    Object.keys(organizedChats.projects).forEach(projectId => {
      if (organizedChats.projects[projectId].length > 0) {
        expandedProjects.add(projectId);
      }
    });
  }
  
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
  
  function toggleProject(projectId) {
    if (expandedProjects.has(projectId)) {
      expandedProjects.delete(projectId);
    } else {
      expandedProjects.add(projectId);
    }
    expandedProjects = expandedProjects; // Trigger reactivity
  }
  
  function handleMoveChat(event, chatId) {
    event.stopPropagation();
    moveMenuChatId = chatId;
    const rect = event.currentTarget.getBoundingClientRect();
    moveMenuPosition = { x: rect.right + 5, y: rect.top };
    showMoveMenu = true;
  }
  
  function closeMoveMenu() {
    showMoveMenu = false;
    moveMenuChatId = null;
  }
  
  function handleMoveToProject(projectId) {
    if (moveMenuChatId) {
      moveChatToProject(moveMenuChatId, projectId);
      showMoveMenu = false;
      moveMenuChatId = null;
    }
  }
  
  function handleRemoveFromProject() {
    if (moveMenuChatId) {
      removeChatFromProject(moveMenuChatId);
      showMoveMenu = false;
      moveMenuChatId = null;
    }
  }
  
  function handleProjectClick(projectId) {
    toggleProject(projectId);
  }
  
  function handleProjectDelete(event, projectId) {
    event.stopPropagation();
    if (confirm('Sei sicuro di voler eliminare questa cartella? Le chat non verranno eliminate.')) {
      // Rimuovi projectId dalle chat prima di eliminare la cartella
      $chats.forEach(chat => {
        if (chat.projectId === projectId) {
          removeChatFromProject(chat.id);
        }
      });
      deleteProject(projectId);
    }
  }
</script>

{#if $isMobile && $isSidebarOpen}
  <div class="sidebar-overlay" on:click={closeSidebar}></div>
{/if}

<aside class="sidebar" class:sidebar-open={$isSidebarOpen} class:sidebar-mobile={$isMobile}>
  {#if $isMobile}
    <div class="sidebar-header-mobile">
      <div class="sidebar-logo">
        <img src="/logo.png" alt="Nebula AI" class="logo-img" />
        <span class="logo-text">Nebula AI</span>
      </div>
      <button class="close-sidebar-btn" on:click={closeSidebar}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  {/if}
  
  <!-- Logo in alto -->
  <div class="sidebar-header">
    <div class="sidebar-logo">
      <img src="/logo.png" alt="Nebula AI" class="logo-img" />
      <span class="logo-text">Nebula AI</span>
    </div>
  </div>
  
  <nav class="sidebar-nav">
    <!-- Bottone Nuova Chat Prominente -->
    <button 
      class="new-chat-button" 
      on:click={() => handleMenuClick('new-chat')}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Nuova chat</span>
    </button>
    
    {#each [
      { id: 'search', label: 'Cerca chat', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
      { id: 'library', label: 'Libreria', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
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
    
    <!-- Cronologia sempre visibile -->
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
        
        {#if $sidebarView === 'library'}
          <!-- Mostra cartelle e chat organizzate -->
          {#each $projects as project}
            {#if organizedChats.projects[project.id] && organizedChats.projects[project.id].length > 0}
              <div class="project-folder">
                <div 
                  class="project-header"
                  on:click={() => handleProjectClick(project.id)}
                >
                  <div class="project-icon-wrapper" style="background-color: {project.color}20; color: {project.color}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d={project.icon}/>
                    </svg>
                  </div>
                  <span class="project-name">{project.name}</span>
                  <span class="project-count">({organizedChats.projects[project.id].length})</span>
                  <svg 
                    class="expand-icon" 
                    class:expanded={expandedProjects.has(project.id)}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                  <button 
                    class="project-delete" 
                    on:click={(e) => handleProjectDelete(e, project.id)}
                    title="Elimina cartella"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                {#if expandedProjects.has(project.id)}
                  <div class="project-chats">
                    {#each organizedChats.projects[project.id] as chat}
                      <div 
                        class="chat-item nested" 
                        class:active={chat.id === $currentChatId}
                        on:click={() => handleChatClick(chat.id)}
                      >
                        <div class="chat-info">
                          <div class="chat-title">{chat.title}</div>
                          <div class="chat-date">{formatDate(chat.updatedAt)}</div>
                        </div>
                        <div class="chat-actions">
                          <button 
                            class="chat-move" 
                            on:click={(e) => handleMoveChat(e, chat.id)}
                            title="Sposta chat"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </button>
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
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
          
          <!-- Chat non assegnate -->
          {#if organizedChats.unassigned.length > 0}
            <div class="project-folder">
              <div class="project-header unassigned-header">
                <span class="project-name">Chat senza cartella</span>
                <span class="project-count">({organizedChats.unassigned.length})</span>
              </div>
              <div class="project-chats">
                {#each organizedChats.unassigned as chat}
                  <div 
                    class="chat-item nested" 
                    class:active={chat.id === $currentChatId}
                    on:click={() => handleChatClick(chat.id)}
                  >
                    <div class="chat-info">
                      <div class="chat-title">{chat.title}</div>
                      <div class="chat-date">{formatDate(chat.updatedAt)}</div>
                    </div>
                    <div class="chat-actions">
                      <button 
                        class="chat-move" 
                        on:click={(e) => handleMoveChat(e, chat.id)}
                        title="Sposta chat"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </button>
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
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {:else if $sidebarView === 'search'}
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
          {:else if $searchQuery}
            <div class="empty-state">
              <p>Nessuna chat trovata</p>
            </div>
          {:else}
            <div class="empty-state">
              <p>Nessuna chat ancora</p>
              <p class="empty-hint">Crea una nuova chat per iniziare</p>
            </div>
          {/if}
        {:else}
          <!-- Cronologia standard quando non si è in search o library -->
          {#if organizedChats.unassigned.length > 0 || Object.keys(organizedChats.projects).some(pid => organizedChats.projects[pid]?.length > 0)}
            <!-- Mostra chat non assegnate -->
            {#if organizedChats.unassigned.length > 0}
              {#each organizedChats.unassigned.slice(0, 20) as chat}
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
            {/if}
            
            <!-- Mostra progetti con chat (solo i primi) -->
            {#each $projects.slice(0, 3) as project}
              {#if organizedChats.projects[project.id] && organizedChats.projects[project.id].length > 0}
                <div class="project-folder">
                  <div 
                    class="project-header"
                    on:click={() => handleProjectClick(project.id)}
                  >
                    <div class="project-icon-wrapper" style="background-color: {project.color}20; color: {project.color}">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d={project.icon}/>
                      </svg>
                    </div>
                    <span class="project-name">{project.name}</span>
                    <span class="project-count">({organizedChats.projects[project.id].length})</span>
                    <svg 
                      class="expand-icon" 
                      class:expanded={expandedProjects.has(project.id)}
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                  {#if expandedProjects.has(project.id)}
                    <div class="project-chats">
                      {#each organizedChats.projects[project.id].slice(0, 5) as chat}
                        <div 
                          class="chat-item nested" 
                          class:active={chat.id === $currentChatId}
                          on:click={() => handleChatClick(chat.id)}
                        >
                          <div class="chat-info">
                            <div class="chat-title">{chat.title}</div>
                            <div class="chat-date">{formatDate(chat.updatedAt)}</div>
                          </div>
                          <div class="chat-actions">
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
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            {/each}
          {:else}
            <div class="empty-state">
              <p>Nessuna chat ancora</p>
              <p class="empty-hint">Crea una nuova chat per iniziare</p>
            </div>
          {/if}
        {/if}
      </div>
    
    {#if showMoveMenu}
      <div class="move-menu-backdrop" on:click={closeMoveMenu}></div>
      <div class="move-menu" style="left: {moveMenuPosition.x}px; top: {moveMenuPosition.y}px">
        <div class="move-menu-header">Sposta in cartella</div>
        <div class="move-menu-options">
          <button class="move-option" on:click={handleRemoveFromProject}>
            <span>Rimuovi da cartella</span>
          </button>
          {#each $projects as project}
            <button class="move-option" on:click={() => handleMoveToProject(project.id)}>
              <div class="move-option-icon" style="background-color: {project.color}20; color: {project.color}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d={project.icon}/>
                </svg>
              </div>
              <span>{project.name}</span>
            </button>
          {/each}
        </div>
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
    width: 260px;
    background-color: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color);
    height: 100%;
    animation: sidebarSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 999;
  }
  
  .sidebar-header {
    padding: 20px 16px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .logo-img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
  
  .logo-text {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.5px;
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
      width: 280px;
      max-width: 85vw;
      height: 100vh;
      z-index: 999;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.5);
    }

    .sidebar.sidebar-open {
      transform: translateX(0);
    }

    .sidebar-header-mobile {
      display: flex;
    }

    .nav-item {
      padding: 12px 14px;
      font-size: 15px;
    }

    .chat-item {
      padding: 10px 12px;
      font-size: 14px;
    }

    .user-info {
      padding: 12px 14px;
    }

    .username {
      font-size: 14px;
    }

    .workspace {
      font-size: 12px;
    }

    .invite-button {
      padding: 10px 14px;
      font-size: 13px;
    }
  }

  @media (max-width: 480px) {
    .sidebar {
      width: 260px;
      max-width: 90vw;
    }

    .nav-item {
      padding: 10px 12px;
      font-size: 14px;
    }

    .chat-item {
      padding: 8px 10px;
      font-size: 13px;
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

  .project-folder {
    margin-bottom: 8px;
  }

  .project-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;
  }

  .project-header:hover {
    background-color: var(--hover-bg);
  }

  .project-header.unassigned-header {
    cursor: default;
    opacity: 0.7;
  }

  .project-icon-wrapper {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .project-name {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    text-align: left;
  }

  .project-count {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .expand-icon {
    width: 14px;
    height: 14px;
    color: var(--text-secondary);
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .expand-icon.expanded {
    transform: rotate(180deg);
  }

  .project-delete {
    opacity: 0;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .project-header:hover .project-delete {
    opacity: 1;
  }

  .project-delete:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }

  .project-chats {
    margin-left: 32px;
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .chat-item.nested {
    padding: 8px 12px;
    margin-left: 0;
  }

  .chat-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .chat-item:hover .chat-actions {
    opacity: 1;
  }

  .chat-move {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .chat-move:hover {
    color: var(--accent-blue);
    background-color: rgba(59, 130, 246, 0.1);
  }

  .move-menu-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background: transparent;
  }

  .move-menu {
    position: fixed;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1001;
    min-width: 200px;
    max-width: 300px;
    overflow: hidden;
    transform: translateY(-50%);
  }

  .move-menu-header {
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
  }

  .move-menu-options {
    max-height: 300px;
    overflow-y: auto;
  }

  .move-option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.2s;
    text-align: left;
  }

  .move-option:hover {
    background-color: var(--hover-bg);
  }

  .move-option-icon {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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
