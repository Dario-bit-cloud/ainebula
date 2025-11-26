<script>
  import { user as userStore } from '../stores/user.js';
  import { chats, currentChatId, createNewChat, loadChat, deleteChat, moveChatToProject, removeChatFromProject, loadChats, syncChatsOnLogin } from '../stores/chat.js';
  import { isAuthenticatedStore, user as authUser } from '../stores/auth.js';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { selectedModel, setModel } from '../stores/models.js';
  import { sidebarView, isSearchOpen, searchQuery, isInviteModalOpen, isProjectModalOpen, isUserMenuOpen, isSidebarOpen, isMobile } from '../stores/app.js';
  import { projects, updateProject, deleteProject, syncProjectsOnLogin, loadProjects } from '../stores/projects.js';
  import { showConfirm } from '../services/dialogService.js';
  import { currentLanguage, t } from '../stores/language.js';
  
  let activeItem = 'new-chat';
  let searchInput = '';
  let filteredChats = [];
  let showChatList = true;
  let expandedProjects = new Set();
  let showMoveMenu = false;
  let moveMenuChatId = null;
  let moveMenuPosition = { x: 0, y: 0 };
  let showSearchInput = false;
  let searchInputRef = null;
  let draggedChatId = null;
  let dragOverProjectId = null;
  
  // Carica le chat e i progetti quando l'utente si autentica
  let lastAuthState = false;
  let hasLoadedChats = false;
  let hasLoadedProjects = false;
  
  $: {
    if ($isAuthenticatedStore && !lastAuthState) {
      // L'utente si è appena autenticato
      lastAuthState = true;
      if (!hasLoadedChats) {
        hasLoadedChats = true;
        syncChatsOnLogin().catch(err => {
          console.error('Errore caricamento chat:', err);
        });
      }
      if (!hasLoadedProjects) {
        hasLoadedProjects = true;
        syncProjectsOnLogin().catch(err => {
          console.error('Errore caricamento progetti:', err);
        });
      }
    } else if (!$isAuthenticatedStore && lastAuthState) {
      // L'utente si è disconnesso
      lastAuthState = false;
      hasLoadedChats = false;
      hasLoadedProjects = false;
    }
  }
  
  onMount(() => {
    lastAuthState = $isAuthenticatedStore;
    // Non caricare qui - syncChatsOnLogin viene chiamato da auth.js o dalla reactive statement
  });
  
  // Organizza le chat per progetto
  $: organizedChats = (() => {
    const organized = {
      projects: {},
      unassigned: []
    };
    
    $chats.forEach(chat => {
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
  
  // Ricerca migliorata con debounce e ottimizzazioni
  let searchTimeout;
  $: {
    if ($searchQuery && $searchQuery.trim()) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = $searchQuery.toLowerCase().trim();
        filteredChats = $chats.filter(chat => {
          // Cerca nel titolo
          if (chat.title.toLowerCase().includes(query)) return true;
          // Cerca nei messaggi (solo nei primi messaggi per performance)
          const messagesToSearch = chat.messages.slice(0, 10); // Limita la ricerca ai primi 10 messaggi
          return messagesToSearch.some(msg => 
            msg.content && !msg.hidden && msg.content.toLowerCase().includes(query)
          );
        });
      }, 150); // Debounce di 150ms
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
    } else if ($sidebarView === 'projects') {
      activeItem = 'projects';
    }
  }
  
  async function handleMenuClick(itemId) {
    switch(itemId) {
      case 'new-chat':
        await createNewChat();
        sidebarView.set('chat');
        activeItem = null; // Nessun item attivo quando si è in una chat
        if ($isMobile) {
          isSidebarOpen.set(false);
        }
        break;
      case 'search':
        if (showSearchInput) {
          // Se già aperto, chiudi
          showSearchInput = false;
          searchInput = '';
          searchQuery.set('');
          sidebarView.set('chat');
          activeItem = null;
        } else {
          // Apri con animazione
          showSearchInput = true;
          isSearchOpen.set(true);
          sidebarView.set('search');
          activeItem = 'search';
          // Focus sull'input dopo l'animazione
          setTimeout(() => {
            if (searchInputRef) {
              searchInputRef.focus();
            }
          }, 300);
        }
        break;
      case 'library':
        showSearchInput = false;
        sidebarView.set('library');
        activeItem = 'library';
        showChatList = true;
        break;
      case 'projects':
        showSearchInput = false;
        sidebarView.set('projects');
        activeItem = 'projects';
        // Carica i progetti se non ancora caricati
        if ($isAuthenticatedStore && !hasLoadedProjects) {
          loadProjects().catch(err => {
            console.error('Errore caricamento progetti:', err);
          });
        }
        break;
    }
  }
  
  function handleSearchBlur() {
    // Non chiudere se l'utente sta ancora digitando o se ci sono risultati
    if (!searchInput.trim() && filteredChats.length === 0) {
      // Chiudi solo se non c'è input e non ci sono risultati
      setTimeout(() => {
        if (document.activeElement !== searchInputRef) {
          showSearchInput = false;
          sidebarView.set('chat');
          activeItem = null;
        }
      }, 200);
    }
  }
  
  function handleSearchKeydown(event) {
    if (event.key === 'Escape') {
      showSearchInput = false;
      searchInput = '';
      searchQuery.set('');
      sidebarView.set('chat');
      activeItem = null;
      searchInputRef?.blur();
    }
  }
  
  function handleChatClick(chatId) {
    loadChat(chatId);
    sidebarView.set('chat');
    activeItem = null; // Nessun item attivo quando si è in una chat
    isSearchOpen.set(false);
    searchQuery.set('');
    showSearchInput = false;
    searchInput = '';
    if ($isMobile) {
      isSidebarOpen.set(false);
    }
  }

  function closeSidebar() {
    isSidebarOpen.set(false);
  }
  
  async function handleDeleteChat(event, chatId) {
    event.stopPropagation();
    const confirmed = await showConfirm(get(t)('deleteChatConfirm'), get(t)('deleteChat'), get(t)('delete'), get(t)('cancel'), 'danger');
    if (confirmed) {
      await deleteChat(chatId);
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
    
    if (days === 0) return get(t)('today');
    if (days === 1) return get(t)('yesterday');
    if (days < 7) return get(t)('daysAgo', { n: days });
    const lang = $currentLanguage || 'it';
    const localeMap = { it: 'it-IT', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' };
    return date.toLocaleDateString(localeMap[lang] || 'it-IT', { day: 'numeric', month: 'short' });
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
  
  async function handleProjectDelete(event, projectId) {
    event.stopPropagation();
    const confirmed = await showConfirm(get(t)('deleteFolderConfirm'), get(t)('deleteFolder'), get(t)('delete'), get(t)('cancel'), 'danger');
    if (confirmed) {
      // Rimuovi projectId dalle chat prima di eliminare la cartella
      $chats.forEach(chat => {
        if (chat.projectId === projectId) {
          removeChatFromProject(chat.id);
        }
      });
      await deleteProject(projectId);
    }
  }

  function handleDragStart(event, chatId) {
    draggedChatId = chatId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', chatId);
    // Aggiungi classe per feedback visivo
    event.target.style.opacity = '0.5';
  }

  function handleDragEnd(event) {
    event.target.style.opacity = '1';
    draggedChatId = null;
    dragOverProjectId = null;
  }

  function handleDragOver(event, projectId) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dragOverProjectId = projectId;
  }

  function handleDragLeave(event) {
    dragOverProjectId = null;
  }

  function handleDrop(event, projectId) {
    event.preventDefault();
    event.stopPropagation();
    
    if (draggedChatId) {
      moveChatToProject(draggedChatId, projectId);
    }
    
    draggedChatId = null;
    dragOverProjectId = null;
  }

  function handleDropUnassigned(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (draggedChatId) {
      removeChatFromProject(draggedChatId);
    }
    
    draggedChatId = null;
    dragOverProjectId = null;
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
    <div class="new-chat-wrapper" on:click={() => handleMenuClick('new-chat')}>
      <div class="new-chat-glow"></div>
      <button class="new-chat-button" role="button">
        {$t('newChat')}
        <svg
          aria-hidden="true"
          viewBox="0 0 10 10"
          height="10"
          width="10"
          fill="none"
          class="new-chat-arrow"
        >
          <path
            d="M0 5h7"
            class="arrow-line"
          ></path>
          <path
            d="M1 1l4 4-4 4"
            class="arrow-path"
          ></path>
        </svg>
      </button>
    </div>
    
    {#each [
      { id: 'search', label: $t('searchChats'), icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
      { id: 'library', label: $t('library'), icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
      { id: 'projects', label: $t('projects'), icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' }
    ] as item}
      <div class="nav-item-wrapper">
        {#if item.id === 'search'}
          {#if !showSearchInput}
            <button 
              class="nav-item search-button" 
              class:active={activeItem === 'search'}
              on:click={() => handleMenuClick('search')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </button>
          {:else}
            <div class="search-group-animated">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="search-icon">
                <g>
                  <path
                    d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"
                  ></path>
                </g>
              </svg>
              <input
                bind:this={searchInputRef}
                id="query"
                class="search-input"
                type="search"
                placeholder={$t('searchChats') + '...'}
                name="searchbar"
                bind:value={searchInput}
                on:input={(e) => searchQuery.set(e.target.value)}
                on:blur={handleSearchBlur}
                on:keydown={handleSearchKeydown}
              />
              <button 
                class="search-close-button"
                on:click={() => handleMenuClick('search')}
                title={$t('close')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          {/if}
        {:else}
          <button 
            class="nav-item" 
            class:active={activeItem === item.id}
            on:click={() => handleMenuClick(item.id)}
          >
            {#if item.customIcon}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            {:else}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d={item.icon} />
              </svg>
            {/if}
            <span>{item.label}</span>
            {#if item.id === 'projects'}
              <button 
                class="plus-icon-button" 
                on:click|stopPropagation={() => isProjectModalOpen.set(true)}
                title={$t('newFolder')}
              >
                <svg class="plus-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            {/if}
          </button>
        {/if}
      </div>
    {/each}
    
    <!-- Cronologia sempre visibile -->
    <div class="chat-list">
        
        {#if $sidebarView === 'search' && showSearchInput}
          {#if filteredChats.length > 0}
            {#each filteredChats as chat}
              <div 
                class="chat-item"
                class:active={chat.id === $currentChatId}
                on:click={() => handleChatClick(chat.id)}
              >
                <div class="chat-info">
                  <div class="chat-title">{chat.title}</div>
                  <div class="chat-date">
                    {new Date(chat.updatedAt).toLocaleDateString('it-IT', { 
                      day: 'numeric', 
                      month: 'short',
                      year: new Date(chat.updatedAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    })}
                  </div>
                </div>
              </div>
            {/each}
          {:else if $searchQuery && $searchQuery.trim()}
            <div class="no-results">
              <p>{$t('noResultsFound')}</p>
              <p class="no-results-subtitle">{$t('noChatFound')}</p>
            </div>
          {/if}
        {/if}
        
        {#if $sidebarView === 'library'}
          <!-- Mostra cartelle e chat organizzate -->
          {#each $projects as project}
            {#if organizedChats.projects[project.id] && organizedChats.projects[project.id].length > 0}
              <div class="project-folder">
                <div 
                  class="project-header"
                  class:drag-over={dragOverProjectId === project.id}
                  on:click={() => handleProjectClick(project.id)}
                  on:dragover={(e) => handleDragOver(e, project.id)}
                  on:dragleave={handleDragLeave}
                  on:drop={(e) => handleDrop(e, project.id)}
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
                    title={$t('deleteFolder')}
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
                        class:dragging={draggedChatId === chat.id}
                        draggable="true"
                        on:dragstart={(e) => handleDragStart(e, chat.id)}
                        on:dragend={handleDragEnd}
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
                            title={$t('moveToFolder')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </button>
                          <button 
                            class="chat-delete" 
                            on:click={(e) => handleDeleteChat(e, chat.id)}
                            title={$t('deleteChat')}
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
              <div 
                class="project-header unassigned-header"
                class:drag-over={dragOverProjectId === 'unassigned'}
                on:dragover={(e) => { e.preventDefault(); dragOverProjectId = 'unassigned'; }}
                on:dragleave={() => { dragOverProjectId = null; }}
                on:drop={handleDropUnassigned}
              >
                <span class="project-name">{$t('chatWithoutFolder')}</span>
                <span class="project-count">({organizedChats.unassigned.length})</span>
              </div>
              <div class="project-chats">
                {#each organizedChats.unassigned as chat}
                  <div 
                    class="chat-item nested" 
                    class:active={chat.id === $currentChatId}
                    class:dragging={draggedChatId === chat.id}
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, chat.id)}
                    on:dragend={handleDragEnd}
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
                        title={$t('moveToFolder')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </button>
                      <button 
                        class="chat-delete" 
                        on:click={(e) => handleDeleteChat(e, chat.id)}
                        title={$t('deleteChat')}
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
        {:else if $sidebarView === 'projects'}
          <!-- Vista progetti: mostra tutti i progetti con gestione completa -->
          <div class="projects-view">
            {#if $projects.length > 0}
              {#each $projects as project}
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
                    <span class="project-count">
                      ({organizedChats.projects[project.id] ? organizedChats.projects[project.id].length : 0})
                    </span>
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
                      title={$t('deleteFolder')}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  {#if expandedProjects.has(project.id)}
                    <div class="project-chats">
                      {#if organizedChats.projects[project.id] && organizedChats.projects[project.id].length > 0}
                        {#each organizedChats.projects[project.id] as chat}
                        <div 
                          class="chat-item nested" 
                          class:active={chat.id === $currentChatId}
                          class:dragging={draggedChatId === chat.id}
                          draggable="true"
                          on:dragstart={(e) => handleDragStart(e, chat.id)}
                          on:dragend={handleDragEnd}
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
                                title={$t('moveToFolder')}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="9 18 15 12 9 6"/>
                                </svg>
                              </button>
                              <button 
                                class="chat-delete" 
                                on:click={(e) => handleDeleteChat(e, chat.id)}
                                title={$t('deleteChat')}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        {/each}
                      {:else}
                        <div class="empty-project">
                          <p>{$t('noChatsInFolder')}</p>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            {:else}
              <div class="empty-state">
                <p>{$t('noFoldersYet')}</p>
                <p class="empty-hint">{$t('createNewFolder')}</p>
              </div>
            {/if}
          </div>
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
                  title={$t('deleteChat')}
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
              <p>{$t('noChatFound')}</p>
            </div>
          {:else}
            <div class="empty-state">
              <p>{$t('noChatsYet')}</p>
              <p class="empty-hint">{$t('createNewChat')}</p>
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
                  class:dragging={draggedChatId === chat.id}
                  draggable="true"
                  on:dragstart={(e) => handleDragStart(e, chat.id)}
                  on:dragend={handleDragEnd}
                  on:click={() => handleChatClick(chat.id)}
                >
                  <div class="chat-info">
                    <div class="chat-title">{chat.title}</div>
                    <div class="chat-date">{formatDate(chat.updatedAt)}</div>
                  </div>
                  <button 
                    class="chat-delete" 
                    on:click={(e) => handleDeleteChat(e, chat.id)}
                    title={$t('deleteChat')}
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
                          class:dragging={draggedChatId === chat.id}
                          draggable="true"
                          on:dragstart={(e) => handleDragStart(e, chat.id)}
                          on:dragend={handleDragEnd}
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
                              title={$t('deleteChat')}
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
              <p>{$t('noChatsYet')}</p>
              <p class="empty-hint">{$t('createNewChat')}</p>
            </div>
          {/if}
        {/if}
      </div>
    
    {#if showMoveMenu}
      <div class="move-menu-backdrop" on:click={closeMoveMenu}></div>
      <div class="move-menu" style="left: {moveMenuPosition.x}px; top: {moveMenuPosition.y}px">
        <div class="move-menu-header">{$t('moveToFolder')}</div>
        <div class="move-menu-options">
          <button class="move-option" on:click={handleRemoveFromProject}>
            <span>{$t('removeFromFolder')}</span>
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
        <div class="username">{$userStore.name || $isAuthenticatedStore ? ($authUser?.username || $t('user')) : $t('user')}</div>
        <div class="workspace">
          {#if $isAuthenticatedStore && $authUser?.email}
            {$authUser.email}
          {:else if $userStore.email}
            {$userStore.email}
          {:else}
            {$t('noWorkspace')}
          {/if}
        </div>
      </div>
    </button>
    <button class="invite-button" on:click={handleInviteClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
      <span>{$t('inviteAndEarn')}</span>
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
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar.sidebar-open {
      transform: translateX(0);
    }

    .sidebar-header-mobile {
      display: flex;
      flex-shrink: 0;
    }

    .sidebar-header {
      flex-shrink: 0;
    }

    .sidebar-nav {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-item {
      padding: 12px 14px;
      font-size: 15px;
    }

    .chat-item {
      padding: 10px 12px;
      font-size: 14px;
    }

    .user-section {
      flex-shrink: 0;
      padding: 10px 12px;
      border-top: 1px solid var(--border-color);
      background-color: var(--bg-secondary);
      margin-top: -20px;
    }

    .user-info {
      padding: 8px;
      margin-bottom: 10px;
    }

    .user-avatar {
      width: 28px;
      height: 28px;
      min-width: 28px;
    }

    .username {
      font-size: 13px;
    }

    .workspace {
      font-size: 11px;
    }

    .invite-button {
      padding: 10px 12px;
      font-size: 12px;
    }

    .invite-button span {
      font-size: 12px;
    }
  }

  @media (max-width: 480px) {
    .sidebar {
      width: 260px;
      max-width: 90vw;
    }

    .sidebar-header {
      padding: 16px 12px;
    }

    .sidebar-nav {
      padding: 10px;
    }

    .nav-item {
      padding: 10px 12px;
      font-size: 14px;
    }

    .chat-item {
      padding: 8px 10px;
      font-size: 13px;
    }

    .user-section {
      padding: 8px 10px;
      margin-top: -20px;
    }

    .user-info {
      padding: 6px;
      margin-bottom: 8px;
    }

    .user-avatar {
      width: 24px;
      height: 24px;
      min-width: 24px;
    }

    .username {
      font-size: 12px;
    }

    .workspace {
      font-size: 10px;
    }

    .invite-button {
      padding: 8px 10px;
      font-size: 11px;
    }

    .invite-button span {
      font-size: 11px;
    }
  }

  .sidebar-nav {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
  }
  
  .new-chat-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-top: 16px;
    margin-bottom: 16px;
    cursor: pointer;
  }
  
  .new-chat-glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, #6366f1, #ec4899, #eab308);
    border-radius: 12px;
    filter: blur(12px);
    opacity: 0.6;
    transition: all 0.2s ease;
    pointer-events: none;
  }
  
  .new-chat-wrapper:hover .new-chat-glow {
    opacity: 1;
    transition-duration: 0.2s;
  }
  
  .new-chat-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 12px 32px;
    background-color: var(--text-primary);
    border: none;
    border-radius: 12px;
    color: var(--bg-primary);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 1;
  }
  
  .new-chat-button:hover {
    background-color: var(--text-primary);
    opacity: 0.9;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
  
  .new-chat-button:active {
    transform: translateY(0);
  }
  
  .new-chat-arrow {
    margin-left: 8px;
    margin-top: 2px;
    stroke: white;
    stroke-width: 2;
  }
  
  .arrow-line {
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  .new-chat-wrapper:hover .arrow-line {
    opacity: 1;
  }
  
  .arrow-path {
    transition: transform 0.2s ease;
  }
  
  .new-chat-wrapper:hover .arrow-path {
    transform: translateX(3px);
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

  .plus-icon-button {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
    opacity: 0.6;
  }

  .plus-icon-button:hover {
    opacity: 1;
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .projects-view {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty-project {
    padding: 12px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 12px;
    font-style: italic;
  }

  .chat-list {
    margin-top: 8px;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nav-item-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .search-button {
    flex: 1;
  }

  .search-group-animated {
    display: flex;
    line-height: 28px;
    align-items: center;
    position: relative;
    width: 100%;
    animation: searchSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes searchSlideIn {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .search-input {
    font-family: inherit;
    width: 100%;
    height: 45px;
    padding-left: 2.5rem;
    padding-right: 2.5rem;
    box-shadow: 0 0 0 1.5px var(--border-color);
    border: 0;
    border-radius: 12px;
    background-color: var(--bg-tertiary);
    outline: none;
    color: var(--text-primary);
    transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1);
    cursor: text;
    z-index: 0;
    font-size: 14px;
  }

  .search-input::placeholder {
    color: var(--text-secondary);
  }

  .search-input:hover {
    box-shadow: 0 0 0 2.5px var(--border-color);
  }

  .search-input:active {
    transform: scale(0.98);
  }

  .search-input:focus {
    box-shadow: 0 0 0 2.5px var(--accent-blue);
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    fill: var(--text-secondary);
    width: 1rem;
    height: 1rem;
    pointer-events: none;
    z-index: 1;
  }

  .search-close-button {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    opacity: 0.6;
    transition: all 0.2s ease;
    z-index: 2;
    border-radius: 4px;
  }

  .search-close-button:hover {
    opacity: 1;
    background-color: var(--hover-bg);
  }

  .no-results {
    padding: 24px 12px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .no-results-subtitle {
    margin-top: 8px;
    font-size: 13px;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    .search-input {
      height: 42px;
      font-size: 13px;
      padding-left: 2.25rem;
      padding-right: 2.25rem;
    }

    .search-icon {
      width: 0.9rem;
      height: 0.9rem;
      left: 0.875rem;
    }

    .search-close-button {
      right: 0.625rem;
      padding: 3px;
    }
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

  .chat-item.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }

  .project-header.drag-over {
    background-color: var(--accent-blue);
    opacity: 0.3;
    border: 2px dashed var(--accent-blue);
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
    background-color: var(--bg-secondary);
    position: relative;
    z-index: 10;
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
    min-width: 0;
  }

  .user-info:hover {
    background-color: var(--hover-bg);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    min-width: 32px;
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
    overflow: hidden;
  }

  .username {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    width: 100%;
  }

  .workspace {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    width: 100%;
    margin-top: 2px;
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
    min-width: 0;
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

  .invite-button span {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
