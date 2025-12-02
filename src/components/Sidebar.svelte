<script>
  import { user as userStore } from '../stores/user.js';
  import { chats, currentChatId, createNewChat, loadChat, deleteChat, moveChatToProject, removeChatFromProject, loadChats, syncChatsOnLogin } from '../stores/chat.js';
  import { isAuthenticatedStore, user as authUser } from '../stores/auth.js';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { selectedModel, setModel } from '../stores/models.js';
  import { sidebarView, isSearchOpen, searchQuery, isInviteModalOpen, isProjectModalOpen, isUserMenuOpen, isSidebarOpen, isSidebarCollapsed, isMobile, isNebuliniModalOpen, isPromptLibraryModalOpen, isImageGeneratorOpen } from '../stores/app.js';
  import { projects, updateProject, deleteProject, syncProjectsOnLogin, loadProjects } from '../stores/projects.js';
  import { showConfirm } from '../services/dialogService.js';
  import { currentLanguage, t } from '../stores/language.js';
  import Skeleton from './Skeleton.svelte';
  import EmptyState from './EmptyState.svelte';
  
  let activeItem = 'new-chat';
  let isLoadingChats = false;
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
        isLoadingChats = true;
        syncChatsOnLogin().then(() => {
          isLoadingChats = false;
        }).catch(err => {
          console.error('Errore caricamento chat:', err);
          isLoadingChats = false;
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
      isLoadingChats = false;
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
        // Su mobile, apri il modal invece di mostrare nella sidebar
        if ($isMobile) {
          isPromptLibraryModalOpen.set(true);
          isSidebarOpen.set(false);
        } else {
          sidebarView.set('library');
          activeItem = 'library';
          showChatList = true;
        }
        break;
      case 'nebulini':
        showSearchInput = false;
        isNebuliniModalOpen.set(true);
        if ($isMobile) {
          isSidebarOpen.set(false);
        }
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
      case 'image-generator':
        isImageGeneratorOpen.set(true);
        if ($isMobile) {
          isSidebarOpen.set(false);
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
  
  // Chiudi automaticamente la ricerca quando si comprime la sidebar
  $: {
    if ($isSidebarCollapsed && !$isMobile && showSearchInput) {
      showSearchInput = false;
      searchInput = '';
      searchQuery.set('');
      sidebarView.set('chat');
      activeItem = null;
    }
  }
  
  let isDeletingChat = false;
  
  async function handleDeleteChat(event, chatId) {
    event.stopPropagation();
    
    // Prevenire click multipli rapidi
    if (isDeletingChat) {
      return;
    }
    
    isDeletingChat = true;
    
    try {
      const confirmed = await showConfirm(get(t)('deleteChatConfirm'), get(t)('deleteChat'), get(t)('delete'), get(t)('cancel'), 'danger');
      if (confirmed) {
        await deleteChat(chatId);
      }
    } finally {
      // Reset dopo un breve delay per prevenire spam
      setTimeout(() => {
        isDeletingChat = false;
      }, 1000);
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

<aside class="sidebar" class:sidebar-open={$isSidebarOpen} class:sidebar-mobile={$isMobile} class:collapsed={$isSidebarCollapsed && !$isMobile}>
  {#if $isMobile}
    <div class="sidebar-header-mobile">
      <div class="sidebar-logo">
        <img src="/logo.png" alt="Nebula AI" class="logo-img" />
        <span class="logo-text">Nebula AI</span>
      </div>
      <button class="close-sidebar-btn" on:click={closeSidebar}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  {:else}
    <!-- Logo in alto solo su desktop -->
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <img src="/logo.png" alt="Nebula AI" class="logo-img" />
        <span class="logo-text">Nebula AI</span>
      </div>
      <button class="collapse-toggle-btn" on:click={() => isSidebarCollapsed.update(v => !v)} title={$isSidebarCollapsed ? $t('expandSidebar') : $t('collapseSidebar')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {#if $isSidebarCollapsed}
            <polyline points="9 18 15 12 9 6"/>
          {:else}
            <polyline points="15 18 9 12 15 6"/>
          {/if}
        </svg>
      </button>
    </div>
  {/if}
  
  <nav class="sidebar-nav">
    <!-- Bottone Nuova Chat Prominente -->
    <div class="new-chat-wrapper" on:click={() => handleMenuClick('new-chat')}>
      <div class="new-chat-glow"></div>
      <button 
        class="new-chat-button" 
        role="button"
        aria-label={$t('newChat')}
        title={$isSidebarCollapsed && !$isMobile ? $t('newChat') : ''}
      >
        {#if !$isSidebarCollapsed || $isMobile}
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
        {:else}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        {/if}
      </button>
    </div>
    
    {#each [
      { id: 'search', label: $t('searchChats'), icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
      { id: 'library', label: $t('library'), icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
      { id: 'nebulini', label: 'Nebulini', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
      { id: 'image-generator', label: '🎨 Image Generator', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'projects', label: $t('projects'), icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' }
    ] as item}
      <div class="nav-item-wrapper">
        {#if item.id === 'search'}
          {#if !showSearchInput}
            <button 
              class="nav-item search-button" 
              class:active={activeItem === 'search'}
              class:disabled={$isSidebarCollapsed && !$isMobile}
              on:click={() => {
                if (!($isSidebarCollapsed && !$isMobile)) {
                  handleMenuClick('search');
                }
              }}
              title={$isSidebarCollapsed && !$isMobile ? $t('expandSidebar') : item.label}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d={item.icon} />
              </svg>
              {#if !$isSidebarCollapsed || $isMobile}
                <span>{item.label}</span>
              {/if}
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
            title={$isSidebarCollapsed && !$isMobile ? item.label : ''}
          >
            {#if item.customIcon}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d={item.icon} />
              </svg>
            {/if}
            {#if !$isSidebarCollapsed || $isMobile}
              <span>{item.label}</span>
            {/if}
            {#if item.id === 'projects' && (!$isSidebarCollapsed || $isMobile)}
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
            <EmptyState 
              variant="search"
              title={$t('noResultsFound')}
              description={$t('noChatFound')}
            />
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                          <EmptyState 
                            variant="chat"
                            title={$t('noChatsInFolder')}
                            description=""
                          />
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            {:else}
              <EmptyState 
                variant="project"
                title={$t('noFoldersYet')}
                description={$t('createNewFolder')}
                actionLabel={$t('newFolder')}
                onAction={() => isProjectModalOpen.set(true)}
              />
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
            {#if isLoadingChats}
              <div class="skeleton-list">
                {#each Array(3) as _}
                  <Skeleton variant="chat-item" />
                {/each}
              </div>
            {:else}
              <EmptyState 
                variant="chat"
                title={$t('noChatsYet')}
                description={$t('createNewChat')}
                actionLabel={$t('newChat')}
                onAction={() => handleMenuClick('new-chat')}
              />
            {/if}
          {/if}
        {:else}
          <!-- Cronologia standard quando non si è in search o library -->
          {#if isLoadingChats}
            <div class="skeleton-list">
              {#each Array(3) as _}
                <Skeleton variant="chat-item" />
              {/each}
            </div>
          {:else if organizedChats.unassigned.length > 0 || Object.keys(organizedChats.projects).some(pid => organizedChats.projects[pid]?.length > 0)}
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
            {/if}
            
            <!-- Mostra progetti con chat (solo i primi) -->
            {#each $projects.slice(0, 3) as project}
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
          {:else}
            <EmptyState 
              variant="chat"
              title={$t('noChatsYet')}
              description={$t('createNewChat')}
              actionLabel={$t('newChat')}
              onAction={() => handleMenuClick('new-chat')}
            />
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
    <button class="user-info" on:click={() => isUserMenuOpen.set(!$isUserMenuOpen)} title={$isSidebarCollapsed && !$isMobile ? ($userStore?.name || $authUser?.username || $t('user')) : ''}>
      <div class="user-avatar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      {#if !$isSidebarCollapsed || $isMobile}
        <div class="user-details">
          <div class="username">{$userStore.name || $isAuthenticatedStore ? ($authUser?.username || $t('user')) : $t('user')}</div>
        </div>
      {/if}
    </button>
    <button class="invite-button" on:click={handleInviteClick} title={$isSidebarCollapsed && !$isMobile ? $t('inviteAndEarn') : ''}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
      {#if !$isSidebarCollapsed || $isMobile}
        <span>{$t('inviteAndEarn')}</span>
      {/if}
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
    z-index: 1000;
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
    background-color: var(--md-sys-color-surface-container);
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--md-sys-color-outline-variant);
    height: 100%;
    min-height: 100%;
    animation: sidebarSlideIn var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    box-shadow: var(--md-sys-elevation-level1);
    transition: width var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
  }
  
  .sidebar.collapsed {
    width: 72px;
  }
  
  .sidebar-header {
    padding: 12px 12px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    transition: padding var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
  }
  
  .sidebar.collapsed .sidebar-header {
    padding: 12px 8px;
    justify-content: center;
  }
  
  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .logo-img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  
  .logo-text {
    font-size: var(--md-sys-typescale-title-large-size);
    font-weight: var(--md-sys-typescale-title-large-weight);
    font-family: var(--md-sys-typescale-title-large-font);
    color: var(--md-sys-color-on-surface);
    letter-spacing: var(--md-sys-typescale-title-large-tracking);
    transition: opacity var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
    white-space: nowrap;
    overflow: hidden;
  }
  
  .sidebar.collapsed .logo-text {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }
  
  .collapse-toggle-btn {
    background: none;
    border: none;
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--md-sys-shape-corner-small);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
    flex-shrink: 0;
    opacity: 0.7;
  }
  
  .collapse-toggle-btn:hover {
    background-color: var(--md-sys-color-surface-container-high);
    opacity: 1;
  }
  
  .sidebar.collapsed .collapse-toggle-btn {
    position: absolute;
    right: 8px;
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

  /* Tablet styles */
  @media (min-width: 769px) and (max-width: 1024px) {
    .sidebar {
      width: 240px;
    }

    .sidebar-nav {
      padding: 10px;
    }

    .new-chat-button {
      padding: 10px 24px;
      font-size: 14px;
    }

    .nav-item {
      padding: 8px 10px;
      font-size: 14px;
    }

    .chat-item {
      padding: 8px 10px;
      font-size: 13px;
    }
  }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      width: 300px;
      max-width: 85vw;
      height: 100vh;
      height: 100dvh;
      z-index: 1001;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
    }

    .sidebar.sidebar-open {
      transform: translateX(0);
    }

    .sidebar-header-mobile {
      display: flex;
      flex-shrink: 0;
      padding: 16px;
      padding-top: calc(16px + env(safe-area-inset-top));
      border-bottom: 1px solid var(--border-color);
    }

    .sidebar-header {
      flex-shrink: 0;
    }

    .sidebar-nav {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      padding: 8px;
    }

    .nav-item {
      padding: 12px 14px;
      font-size: 15px;
      min-height: 48px;
      touch-action: manipulation;
      border-radius: 12px;
    }

    .new-chat-button {
      padding: 12px 20px;
      min-height: 48px;
      font-size: 15px;
      touch-action: manipulation;
    }

    .chat-item {
      padding: 12px 14px;
      font-size: 14px;
      min-height: 48px;
      touch-action: manipulation;
      border-radius: 10px;
    }

    .user-section {
      flex-shrink: 0;
      padding: 12px;
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
      border-top: 1px solid var(--border-color);
      background-color: var(--bg-secondary);
    }

    .user-info {
      padding: 10px;
      margin-bottom: 10px;
      min-height: 48px;
      touch-action: manipulation;
      border-radius: 12px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      min-width: 32px;
      min-height: 32px;
    }

    .username {
      font-size: 14px;
      font-weight: 500;
    }

    .workspace {
      font-size: 12px;
    }

    .invite-button {
      padding: 12px 16px;
      font-size: 13px;
      min-height: 48px;
      touch-action: manipulation;
      border-radius: 12px;
    }

    .invite-button span {
      font-size: 13px;
    }
    
    .close-sidebar-btn {
      min-width: 44px;
      min-height: 44px;
      touch-action: manipulation;
      border-radius: 8px;
    }
  }

  @media (max-width: 480px) {
    .sidebar {
      width: 280px;
      max-width: 90vw;
    }

    .sidebar-header-mobile {
      padding: 14px 12px;
      padding-top: calc(14px + env(safe-area-inset-top));
    }

    .sidebar-nav {
      padding: 8px;
    }

    .nav-item {
      padding: 10px 12px;
      font-size: 14px;
      min-height: 44px;
    }
    
    .new-chat-button {
      padding: 10px 16px;
      min-height: 44px;
      font-size: 14px;
    }

    .chat-item {
      padding: 10px 12px;
      font-size: 13px;
      min-height: 44px;
    }

    .user-section {
      padding: 10px;
      padding-bottom: calc(10px + env(safe-area-inset-bottom));
    }

    .user-info {
      padding: 8px;
      margin-bottom: 8px;
      min-height: 44px;
    }

    .user-avatar {
      width: 28px;
      height: 28px;
      min-width: 28px;
      min-height: 28px;
    }

    .username {
      font-size: 13px;
    }

    .workspace {
      font-size: 11px;
    }

    .invite-button {
      padding: 10px 14px;
      font-size: 12px;
      min-height: 44px;
    }

    .invite-button span {
      font-size: 12px;
    }
  }

  .sidebar-nav {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
  }
  
  .new-chat-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-top: 8px;
    margin-bottom: 8px;
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
    padding: 10px 24px;
    background-color: var(--md-sys-color-primary);
    border: none;
    border-radius: var(--md-sys-shape-corner-large);
    color: var(--md-sys-color-on-primary);
    font-size: var(--md-sys-typescale-label-medium-size);
    font-weight: var(--md-sys-typescale-label-medium-weight);
    font-family: var(--md-sys-typescale-label-medium-font);
    cursor: pointer;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    z-index: 1;
    box-shadow: var(--md-sys-elevation-level1);
    gap: 6px;
  }
  
  .sidebar.collapsed .new-chat-button {
    padding: 12px;
    min-width: 48px;
    width: 48px;
    height: 48px;
    border-radius: var(--md-sys-shape-corner-medium);
  }
  
  .sidebar.collapsed .new-chat-button svg {
    margin: 0;
    width: 20px;
    height: 20px;
  }
  
  .sidebar.collapsed .new-chat-button:hover {
    transform: scale(1.05);
  }
  
  .new-chat-button:hover {
    background-color: var(--md-sys-color-primary);
    opacity: 0.92;
    box-shadow: var(--md-sys-elevation-level2);
    transform: translateY(-1px);
  }
  
  .new-chat-button:active {
    transform: translateY(0);
    box-shadow: var(--md-sys-elevation-level1);
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
    gap: 8px;
    padding: 8px 10px;
    background: none;
    border: none;
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    border-radius: var(--md-sys-shape-corner-medium);
    font-size: var(--md-sys-typescale-body-small-size);
    font-weight: var(--md-sys-typescale-body-small-weight);
    font-family: var(--md-sys-typescale-body-small-font);
    transition: all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
    position: relative;
    text-align: left;
    flex-shrink: 0;
    transform: translateX(0);
  }
  
  .sidebar.collapsed .nav-item {
    justify-content: center;
    padding: 10px;
    min-width: 48px;
    width: 48px;
    height: 48px;
    border-radius: var(--md-sys-shape-corner-medium);
  }
  
  .sidebar.collapsed .nav-item span {
    opacity: 0;
    width: 0;
    overflow: hidden;
    white-space: nowrap;
    position: absolute;
  }
  
  .sidebar.collapsed .nav-item:hover {
    transform: translateX(0) scale(1.05);
    background-color: var(--md-sys-color-surface-container-high);
  }
  
  .sidebar.collapsed .nav-item.active {
    background-color: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }
  
  .sidebar.collapsed .nav-item svg {
    width: 20px;
    height: 20px;
  }

  .nav-item:hover {
    transform: translateX(4px);
  }

  .nav-item:active {
    transform: translateX(2px) scale(0.98);
  }

  .nav-item:hover {
    background-color: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
  }

  .nav-item.active {
    background-color: var(--md-sys-color-secondary-container);
    color: var(--md-sys-color-on-secondary-container);
  }

  .nav-item svg {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
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
    margin-top: 4px;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    transition: opacity var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
  }
  
  .sidebar.collapsed .chat-list {
    opacity: 0;
    pointer-events: none;
    overflow: hidden;
    height: 0;
    margin: 0;
  }
  
  .sidebar.collapsed .nav-item-wrapper {
    justify-content: center;
  }
  
  /* Tooltip migliorato per sidebar compressa */
  .sidebar.collapsed .nav-item[title]:hover::after,
  .sidebar.collapsed .new-chat-button[title]:hover::after,
  .sidebar.collapsed .user-info[title]:hover::after,
  .sidebar.collapsed .invite-button[title]:hover::after {
    content: attr(title);
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%);
    background-color: var(--md-sys-color-inverse-surface);
    color: var(--md-sys-color-inverse-on-surface);
    padding: 8px 12px;
    border-radius: var(--md-sys-shape-corner-small);
    font-size: 12px;
    white-space: nowrap;
    z-index: 10000;
    pointer-events: none;
    opacity: 0;
    animation: tooltipFadeIn 0.2s ease-out 0.3s forwards;
    box-shadow: var(--md-sys-elevation-level3);
    font-family: var(--md-sys-typescale-label-medium-font);
  }
  
  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: translateY(-50%) translateX(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
  }
  
  /* Freccia per tooltip */
  .sidebar.collapsed .nav-item[title]:hover::before,
  .sidebar.collapsed .new-chat-button[title]:hover::before,
  .sidebar.collapsed .user-info[title]:hover::before,
  .sidebar.collapsed .invite-button[title]:hover::before {
    content: '';
    position: absolute;
    left: calc(100% + 4px);
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 6px solid var(--md-sys-color-inverse-surface);
    z-index: 10001;
    opacity: 0;
    animation: tooltipFadeIn 0.2s ease-out 0.3s forwards;
    pointer-events: none;
  }

  .nav-item-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
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
  
  .sidebar.collapsed .search-group-animated {
    display: none;
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
    height: 38px;
    padding-left: 2.25rem;
    padding-right: 2.25rem;
    box-shadow: 0 0 0 1.5px var(--border-color);
    border: 0;
    border-radius: 10px;
    background-color: var(--bg-tertiary);
    outline: none;
    color: var(--text-primary);
    transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1);
    cursor: text;
    z-index: 0;
    font-size: 13px;
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
      height: 48px;
      font-size: 16px; /* Previene zoom su iOS */
      padding-left: 2.5rem;
      padding-right: 2.5rem;
      min-height: 48px;
      border-radius: 12px;
    }

    .search-icon {
      width: 1rem;
      height: 1rem;
      left: 1rem;
    }

    .search-close-button {
      right: 0.75rem;
      padding: 6px;
      min-width: 36px;
      min-height: 36px;
      touch-action: manipulation;
      border-radius: 8px;
    }
  }
  
  @media (max-width: 480px) {
    .search-input {
      height: 44px;
      font-size: 16px;
      padding-left: 2.25rem;
      padding-right: 2.25rem;
      min-height: 44px;
    }
    
    .search-close-button {
      right: 0.625rem;
      padding: 4px;
      min-width: 32px;
      min-height: 32px;
    }
  }

  .chat-item {
    padding: 8px 10px;
    border-radius: var(--md-sys-shape-corner-small);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    transition: all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
    animation: chatItemSlideIn var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
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
    background-color: var(--md-sys-color-surface-container-high);
  }

  .chat-item.active {
    background-color: var(--md-sys-color-secondary-container);
  }

  .chat-item:hover .chat-delete {
    opacity: 1;
  }

  .chat-info {
    flex: 1;
    min-width: 0;
  }

  .chat-title {
    font-size: 12px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 1px;
  }

  .chat-date {
    font-size: 10px;
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
    margin-bottom: 4px;
  }

  .project-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
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
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .project-icon-wrapper svg {
    width: 14px;
    height: 14px;
  }

  .project-name {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
    text-align: left;
  }

  .project-count {
    font-size: 10px;
    color: var(--text-secondary);
  }

  .expand-icon {
    width: 12px;
    height: 12px;
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
    margin-left: 28px;
    margin-top: 2px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .chat-item.nested {
    padding: 6px 10px;
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
    padding: 8px;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
    background-color: var(--bg-secondary);
    position: relative;
    z-index: 10;
    transition: padding var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
  }
  
  .sidebar.collapsed .user-section {
    padding: 8px 6px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding: 6px;
    border-radius: 8px;
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
    transition: background-color 0.2s;
    min-width: 0;
  }
  
  .sidebar.collapsed .user-info {
    justify-content: center;
    padding: 8px;
    min-width: 48px;
    width: 48px;
    height: 48px;
    border-radius: var(--md-sys-shape-corner-medium);
  }
  
  .sidebar.collapsed .user-info:hover {
    background-color: var(--md-sys-color-surface-container-high);
    transform: scale(1.05);
  }
  
  .sidebar.collapsed .user-details {
    opacity: 0;
    width: 0;
    overflow: hidden;
    position: absolute;
  }
  
  .sidebar.collapsed .user-avatar {
    width: 32px;
    height: 32px;
    min-width: 32px;
  }
  
  .sidebar.collapsed .user-avatar svg {
    width: 20px;
    height: 20px;
  }

  .user-info:hover {
    background-color: var(--hover-bg);
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    min-width: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-blue), #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }

  .user-avatar svg {
    width: 18px;
    height: 18px;
  }

  .user-details {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .username {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    width: 100%;
  }

  .workspace {
    font-size: 10px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    width: 100%;
    margin-top: 1px;
  }

  .invite-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateY(0);
    min-width: 0;
    justify-content: center;
  }

  .invite-button svg {
    width: 14px;
    height: 14px;
  }
  
  .sidebar.collapsed .invite-button {
    padding: 10px;
    min-width: 48px;
    width: 48px;
    height: 48px;
    border-radius: var(--md-sys-shape-corner-medium);
    justify-content: center;
  }
  
  .sidebar.collapsed .invite-button span {
    opacity: 0;
    width: 0;
    overflow: hidden;
    white-space: nowrap;
    position: absolute;
  }
  
  .sidebar.collapsed .invite-button svg {
    width: 20px;
    height: 20px;
  }
  
  .sidebar.collapsed .invite-button:hover {
    transform: scale(1.05);
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
