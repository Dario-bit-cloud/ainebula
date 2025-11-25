<script>
  import { onMount, onDestroy } from 'svelte';
  import TopBar from './components/TopBar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import MainArea from './components/MainArea.svelte';
  import UserMenu from './components/UserMenu.svelte';
  // Lazy load modals per ridurre il bundle iniziale
  import { selectedPrompt, isSettingsOpen, isShortcutsModalOpen, isAISettingsModalOpen, sidebarView, isSearchOpen, isSidebarOpen, isMobile, isAuthModalOpen, isInviteModalOpen, isProjectModalOpen, isPremiumModalOpen, isPromptLibraryModalOpen, isReportBugModalOpen, isPersonalizationModalOpen, isSharedLinksModalOpen } from './stores/app.js';
  import { initAuth, user, isAuthenticatedStore, isLoading } from './stores/auth.js';
  import { logout } from './services/authService.js';
  import { clearUser } from './stores/auth.js';
  import { createNewChat, deleteChat } from './stores/chat.js';
  import { get } from 'svelte/store';
  import { currentChatId } from './stores/chat.js';
  import { isInputElement } from './utils/shortcuts.js';
  import { showConfirm } from './services/dialogService.js';
  
  // Lazy load modals
  let SettingsModal, InviteModal, ProjectModal, PremiumModal, AISettingsModal;
  let PromptLibraryModal, ShortcutsModal, ReportBugModal, PersonalizationModal, AuthModal, SharedLinksModal;
  // Dialog components (always loaded)
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import AlertDialog from './components/AlertDialog.svelte';
  import PromptDialog from './components/PromptDialog.svelte';
  
  // Carica modals solo quando necessario
  async function loadSettingsModal() {
    if (!SettingsModal) {
      const module = await import('./components/SettingsModal.svelte');
      SettingsModal = module.default;
    }
  }
  
  async function loadInviteModal() {
    if (!InviteModal) {
      const module = await import('./components/InviteModal.svelte');
      InviteModal = module.default;
    }
  }
  
  async function loadProjectModal() {
    if (!ProjectModal) {
      const module = await import('./components/ProjectModal.svelte');
      ProjectModal = module.default;
    }
  }
  
  async function loadPremiumModal() {
    if (!PremiumModal) {
      const module = await import('./components/PremiumModal.svelte');
      PremiumModal = module.default;
    }
  }
  
  async function loadAISettingsModal() {
    if (!AISettingsModal) {
      const module = await import('./components/AISettingsModal.svelte');
      AISettingsModal = module.default;
    }
  }
  
  async function loadPromptLibraryModal() {
    if (!PromptLibraryModal) {
      const module = await import('./components/PromptLibraryModal.svelte');
      PromptLibraryModal = module.default;
    }
  }
  
  async function loadShortcutsModal() {
    if (!ShortcutsModal) {
      const module = await import('./components/ShortcutsModal.svelte');
      ShortcutsModal = module.default;
    }
  }
  
  async function loadReportBugModal() {
    if (!ReportBugModal) {
      const module = await import('./components/ReportBugModal.svelte');
      ReportBugModal = module.default;
    }
  }
  
  async function loadPersonalizationModal() {
    if (!PersonalizationModal) {
      const module = await import('./components/PersonalizationModal.svelte');
      PersonalizationModal = module.default;
    }
  }
  
  async function loadAuthModal() {
    if (!AuthModal) {
      const module = await import('./components/AuthModal.svelte');
      AuthModal = module.default;
    }
  }
  
  async function loadSharedLinksModal() {
    if (!SharedLinksModal) {
      const module = await import('./components/SharedLinksModal.svelte');
      SharedLinksModal = module.default;
    }
  }
  
  // Precarica modals quando vengono aperti
  $: if ($isSettingsOpen) loadSettingsModal();
  $: if ($isInviteModalOpen) loadInviteModal();
  $: if ($isSharedLinksModalOpen) loadSharedLinksModal();
  $: if ($isProjectModalOpen) loadProjectModal();
  $: if ($isPremiumModalOpen) loadPremiumModal();
  $: if ($isShortcutsModalOpen) loadShortcutsModal();
  $: if ($isAISettingsModalOpen) loadAISettingsModal();
  $: if ($isPromptLibraryModalOpen) loadPromptLibraryModal();
  $: if ($isReportBugModalOpen) loadReportBugModal();
  $: if ($isPersonalizationModalOpen) loadPersonalizationModal();
  $: if ($isAuthModalOpen) loadAuthModal();
  
  function handlePromptSelect(event) {
    selectedPrompt.set(event.detail);
  }
  
  function handleKeyboardShortcuts(event) {
    // Non gestire scorciatoie se l'utente sta digitando in un input
    const activeElement = document.activeElement;
    if (isInputElement(activeElement)) {
      // Eccezioni: alcune scorciatoie funzionano anche negli input
      const inputShortcuts = ['Ctrl+/', 'Ctrl+Shift+I', 'Shift+Esc'];
      const keyString = `${event.ctrlKey || event.metaKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.altKey ? 'Alt+' : ''}${event.key === 'Escape' ? 'Esc' : event.key}`;
      if (!inputShortcuts.some(shortcut => keyString.includes(shortcut.split('+')[0]))) {
        return;
      }
    }
    
    // Ctrl+K: Cerca chat (solo se non è in un input)
    if ((event.ctrlKey || event.metaKey) && event.key === 'k' && !event.shiftKey && !event.altKey) {
      // Previeni il comportamento predefinito del browser solo se non siamo in un input
      if (!isInputElement(activeElement)) {
        event.preventDefault();
        sidebarView.set('search');
        isSearchOpen.set(true);
        // Focus sull'input di ricerca dopo un breve delay
        setTimeout(() => {
          const searchInput = document.querySelector('.search-input');
          if (searchInput) searchInput.focus();
        }, 100);
      }
      return;
    }
    
    // Ctrl+Shift+O: Nuova chat
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      createNewChat(); // Non await per non bloccare
      if ($isMobile) {
        isSidebarOpen.set(false);
      }
      return;
    }
    
    // Ctrl+Shift+S: Toggle sidebar
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      isSidebarOpen.update(open => !open);
      return;
    }
    
    // Ctrl+,: Impostazioni
    if ((event.ctrlKey || event.metaKey) && event.key === ',') {
      event.preventDefault();
      isSettingsOpen.set(true);
      return;
    }
    
    // Ctrl+Shift+;: Copia ultimo blocco di codice
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === ';') {
      event.preventDefault();
      copyLastCodeBlock();
      return;
    }
    
    // Ctrl+Shift+Backspace: Elimina chat corrente
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Backspace') {
      event.preventDefault();
      const chatId = get(currentChatId);
      if (chatId) {
        showConfirm('Sei sicuro di voler eliminare questa chat?', 'Elimina chat', 'Elimina', 'Annulla', 'danger').then(confirmed => {
          if (confirmed) {
            deleteChat(chatId); // Non await per non bloccare
          }
        });
      }
      return;
    }
    
    // Shift+Esc: Focus sull'input della chat
    if (event.shiftKey && event.key === 'Escape') {
      event.preventDefault();
      const chatInput = document.querySelector('.message-input');
      if (chatInput) {
        chatInput.focus();
      }
      return;
    }
    
    // Ctrl+U: Aggiungi file (solo se non è in un input)
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'u' && !event.shiftKey && !event.altKey) {
      if (!isInputElement(activeElement)) {
        event.preventDefault();
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          fileInput.click();
        }
      }
      return;
    }
    
    // Ctrl+/: Mostra scorciatoie
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
      event.preventDefault();
      isShortcutsModalOpen.set(true);
      return;
    }
    
    // Ctrl+Shift+I: Istruzioni personalizzate (disabilitato)
    // if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'i') {
    //   event.preventDefault();
    //   isAISettingsModalOpen.set(true);
    //   return;
    // }
  }
  
  function copyLastCodeBlock() {
    // Trova l'ultimo blocco di codice nella chat
    const codeBlocks = document.querySelectorAll('.code-block-wrapper');
    if (codeBlocks.length > 0) {
      const lastBlock = codeBlocks[codeBlocks.length - 1];
      const codeElement = lastBlock.querySelector('code');
      if (codeElement) {
        const text = codeElement.textContent || codeElement.innerText;
        navigator.clipboard.writeText(text).then(() => {
          // Mostra notifica
          showCopyNotification();
        }).catch(err => {
          console.error('Errore nella copia:', err);
        });
      }
    }
  }
  
  function showCopyNotification() {
    // Usa la funzione esistente se disponibile, altrimenti mostra un alert
    if (window.showCopyToast) {
      window.showCopyToast();
    } else {
      // Crea una notifica temporanea
      const toast = document.createElement('div');
      toast.textContent = '✓ Codice copiato!';
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #3b82f6;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }
  }
  
  let authModalMode = 'login'; // 'login' o 'register'
  
  // Inizializza autenticazione
  onMount(() => {
    window.addEventListener('keydown', handleKeyboardShortcuts);
    initAuth();
  });
  
  function handleOpenAuth(event) {
    authModalMode = event.detail.mode || 'login';
    isAuthModalOpen.set(true);
  }
  
  // Sincronizza authModalMode con isAuthModalOpen
  $: if ($isAuthModalOpen && !authModalMode) {
    authModalMode = 'login';
  }
  
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyboardShortcuts);
  });
</script>

<div class="app-container">
  <TopBar on:openAuth={handleOpenAuth} />
  <div class="main-layout">
    <Sidebar />
    <MainArea />
  </div>
  <UserMenu />
  {#if $isSettingsOpen && SettingsModal}
    <svelte:component this={SettingsModal} />
  {/if}
  {#if $isInviteModalOpen && InviteModal}
    <svelte:component this={InviteModal} />
  {/if}
  {#if $isProjectModalOpen && ProjectModal}
    <svelte:component this={ProjectModal} />
  {/if}
  {#if $isPremiumModalOpen && PremiumModal}
    <svelte:component this={PremiumModal} />
  {/if}
  {#if $isAISettingsModalOpen && AISettingsModal}
    <svelte:component this={AISettingsModal} />
  {/if}
  {#if $isPromptLibraryModalOpen && PromptLibraryModal}
    <svelte:component this={PromptLibraryModal} on:select={handlePromptSelect} />
  {/if}
  {#if $isShortcutsModalOpen && ShortcutsModal}
    <svelte:component this={ShortcutsModal} />
  {/if}
  {#if $isReportBugModalOpen && ReportBugModal}
    <svelte:component this={ReportBugModal} />
  {/if}
  {#if $isPersonalizationModalOpen && PersonalizationModal}
    <svelte:component this={PersonalizationModal} />
  {/if}
  {#if $isAuthModalOpen && AuthModal}
    <svelte:component this={AuthModal} initialMode={authModalMode} on:close={() => isAuthModalOpen.set(false)} />
  {/if}
  {#if $isSharedLinksModalOpen && SharedLinksModal}
    <svelte:component this={SharedLinksModal} />
  {/if}
  
  <!-- Dialog components -->
  <ConfirmDialog />
  <AlertDialog />
  <PromptDialog />
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height per mobile */
    width: 100%;
    overflow: hidden;
  }

  .main-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
    min-height: 0;
  }

  @media (max-width: 768px) {
    .main-layout {
      width: 100%;
    }

    .app-container {
      overflow: hidden;
      position: fixed;
      width: 100vw;
      height: 100vh;
      height: 100dvh; /* Dynamic viewport height per mobile */
    }
  }

  /* Previeni scroll orizzontale su mobile */
  @media (max-width: 768px) {
    .app-container {
      overflow-x: hidden;
    }
  }
</style>
