<script>
  import { user as userStore } from '../stores/user.js';
  import { chats, currentChatId, createNewChat, loadChat, deleteChat, moveChatToProject, removeChatFromProject, loadChats, syncChatsOnLogin } from '../stores/chat.js';
  import { isAuthenticatedStore, user as authUser } from '../stores/auth.js';
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { selectedModel, setModel } from '../stores/models.js';
  import { sidebarView, isSearchOpen, searchQuery, isInviteModalOpen, isProjectModalOpen, isUserMenuOpen, isSidebarOpen, isSidebarCollapsed, isMobile, isNebuliniModalOpen, isPromptLibraryModalOpen, isImageGeneratorOpen, sidebarWidth } from '../stores/app.js';
  import { projects, updateProject, deleteProject, syncProjectsOnLogin, loadProjects } from '../stores/projects.js';
  import { showConfirm } from '../services/dialogService.js';
  import { currentLanguage, t } from '../stores/language.js';
  import { sidebarLayout, isEditingSidebar, isCustomizerOpen } from '../stores/sidebarLayout.js';
  import Skeleton from './Skeleton.svelte';
  import EmptyState from './EmptyState.svelte';
  import SidebarCustomizer from './SidebarCustomizer.svelte';
  
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
  
  // Variabili per il ridimensionamento della sidebar
  let sidebarElement = null;
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  // Variabili per il drag and drop delle sezioni
  let draggedSectionIndex = null;
  let dragOverSectionIndex = null;
  let draggedMenuItemIndex = null;
  let dragOverMenuItemIndex = null;
  
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
    } else if ($sidebarView === 'history') {
      activeItem = 'history';
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
      case 'history':
        showSearchInput = false;
        // Su mobile, apri il modal invece di mostrare nella sidebar
        if ($isMobile) {
          isPromptLibraryModalOpen.set(true);
          isSidebarOpen.set(false);
        } else {
          sidebarView.set('history');
          activeItem = 'history';
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
  
  // Funzioni per il ridimensionamento della sidebar
  function handleResizeStart(event) {
    // Solo su desktop, non mobile
    if ($isMobile) return;
    
    event.preventDefault();
    isResizing = true;
    startX = event.clientX;
    startWidth = $sidebarWidth;
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }
  
  function handleResizeMove(event) {
    if (!isResizing) return;
    
    const diff = event.clientX - startX;
    const newWidth = startWidth + diff;
    sidebarWidth.set(newWidth);
  }
  
  function handleResizeEnd() {
    if (!isResizing) return;
    
    isResizing = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
  
  // Cleanup al destroy
  onDestroy(() => {
    if (isResizing) {
      handleResizeEnd();
    }
  });
  
  // Funzioni per il drag and drop delle sezioni
  function handleSectionDragStart(event, index) {
    if (!$isEditingSidebar) return;
    const section = $sidebarLayout.sections[index];
    if (section.fixed) {
      event.preventDefault();
      return;
    }
    draggedSectionIndex = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `section-${index}`);
    event.target.classList.add('dragging-section');
  }
  
  function handleSectionDragEnd(event) {
    event.target.classList.remove('dragging-section');
    draggedSectionIndex = null;
    dragOverSectionIndex = null;
  }
  
  function handleSectionDragOver(event, index) {
    if (!$isEditingSidebar || draggedSectionIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const section = $sidebarLayout.sections[index];
    if (section.fixed) return;
    
    dragOverSectionIndex = index;
  }
  
  function handleSectionDragLeave() {
    dragOverSectionIndex = null;
  }
  
  function handleSectionDrop(event, toIndex) {
    event.preventDefault();
    if (draggedSectionIndex !== null && draggedSectionIndex !== toIndex) {
      const toSection = $sidebarLayout.sections[toIndex];
      if (!toSection.fixed) {
        sidebarLayout.reorderSections(draggedSectionIndex, toIndex);
      }
    }
    draggedSectionIndex = null;
    dragOverSectionIndex = null;
  }
  
  // Funzioni per il drag and drop degli item del menu
  function handleMenuItemDragStart(event, index) {
    if (!$isEditingSidebar) return;
    draggedMenuItemIndex = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `menu-${index}`);
    event.target.classList.add('dragging-menu-item');
  }
  
  function handleMenuItemDragEnd(event) {
    event.target.classList.remove('dragging-menu-item');
    draggedMenuItemIndex = null;
    dragOverMenuItemIndex = null;
  }
  
  function handleMenuItemDragOver(event, index) {
    if (!$isEditingSidebar || draggedMenuItemIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dragOverMenuItemIndex = index;
  }
  
  function handleMenuItemDragLeave() {
    dragOverMenuItemIndex = null;
  }
  
  function handleMenuItemDrop(event, toIndex) {
    event.preventDefault();
    if (draggedMenuItemIndex !== null && draggedMenuItemIndex !== toIndex) {
      sidebarLayout.reorderMenuItems(draggedMenuItemIndex, toIndex);
    }
    draggedMenuItemIndex = null;
    dragOverMenuItemIndex = null;
  }
  
  function toggleEditMode() {
    isEditingSidebar.update(v => !v);
  }
  
  function resetSidebarLayout() {
    sidebarLayout.reset();
    isEditingSidebar.set(false);
  }
</script>

{#if $isMobile && $isSidebarOpen}
  <div class="sidebar-overlay" on:click={closeSidebar}></div>
{/if}

<aside 
  class="sidebar" 
  class:sidebar-open={$isSidebarOpen} 
  class:sidebar-mobile={$isMobile} 
  class:collapsed={$isSidebarCollapsed && !$isMobile}
  class:resizing={isResizing}
  bind:this={sidebarElement}
  style="width: {$isSidebarCollapsed && !$isMobile ? '72px' : $sidebarWidth + 'px'}"
>
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
      <div 
        class="sidebar-logo" 
        class:clickable={$isSidebarCollapsed}
        on:click={() => $isSidebarCollapsed && isSidebarCollapsed.set(false)}
        role={$isSidebarCollapsed ? 'button' : undefined}
        tabindex={$isSidebarCollapsed ? 0 : undefined}
        title={$isSidebarCollapsed ? $t('expandSidebar') : ''}
      >
        <img src="/logo.png" alt="Nebula AI" class="logo-img" />
        <span class="logo-text">Nebula AI</span>
      </div>
      {#if !$isSidebarCollapsed}
        <div class="header-actions">
          <button class="collapse-toggle-btn" on:click={() => isSidebarCollapsed.set(true)} title={$t('collapseSidebar')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- Banner modalità editing -->
  {#if $isEditingSidebar && !$isSidebarCollapsed}
    <div class="editing-banner">
      <span class="editing-icon">✏️</span>
      <div class="editing-content">
        <span class="editing-text">Trascina per riordinare</span>
        <button class="open-customizer-link" on:click={() => { 
          isCustomizerOpen.set(true); 
          isEditingSidebar.set(false);
          if ($isMobile) {
            isSidebarOpen.set(false);
          }
        }}>
          Altre opzioni →
        </button>
      </div>
      <button class="reset-btn" on:click={resetSidebarLayout} title="Ripristina default">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </button>
    </div>
  {/if}
  
  <nav class="sidebar-nav" class:editing={$isEditingSidebar}>
    <!-- Render sezioni dinamiche in base all'ordine configurato -->
    {#each $sidebarLayout.sections as section, sectionIndex (section.id)}
      {#if section.visible}
        <!-- Sezione Nuova Chat -->
        {#if section.id === 'new-chat'}
          <div 
            class="section-wrapper"
            class:drag-over-section={dragOverSectionIndex === sectionIndex}
            class:editing={$isEditingSidebar}
            class:fixed-section={section.fixed}
            draggable={$isEditingSidebar && !section.fixed}
            on:dragstart={(e) => handleSectionDragStart(e, sectionIndex)}
            on:dragend={handleSectionDragEnd}
            on:dragover={(e) => handleSectionDragOver(e, sectionIndex)}
            on:dragleave={handleSectionDragLeave}
            on:drop={(e) => handleSectionDrop(e, sectionIndex)}
          >
            {#if $isEditingSidebar && !section.fixed}
              <div class="drag-handle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
                  <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
                  <circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
                </svg>
              </div>
            {/if}
            <div class="new-chat-wrapper" on:click={() => handleMenuClick('new-chat')}>
              <button 
                class="new-chat-button" 
                role="button"
                aria-label={$t('newChat')}
                title={$isSidebarCollapsed && !$isMobile ? $t('newChat') : ''}
              >
                <span class="new-chat-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </span>
                {#if !$isSidebarCollapsed || $isMobile}
                  <span class="new-chat-text">{$t('newChat')}</span>
                  <span class="new-chat-sparkle">✨</span>
                {/if}
              </button>
            </div>
          </div>
        {/if}
        
        <!-- Sezione Menu -->
        {#if section.id === 'menu'}
          <div 
            class="section-wrapper menu-section"
            class:drag-over-section={dragOverSectionIndex === sectionIndex}
            class:editing={$isEditingSidebar}
            draggable={$isEditingSidebar}
            on:dragstart={(e) => handleSectionDragStart(e, sectionIndex)}
            on:dragend={handleSectionDragEnd}
            on:dragover={(e) => handleSectionDragOver(e, sectionIndex)}
            on:dragleave={handleSectionDragLeave}
            on:drop={(e) => handleSectionDrop(e, sectionIndex)}
          >
            {#if $isEditingSidebar}
              <div class="drag-handle section-handle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
                  <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
                  <circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
                </svg>
              </div>
            {/if}
            
            <div class="nav-section">
              <div class="nav-section-label">{$t('menu') || 'Menu'}</div>
            </div>
            
            {#each $sidebarLayout.menuItems as item, menuIndex (item.id)}
              {#if item.visible}
                <div 
                  class="nav-item-wrapper"
                  class:drag-over-menu-item={dragOverMenuItemIndex === menuIndex}
                  class:editing={$isEditingSidebar}
                  draggable={$isEditingSidebar}
                  on:dragstart={(e) => handleMenuItemDragStart(e, menuIndex)}
                  on:dragend={handleMenuItemDragEnd}
                  on:dragover={(e) => handleMenuItemDragOver(e, menuIndex)}
                  on:dragleave={handleMenuItemDragLeave}
                  on:drop={(e) => handleMenuItemDrop(e, menuIndex)}
                >
                  {#if $isEditingSidebar}
                    <div class="item-drag-handle">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="4" y1="9" x2="20" y2="9"/>
                        <line x1="4" y1="15" x2="20" y2="15"/>
                      </svg>
                    </div>
                  {/if}
                  
                  {#if item.id === 'search'}
                    {#if !showSearchInput}
                      <button 
                        class="nav-item search-button" 
                        class:active={activeItem === 'search'}
                        class:disabled={$isSidebarCollapsed && !$isMobile}
                        on:click={() => {
                          if (!$isEditingSidebar && !($isSidebarCollapsed && !$isMobile)) {
                            handleMenuClick('search');
                          }
                        }}
                        title={$isSidebarCollapsed && !$isMobile ? $t('expandSidebar') : ($t(item.labelKey) || item.label)}
                      >
                        <span class="nav-item-emoji">{item.emoji}</span>
                        {#if !$isSidebarCollapsed || $isMobile}
                          <span class="nav-item-label">{$t(item.labelKey) || item.label}</span>
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
                      on:click={() => !$isEditingSidebar && handleMenuClick(item.id)}
                      title={$isSidebarCollapsed && !$isMobile ? ($t(item.labelKey) || item.label) : ''}
                    >
                      <span class="nav-item-emoji">{item.emoji}</span>
                      {#if !$isSidebarCollapsed || $isMobile}
                        <span class="nav-item-label">{$t(item.labelKey) || item.label}</span>
                      {/if}
                      {#if item.id === 'projects' && (!$isSidebarCollapsed || $isMobile) && !$isEditingSidebar}
                        <button 
                          class="plus-icon-button" 
                          on:click|stopPropagation={() => isProjectModalOpen.set(true)}
                          title={$t('newFolder')}
                        >
                          <svg class="plus-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </button>
                      {/if}
                    </button>
                  {/if}
                  
                  {#if $isEditingSidebar}
                    <button 
                      class="visibility-toggle"
                      on:click|stopPropagation={() => sidebarLayout.toggleMenuItemVisibility(item.id)}
                      title="Nascondi"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  {/if}
                </div>
              {/if}
            {/each}
            
            <!-- Mostra item nascosti in editing mode -->
            {#if $isEditingSidebar}
              {#each $sidebarLayout.menuItems.filter(item => !item.visible) as hiddenItem}
                <div class="nav-item-wrapper hidden-item">
                  <button 
                    class="nav-item nav-item-hidden"
                    on:click={() => sidebarLayout.toggleMenuItemVisibility(hiddenItem.id)}
                    title="Mostra {hiddenItem.label}"
                  >
                    <span class="nav-item-emoji" style="opacity: 0.4">{hiddenItem.emoji}</span>
                    <span class="nav-item-label" style="opacity: 0.4; text-decoration: line-through">{$t(hiddenItem.labelKey) || hiddenItem.label}</span>
                    <svg class="show-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </button>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
        
        <!-- Sezione Chat Recenti -->
        {#if section.id === 'recent-chats'}
          <div 
            class="section-wrapper chat-section"
            class:drag-over-section={dragOverSectionIndex === sectionIndex}
            class:editing={$isEditingSidebar}
            draggable={$isEditingSidebar}
            on:dragstart={(e) => handleSectionDragStart(e, sectionIndex)}
            on:dragend={handleSectionDragEnd}
            on:dragover={(e) => handleSectionDragOver(e, sectionIndex)}
            on:dragleave={handleSectionDragLeave}
            on:drop={(e) => handleSectionDrop(e, sectionIndex)}
          >
            {#if $isEditingSidebar}
              <div class="drag-handle section-handle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
                  <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
                  <circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
                </svg>
              </div>
            {/if}
            
            <div class="nav-section chat-section-header">
              <div class="nav-section-label">{$t('recentChats') || 'Chat recenti'}</div>
            </div>
    
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
        
        {#if $sidebarView === 'history'}
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
          <!-- Cronologia standard quando non si è in search o history -->
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
          </div>
        {/if}
      {/if}
    {/each}
    
    <!-- Sezioni nascoste (editing mode) -->
    {#if $isEditingSidebar && $sidebarLayout.sections.some(s => !s.visible)}
      <div class="hidden-sections">
        <div class="nav-section">
          <div class="nav-section-label">Sezioni nascoste</div>
        </div>
        {#each $sidebarLayout.sections.filter(s => !s.visible) as hiddenSection}
          <button 
            class="hidden-section-btn"
            on:click={() => sidebarLayout.toggleSectionVisibility(hiddenSection.id)}
          >
            <span>{hiddenSection.emoji}</span>
            <span>{hiddenSection.label}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        {/each}
      </div>
    {/if}
    
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
  
  <!-- Sezione Personalizzazione Sidebar (in basso, posizione più comoda) -->
  {#if !$isSidebarCollapsed || $isMobile}
    <div class="sidebar-customize-section">
      <button 
        class="sidebar-action-btn"
        class:active={$isEditingSidebar}
        on:click={toggleEditMode}
        title={$isEditingSidebar ? 'Salva layout' : 'Riordina rapido'}
      >
        {#if $isEditingSidebar}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Salva</span>
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="9" x2="20" y2="9"/>
            <line x1="4" y1="15" x2="20" y2="15"/>
            <line x1="10" y1="3" x2="8" y2="21"/>
            <line x1="16" y1="3" x2="14" y2="21"/>
          </svg>
          <span>Riordina</span>
        {/if}
      </button>
      <button 
        class="sidebar-action-btn customize"
        class:active={$isCustomizerOpen}
        on:click={() => {
          isCustomizerOpen.set(true);
          if ($isMobile) {
            isSidebarOpen.set(false);
          }
        }}
        title="Personalizza sidebar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>Personalizza</span>
      </button>
    </div>
  {/if}
  
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
    
    <!-- Social Links -->
    <div class="social-links" class:collapsed={$isSidebarCollapsed && !$isMobile}>
      <a 
        href="https://discord.gg/ZF2pFKjVhX" 
        target="_blank" 
        rel="noopener noreferrer" 
        class="social-link discord"
        title="Discord"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        {#if !$isSidebarCollapsed || $isMobile}
          <span>Discord</span>
        {/if}
      </a>
    </div>
  </div>
  
  <!-- Handle per il ridimensionamento (solo su desktop) -->
  {#if !$isMobile && !$isSidebarCollapsed}
    <div 
      class="resize-handle"
      on:mousedown={handleResizeStart}
      role="separator"
      aria-label="Ridimensiona sidebar"
      aria-orientation="vertical"
    ></div>
  {/if}
</aside>

<!-- Pannello Personalizzazione Sidebar -->
<SidebarCustomizer />

<style>
  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg,
      rgba(0, 0, 0, 0.6) 0%,
      rgba(99, 102, 241, 0.1) 100%
    );
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 1000;
    animation: overlayFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes overlayFadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(4px);
    }
  }

  .sidebar {
    width: 280px;
    background: linear-gradient(180deg,
      var(--md-sys-color-surface-container) 0%,
      var(--md-sys-color-surface-container-low) 100%
    );
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--md-sys-color-outline-variant);
    height: 100%;
    min-height: 100%;
    animation: sidebarSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    box-shadow: 
      4px 0 20px rgba(0, 0, 0, 0.08),
      1px 0 3px rgba(0, 0, 0, 0.05);
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .sidebar.resizing {
    transition: none;
  }
  
  .sidebar.collapsed {
    width: 76px;
  }
  
  /* Handle per il ridimensionamento */
  .resize-handle {
    position: absolute;
    top: 0;
    right: -3px;
    width: 10px;
    height: 100%;
    cursor: col-resize;
    z-index: 10;
    background: transparent;
    transition: all 0.2s ease;
  }
  
  .resize-handle::before {
    content: '';
    position: absolute;
    top: 50%;
    right: 3px;
    transform: translateY(-50%);
    width: 4px;
    height: 40px;
    background: var(--md-sys-color-outline-variant);
    border-radius: 4px;
    opacity: 0;
    transition: all 0.25s ease;
  }
  
  .resize-handle:hover::before {
    opacity: 1;
    background: linear-gradient(180deg, #6366f1 0%, #a855f7 100%);
    height: 60px;
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
  }
  
  .resize-handle:active::before {
    opacity: 1;
    background: linear-gradient(180deg, #6366f1 0%, #a855f7 100%);
    height: 80px;
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
  }
  
  /* Indicatore visivo durante il resize */
  .sidebar.resizing .resize-handle::before {
    opacity: 1;
    background: linear-gradient(180deg, #6366f1 0%, #a855f7 100%);
    height: 100px;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.6);
  }
  
  /* === Stili per personalizzazione sidebar === */
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  /* Banner editing mode */
  .editing-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: linear-gradient(135deg, 
      rgba(99, 102, 241, 0.15) 0%,
      rgba(168, 85, 247, 0.1) 100%
    );
    border-bottom: 1px solid rgba(99, 102, 241, 0.3);
    animation: bannerSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  @keyframes bannerSlideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .editing-icon {
    font-size: 16px;
    animation: editPulse 1.5s ease-in-out infinite;
  }
  
  @keyframes editPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  
  .editing-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .editing-text {
    font-size: 12px;
    font-weight: 600;
    color: #6366f1;
  }
  
  .open-customizer-link {
    background: none;
    border: none;
    color: var(--md-sys-color-on-surface-variant);
    font-size: 10px;
    cursor: pointer;
    padding: 0;
    text-align: left;
    transition: color 0.2s;
  }
  
  .open-customizer-link:hover {
    color: #a855f7;
    text-decoration: underline;
  }
  
  .reset-btn {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .reset-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: rotate(-15deg);
  }
  
  /* Section wrappers per drag and drop */
  .section-wrapper {
    position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 12px;
    margin-bottom: 4px;
  }
  
  .section-wrapper.editing {
    border: 2px dashed transparent;
    padding: 4px;
    margin: 4px 0;
  }
  
  .section-wrapper.editing:not(.fixed-section) {
    border-color: var(--md-sys-color-outline-variant);
    background: rgba(99, 102, 241, 0.03);
    cursor: grab;
  }
  
  .section-wrapper.editing:not(.fixed-section):hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.08);
  }
  
  .section-wrapper.drag-over-section {
    border-color: #6366f1 !important;
    background: rgba(99, 102, 241, 0.15) !important;
    transform: scale(1.02);
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.25);
    animation: dropZonePulse 0.8s ease-in-out infinite;
  }
  
  @keyframes dropZonePulse {
    0%, 100% {
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.25);
    }
    50% {
      box-shadow: 0 4px 30px rgba(99, 102, 241, 0.4);
    }
  }
  
  .dragging-section {
    opacity: 0.6;
    transform: rotate(2deg) scale(1.05);
    box-shadow: 0 10px 40px rgba(99, 102, 241, 0.3);
    z-index: 100;
  }
  
  .dragging-menu-item {
    opacity: 0.6;
    transform: translateX(10px) rotate(1deg);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.25);
  }
  
  .section-wrapper.fixed-section.editing {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  /* Drag handles */
  .drag-handle {
    position: absolute;
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--md-sys-color-outline);
    opacity: 0;
    transition: all 0.2s ease;
    cursor: grab;
    padding: 4px;
    border-radius: 6px;
    z-index: 5;
  }
  
  .section-wrapper.editing:hover .drag-handle {
    opacity: 1;
  }
  
  .drag-handle:hover {
    color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }
  
  .section-handle {
    left: 4px;
    top: 8px;
    transform: none;
  }
  
  /* Item drag handles per menu items */
  .nav-item-wrapper.editing {
    position: relative;
    border-radius: 10px;
    transition: all 0.2s ease;
  }
  
  .nav-item-wrapper.drag-over-menu-item {
    background: rgba(99, 102, 241, 0.15);
    transform: translateX(4px);
    box-shadow: inset 0 0 0 2px #6366f1;
    border-radius: 12px;
    animation: itemDropPulse 0.6s ease-in-out infinite;
  }
  
  @keyframes itemDropPulse {
    0%, 100% {
      background: rgba(99, 102, 241, 0.15);
      transform: translateX(4px);
    }
    50% {
      background: rgba(99, 102, 241, 0.25);
      transform: translateX(6px);
    }
  }
  
  .item-drag-handle {
    position: absolute;
    left: -4px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--md-sys-color-outline);
    opacity: 0;
    transition: all 0.2s ease;
    cursor: grab;
    padding: 4px;
    border-radius: 4px;
    z-index: 5;
  }
  
  .nav-item-wrapper.editing:hover .item-drag-handle {
    opacity: 1;
    left: 2px;
  }
  
  .item-drag-handle:hover {
    color: #6366f1;
  }
  
  /* Visibility toggle */
  .visibility-toggle {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    opacity: 0;
    transition: all 0.2s ease;
    z-index: 5;
  }
  
  .nav-item-wrapper.editing:hover .visibility-toggle {
    opacity: 1;
  }
  
  .visibility-toggle:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
    color: #ef4444;
  }
  
  /* Dragging states */
  .dragging-section {
    opacity: 0.6;
    transform: scale(0.98);
    cursor: grabbing !important;
  }
  
  .dragging-menu-item {
    opacity: 0.6;
    transform: scale(0.95);
    cursor: grabbing !important;
  }
  
  /* Menu section styles when editing */
  .menu-section.editing {
    padding-bottom: 8px;
  }
  
  .chat-section.editing {
    padding-bottom: 8px;
  }
  
  /* Sidebar nav editing state */
  .sidebar-nav.editing {
    padding-top: 8px;
  }
  
  /* Hidden items styles */
  .nav-item-wrapper.hidden-item {
    opacity: 0.6;
    border: 1px dashed var(--md-sys-color-outline-variant);
    border-radius: 10px;
    margin: 4px 0;
  }
  
  .nav-item.nav-item-hidden {
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(99, 102, 241, 0.03) 10px,
      rgba(99, 102, 241, 0.03) 20px
    );
  }
  
  .nav-item.nav-item-hidden:hover {
    opacity: 1;
    background: rgba(34, 197, 94, 0.1);
    border-color: #22c55e;
  }
  
  .nav-item.nav-item-hidden .show-icon {
    margin-left: auto;
    color: #22c55e;
    opacity: 0;
    transition: all 0.2s ease;
  }
  
  .nav-item.nav-item-hidden:hover .show-icon {
    opacity: 1;
    transform: rotate(90deg);
  }
  
  /* Hidden sections */
  .hidden-sections {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--md-sys-color-outline-variant);
  }
  
  .hidden-section-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(99, 102, 241, 0.03) 10px,
      rgba(99, 102, 241, 0.03) 20px
    );
    border: 1px dashed var(--md-sys-color-outline-variant);
    border-radius: 10px;
    color: var(--md-sys-color-on-surface-variant);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: 0.6;
    margin-bottom: 4px;
  }
  
  .hidden-section-btn:hover {
    opacity: 1;
    background: rgba(34, 197, 94, 0.1);
    border-color: #22c55e;
    color: #22c55e;
  }
  
  .hidden-section-btn svg {
    margin-left: auto;
    transition: transform 0.2s ease;
  }
  
  .hidden-section-btn:hover svg {
    transform: rotate(90deg);
  }
  
  .sidebar-header {
    padding: 16px 12px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: linear-gradient(180deg,
      var(--md-sys-color-surface-container-high) 0%,
      var(--md-sys-color-surface-container) 100%
    );
  }
  
  .sidebar.collapsed .sidebar-header {
    padding: 12px 8px;
    justify-content: center;
  }
  
  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .sidebar.collapsed .sidebar-logo {
    justify-content: center;
    gap: 0;
  }
  
  .sidebar-logo.clickable {
    cursor: pointer;
    padding: 8px;
    margin: -8px;
    border-radius: 12px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .sidebar-logo.clickable:hover {
    background: var(--md-sys-color-surface-container-highest);
    transform: scale(1.05);
  }
  
  .logo-img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .sidebar-logo:hover .logo-img {
    transform: rotate(-5deg) scale(1.1);
  }
  
  .logo-text {
    font-size: 18px;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    overflow: hidden;
  }
  
  .sidebar.collapsed .logo-text {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }
  
  .collapse-toggle-btn {
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 8px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
  }
  
  .collapse-toggle-btn:hover {
    background: var(--md-sys-color-surface-container-highest);
    border-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-primary);
    transform: translateX(-2px);
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
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    background: linear-gradient(180deg,
      var(--md-sys-color-surface-container-high) 0%,
      var(--md-sys-color-surface-container) 100%
    );
  }

  .sidebar-header-mobile h3 {
    font-size: 18px;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }

  .close-sidebar-btn {
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 8px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .close-sidebar-btn:hover {
    background: var(--md-sys-color-surface-container-highest);
    border-color: #ef4444;
    color: #ef4444;
    transform: rotate(90deg);
  }

  /* Tablet styles */
  @media (min-width: 769px) and (max-width: 1024px) {
    .sidebar {
      /* La larghezza è gestita dinamicamente tramite lo store */
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

    .sidebar-customize-section {
      padding: 10px 12px;
    }

    .sidebar-action-btn {
      padding: 12px 14px;
      font-size: 13px;
      min-height: 48px;
      touch-action: manipulation;
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
    padding: 12px;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
  }
  
  /* Custom scrollbar per sidebar */
  .sidebar-nav::-webkit-scrollbar {
    width: 6px;
  }
  
  .sidebar-nav::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .sidebar-nav::-webkit-scrollbar-thumb {
    background: var(--md-sys-color-outline-variant);
    border-radius: 10px;
  }
  
  .sidebar-nav::-webkit-scrollbar-thumb:hover {
    background: var(--md-sys-color-outline);
  }
  
  .chat-list::-webkit-scrollbar {
    width: 4px;
  }
  
  .chat-list::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .chat-list::-webkit-scrollbar-thumb {
    background: var(--md-sys-color-outline-variant);
    border-radius: 10px;
  }
  
  /* Sezione navigazione */
  .nav-section {
    padding: 8px 12px 4px;
    opacity: 0;
    height: 0;
    overflow: hidden;
    transition: all 0.2s ease;
  }
  
  .sidebar:not(.collapsed) .nav-section {
    opacity: 1;
    height: auto;
  }
  
  .nav-section-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--md-sys-color-on-surface-variant);
    opacity: 0.6;
  }
  
  .chat-section-header {
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--md-sys-color-outline-variant);
  }
  
  /* Bottone nuova chat premium */
  .new-chat-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-top: 4px;
    margin-bottom: 12px;
    cursor: pointer;
  }
  
  .new-chat-button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
    border: none;
    border-radius: 14px;
    color: white;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.3px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
    box-shadow: 
      0 4px 15px rgba(99, 102, 241, 0.4),
      0 2px 4px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    overflow: hidden;
  }
  
  .new-chat-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transition: left 0.5s ease;
  }
  
  .new-chat-wrapper:hover .new-chat-button::before {
    left: 100%;
  }
  
  .new-chat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    transition: transform 0.3s ease;
  }
  
  .new-chat-icon svg {
    width: 16px;
    height: 16px;
  }
  
  .new-chat-wrapper:hover .new-chat-icon {
    transform: rotate(90deg);
  }
  
  .new-chat-text {
    flex: 1;
    text-align: left;
  }
  
  .new-chat-sparkle {
    font-size: 14px;
    animation: sparkle 2s ease-in-out infinite;
  }
  
  @keyframes sparkle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.2); }
  }
  
  .sidebar.collapsed .new-chat-button {
    padding: 12px;
    min-width: 48px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }
  
  .sidebar.collapsed .new-chat-icon {
    width: 28px;
    height: 28px;
    background: rgba(255, 255, 255, 0.15);
  }
  
  .sidebar.collapsed .new-chat-icon svg {
    width: 18px;
    height: 18px;
  }
  
  .sidebar.collapsed .new-chat-button:hover {
    transform: scale(1.08);
    box-shadow: 
      0 6px 20px rgba(99, 102, 241, 0.5),
      0 3px 6px rgba(0, 0, 0, 0.15);
  }
  
  .new-chat-button:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 8px 25px rgba(99, 102, 241, 0.5),
      0 4px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
  
  .new-chat-button:active {
    transform: translateY(0);
    box-shadow: 
      0 2px 10px rgba(99, 102, 241, 0.4),
      0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: transparent;
    border: none;
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    text-align: left;
    flex-shrink: 0;
  }
  
  .nav-item-emoji {
    font-size: 18px;
    line-height: 1;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .nav-item:hover .nav-item-emoji {
    transform: scale(1.2);
  }
  
  .nav-item-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .sidebar.collapsed .nav-item {
    justify-content: center;
    padding: 10px;
    min-width: 48px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }
  
  .sidebar.collapsed .nav-item-label {
    opacity: 0;
    width: 0;
    overflow: hidden;
    white-space: nowrap;
    position: absolute;
  }
  
  .sidebar.collapsed .nav-item-emoji {
    font-size: 22px;
  }
  
  .sidebar.collapsed .nav-item:hover {
    transform: scale(1.1);
    background: linear-gradient(135deg, 
      var(--md-sys-color-surface-container-high) 0%,
      var(--md-sys-color-surface-container-highest) 100%
    );
  }
  
  .sidebar.collapsed .nav-item.active {
    background: linear-gradient(135deg, 
      var(--md-sys-color-primary-container) 0%,
      var(--md-sys-color-secondary-container) 100%
    );
  }

  .nav-item:hover {
    background: linear-gradient(90deg, 
      var(--md-sys-color-surface-container-high) 0%,
      transparent 100%
    );
    color: var(--md-sys-color-on-surface);
    padding-left: 16px;
  }

  .nav-item:active {
    transform: scale(0.98);
  }

  .nav-item.active {
    background: linear-gradient(90deg, 
      var(--md-sys-color-primary-container) 0%,
      rgba(var(--md-sys-color-primary-rgb), 0.05) 100%
    );
    color: var(--md-sys-color-on-primary-container);
  }
  
  .nav-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 60%;
    background: linear-gradient(180deg, #6366f1, #a855f7);
    border-radius: 0 4px 4px 0;
  }

  .nav-item svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }

  .plus-icon {
    margin-left: auto;
    opacity: 0.6;
  }

  .plus-icon-button {
    margin-left: auto;
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
  }
  
  .nav-item:hover .plus-icon-button {
    opacity: 1;
  }

  .plus-icon-button:hover {
    opacity: 1;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    border-color: transparent;
    color: white;
    transform: rotate(90deg) scale(1.1);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
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
    animation: searchSlideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .sidebar.collapsed .search-group-animated {
    display: none;
  }

  @keyframes searchSlideIn {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .search-input {
    font-family: inherit;
    width: 100%;
    height: 42px;
    padding-left: 2.5rem;
    padding-right: 2.5rem;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 12px;
    background: var(--md-sys-color-surface-container);
    outline: none;
    color: var(--text-primary);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: text;
    z-index: 0;
    font-size: 13px;
    font-weight: 500;
  }

  .search-input::placeholder {
    color: var(--text-secondary);
    font-weight: 400;
  }

  .search-input:hover {
    border-color: var(--md-sys-color-outline);
    background: var(--md-sys-color-surface-container-high);
  }

  .search-input:focus {
    border-color: #6366f1;
    background: var(--md-sys-color-surface-container-high);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    fill: var(--text-secondary);
    width: 1rem;
    height: 1rem;
    pointer-events: none;
    z-index: 1;
    transition: fill 0.2s ease;
  }
  
  .search-input:focus ~ .search-icon,
  .search-group-animated:focus-within .search-icon {
    fill: #6366f1;
  }

  .search-close-button {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: var(--md-sys-color-surface-container-high);
    border: none;
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all 0.2s ease;
    z-index: 2;
    border-radius: 8px;
  }

  .search-close-button:hover {
    background: var(--md-sys-color-surface-container-highest);
    color: var(--text-primary);
    transform: translateY(-50%) scale(1.1);
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
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    animation: chatItemSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    animation-fill-mode: both;
    position: relative;
    border: 1px solid transparent;
  }

  .chat-item:nth-child(1) { animation-delay: 0.03s; }
  .chat-item:nth-child(2) { animation-delay: 0.06s; }
  .chat-item:nth-child(3) { animation-delay: 0.09s; }
  .chat-item:nth-child(4) { animation-delay: 0.12s; }
  .chat-item:nth-child(n+5) { animation-delay: 0.15s; }

  @keyframes chatItemSlideIn {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .chat-item:hover {
    background: linear-gradient(135deg, 
      var(--md-sys-color-surface-container-high) 0%,
      var(--md-sys-color-surface-container) 100%
    );
    border-color: var(--md-sys-color-outline-variant);
    transform: translateX(4px);
  }

  .chat-item.active {
    background: linear-gradient(135deg, 
      var(--md-sys-color-primary-container) 0%,
      rgba(var(--md-sys-color-primary-rgb), 0.08) 100%
    );
    border-color: var(--md-sys-color-primary);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  }

  .chat-item.active::before {
    content: '💬';
    position: absolute;
    left: -4px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 10px;
  }

  .chat-item:hover .chat-delete,
  .chat-item:hover .chat-actions {
    opacity: 1;
  }

  .chat-info {
    flex: 1;
    min-width: 0;
  }

  .chat-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
    line-height: 1.3;
  }

  .chat-date {
    font-size: 11px;
    color: var(--text-secondary);
    opacity: 0.8;
  }

  .chat-delete {
    opacity: 0;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    border-radius: 8px;
  }

  .chat-item:hover .chat-delete {
    opacity: 1;
  }

  .chat-delete:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.12);
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
    margin-bottom: 6px;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .project-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    background: transparent;
    border: 1px solid transparent;
  }

  .project-header:hover {
    background: var(--md-sys-color-surface-container-high);
    border-color: var(--md-sys-color-outline-variant);
  }

  .project-header.unassigned-header {
    cursor: default;
    opacity: 0.7;
    padding: 8px 12px;
  }

  .project-icon-wrapper {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .project-header:hover .project-icon-wrapper {
    transform: scale(1.1);
  }

  .project-icon-wrapper svg {
    width: 16px;
    height: 16px;
  }

  .project-name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    text-align: left;
  }

  .project-count {
    font-size: 11px;
    color: var(--text-secondary);
    background: var(--md-sys-color-surface-container);
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
  }

  .expand-icon {
    width: 14px;
    height: 14px;
    color: var(--text-secondary);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    border-radius: 8px;
  }

  .project-header:hover .project-delete {
    opacity: 1;
  }

  .project-delete:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.12);
    transform: scale(1.1);
  }

  .project-chats {
    margin-left: 20px;
    margin-top: 4px;
    padding-left: 12px;
    border-left: 2px solid var(--md-sys-color-outline-variant);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .chat-item.nested {
    padding: 8px 10px;
    margin-left: 0;
    border-radius: 8px;
  }

  .chat-item.dragging {
    opacity: 0.5;
    cursor: grabbing;
    transform: scale(0.98);
  }

  .project-header.drag-over {
    background: linear-gradient(135deg, 
      rgba(99, 102, 241, 0.15) 0%,
      rgba(168, 85, 247, 0.1) 100%
    );
    border: 2px dashed #6366f1;
    transform: scale(1.02);
  }

  .chat-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(8px);
  }

  .chat-item:hover .chat-actions {
    opacity: 1;
    transform: translateX(0);
  }

  .chat-move {
    background: var(--md-sys-color-surface-container);
    border: 1px solid transparent;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 8px;
  }

  .chat-move:hover {
    color: #6366f1;
    background: linear-gradient(135deg, 
      rgba(99, 102, 241, 0.15) 0%,
      rgba(168, 85, 247, 0.1) 100%
    );
    border-color: rgba(99, 102, 241, 0.3);
    transform: scale(1.1);
  }

  .move-menu-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(2px);
    animation: overlayFadeIn 0.2s ease;
  }

  .move-menu {
    position: fixed;
    background: var(--md-sys-color-surface-container-high);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 16px;
    box-shadow: 
      0 8px 30px rgba(0, 0, 0, 0.2),
      0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1001;
    min-width: 220px;
    max-width: 320px;
    overflow: hidden;
    transform: translateY(-50%);
    animation: menuSlideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  @keyframes menuSlideIn {
    from {
      opacity: 0;
      transform: translateY(-50%) translateX(-10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) translateX(0) scale(1);
    }
  }

  .move-menu-header {
    padding: 14px 18px;
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    background: var(--md-sys-color-surface-container);
  }

  .move-menu-options {
    max-height: 300px;
    overflow-y: auto;
    padding: 8px;
  }

  .move-option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: transparent;
    border: none;
    border-radius: 10px;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .move-option:hover {
    background: var(--md-sys-color-surface-container-highest);
    transform: translateX(4px);
  }

  .move-option-icon {
    width: 24px;
    height: 24px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
  
  .move-option:hover .move-option-icon {
    transform: scale(1.1);
  }

  /* === Sezione Personalizzazione Sidebar (in basso) === */
  .sidebar-customize-section {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid var(--md-sys-color-outline-variant);
    background: linear-gradient(180deg,
      rgba(99, 102, 241, 0.03) 0%,
      rgba(168, 85, 247, 0.02) 100%
    );
  }

  .sidebar-action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    background: var(--md-sys-color-surface-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 10px;
    color: var(--md-sys-color-on-surface-variant);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar-action-btn:hover {
    background: var(--md-sys-color-surface-container-highest);
    border-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-primary);
    transform: translateY(-1px);
  }

  .sidebar-action-btn.active {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-color: transparent;
    color: white;
    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.35);
  }

  .sidebar-action-btn.active:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.5);
  }

  .sidebar-action-btn.customize.active {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
  }

  .sidebar-action-btn.customize.active:hover {
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.5);
  }

  .sidebar-action-btn svg {
    flex-shrink: 0;
  }

  .sidebar-action-btn span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-section {
    padding: 12px;
    border-top: 1px solid var(--md-sys-color-outline-variant);
    flex-shrink: 0;
    background: linear-gradient(180deg,
      transparent 0%,
      var(--md-sys-color-surface-container) 100%
    );
    position: relative;
    z-index: 10;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .sidebar.collapsed .user-section {
    padding: 8px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    padding: 10px;
    border-radius: 12px;
    background: var(--md-sys-color-surface-container-high);
    border: 1px solid var(--md-sys-color-outline-variant);
    width: 100%;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 0;
  }
  
  .sidebar.collapsed .user-info {
    justify-content: center;
    padding: 10px;
    min-width: 48px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    margin-bottom: 8px;
  }
  
  .sidebar.collapsed .user-info:hover {
    background: var(--md-sys-color-surface-container-highest);
    transform: scale(1.08);
    border-color: var(--md-sys-color-primary);
  }
  
  .sidebar.collapsed .user-details {
    opacity: 0;
    width: 0;
    overflow: hidden;
    position: absolute;
  }
  
  .sidebar.collapsed .user-avatar {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }
  
  .sidebar.collapsed .user-avatar svg {
    width: 18px;
    height: 18px;
  }

  .user-info:hover {
    background: var(--md-sys-color-surface-container-highest);
    border-color: var(--md-sys-color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: 10px;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }

  .user-avatar svg {
    width: 18px;
    height: 18px;
  }

  .user-details {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-align: left;
  }

  .username {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    width: 100%;
    line-height: 1.3;
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
    opacity: 0.8;
  }

  .invite-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: linear-gradient(135deg, 
      rgba(34, 197, 94, 0.1) 0%,
      rgba(16, 185, 129, 0.05) 100%
    );
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 12px;
    color: #22c55e;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 0;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  
  .invite-button::before {
    content: '🎁';
    font-size: 16px;
    margin-right: 2px;
  }

  .invite-button svg {
    width: 16px;
    height: 16px;
    display: none;
  }
  
  .sidebar.collapsed .invite-button {
    padding: 10px;
    min-width: 48px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    justify-content: center;
  }
  
  .sidebar.collapsed .invite-button::before {
    content: '🎁';
    font-size: 20px;
    margin: 0;
  }
  
  .sidebar.collapsed .invite-button span {
    opacity: 0;
    width: 0;
    overflow: hidden;
    white-space: nowrap;
    position: absolute;
  }
  
  .sidebar.collapsed .invite-button:hover {
    transform: scale(1.08);
    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
  }

  .invite-button:hover {
    background: linear-gradient(135deg, 
      rgba(34, 197, 94, 0.2) 0%,
      rgba(16, 185, 129, 0.1) 100%
    );
    border-color: #22c55e;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.25);
  }

  .invite-button:active {
    transform: translateY(0);
  }

  .invite-button span {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  /* Social Links */
  .social-links {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 8px 0 4px 0;
    margin-top: 4px;
  }

  .social-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 10px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--md-sys-color-surface-container);
    border: 1px solid transparent;
  }

  .social-link:hover {
    transform: translateY(-2px);
  }

  .social-link svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .social-link.discord {
    color: #5865F2;
    background: rgba(88, 101, 242, 0.1);
    border-color: rgba(88, 101, 242, 0.2);
  }

  .social-link.discord:hover {
    background: rgba(88, 101, 242, 0.2);
    border-color: rgba(88, 101, 242, 0.4);
    box-shadow: 0 4px 15px rgba(88, 101, 242, 0.25);
    color: #5865F2;
  }

  .social-links.collapsed {
    padding: 8px 0 4px 0;
  }

  .social-links.collapsed .social-link {
    padding: 10px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }

  .social-links.collapsed .social-link span {
    display: none;
  }

  .social-links.collapsed .social-link svg {
    width: 20px;
    height: 20px;
  }

  .social-links.collapsed .social-link:hover {
    transform: scale(1.08);
  }

  @media (max-width: 768px) {
    .social-links {
      padding: 10px 0 6px 0;
    }

    .social-link {
      padding: 10px 16px;
      font-size: 13px;
    }
  }
</style>
