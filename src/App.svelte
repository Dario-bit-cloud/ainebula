<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import Sidebar from './components/Sidebar.svelte';
  import MainArea from './components/MainArea.svelte';
  import UserMenu from './components/UserMenu.svelte';
  // Lazy load modals per ridurre il bundle iniziale
  import { selectedPrompt, isSettingsOpen, isShortcutsModalOpen, isAISettingsModalOpen, sidebarView, isSearchOpen, isSidebarOpen, isMobile, isAuthModalOpen, isInviteModalOpen, isProjectModalOpen, isPremiumModalOpen, isPromptLibraryModalOpen, isReportBugModalOpen, isPersonalizationModalOpen, isSharedLinksModalOpen, isHelpCenterModalOpen, isReleaseNotesModalOpen, isTermsModalOpen, isDownloadAppModalOpen, isWorkspaceSettingsModalOpen, isNebuliniModalOpen, isImageGeneratorOpen } from './stores/app.js';
  import { initAuth, user, isAuthenticatedStore, isLoading } from './stores/auth.js';
  import { logout } from './services/authService.js';
  import { clearUser } from './stores/auth.js';
  import { createNewChat, deleteChat } from './stores/chat.js';
  import { get } from 'svelte/store';
  import { currentChatId } from './stores/chat.js';
  import { isInputElement } from './utils/shortcuts.js';
  import { showConfirm, showAlert } from './services/dialogService.js';
  import { linkPatreonAccount } from './services/patreonService.js';
  
  // Lazy load modals
  let SettingsModal, InviteModal, ProjectModal, PremiumModal, AISettingsModal;
  let PromptLibraryModal, ShortcutsModal, ReportBugModal, PersonalizationModal, AuthModal, SharedLinksModal;
  let HelpCenterModal, ReleaseNotesModal, TermsModal, DownloadAppModal, WorkspaceSettingsModal, NebuliniModal, ImageGeneratorModal;
  // Dialog components (always loaded)
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import AlertDialog from './components/AlertDialog.svelte';
  import PromptDialog from './components/PromptDialog.svelte';
  
  // Carica modals solo quando necessario
  async function loadSettingsModal() {
    if (!SettingsModal) {
      const module = await import('./components/SettingsModal.svelte');
      SettingsModal = module.default;
      await tick(); // Assicura che Svelte rilevi il cambiamento
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
  
  async function loadHelpCenterModal() {
    if (!HelpCenterModal) {
      const module = await import('./components/HelpCenterModal.svelte');
      HelpCenterModal = module.default;
    }
  }
  
  async function loadReleaseNotesModal() {
    if (!ReleaseNotesModal) {
      const module = await import('./components/ReleaseNotesModal.svelte');
      ReleaseNotesModal = module.default;
    }
  }
  
  async function loadTermsModal() {
    if (!TermsModal) {
      const module = await import('./components/TermsModal.svelte');
      TermsModal = module.default;
    }
  }
  
  async function loadDownloadAppModal() {
    if (!DownloadAppModal) {
      const module = await import('./components/DownloadAppModal.svelte');
      DownloadAppModal = module.default;
    }
  }
  
  async function loadWorkspaceSettingsModal() {
    if (!WorkspaceSettingsModal) {
      const module = await import('./components/WorkspaceSettingsModal.svelte');
      WorkspaceSettingsModal = module.default;
    }
  }
  
  async function loadNebuliniModal() {
    if (!NebuliniModal) {
      const module = await import('./components/NebuliniModal.svelte');
      NebuliniModal = module.default;
    }
  }
  
  async function loadImageGeneratorModal() {
    if (!ImageGeneratorModal) {
      const module = await import('./components/ImageGeneratorModal.svelte');
      ImageGeneratorModal = module.default;
    }
  }
  
  // Precarica modals quando vengono aperti
  $: if ($isSettingsOpen && !SettingsModal) {
    loadSettingsModal();
  }
  $: if ($isInviteModalOpen && !InviteModal) {
    loadInviteModal();
  }
  $: if ($isSharedLinksModalOpen && !SharedLinksModal) {
    loadSharedLinksModal();
  }
  $: if ($isProjectModalOpen && !ProjectModal) {
    loadProjectModal();
  }
  $: if ($isPremiumModalOpen && !PremiumModal) {
    loadPremiumModal();
  }
  $: if ($isShortcutsModalOpen && !ShortcutsModal) {
    loadShortcutsModal();
  }
  $: if ($isAISettingsModalOpen && !AISettingsModal) {
    loadAISettingsModal();
  }
  $: if ($isPromptLibraryModalOpen && !PromptLibraryModal) {
    loadPromptLibraryModal();
  }
  $: if ($isReportBugModalOpen && !ReportBugModal) {
    loadReportBugModal();
  }
  $: if ($isPersonalizationModalOpen && !PersonalizationModal) {
    loadPersonalizationModal();
  }
  $: if ($isAuthModalOpen && !AuthModal) {
    loadAuthModal();
  }
  $: if ($isHelpCenterModalOpen && !HelpCenterModal) {
    loadHelpCenterModal();
  }
  $: if ($isReleaseNotesModalOpen && !ReleaseNotesModal) {
    loadReleaseNotesModal();
  }
  $: if ($isTermsModalOpen && !TermsModal) {
    loadTermsModal();
  }
  $: if ($isDownloadAppModalOpen && !DownloadAppModal) {
    loadDownloadAppModal();
  }
  $: if ($isWorkspaceSettingsModalOpen && !WorkspaceSettingsModal) {
    loadWorkspaceSettingsModal();
  }
  $: if ($isNebuliniModalOpen && !NebuliniModal) {
    loadNebuliniModal();
  }
  $: if ($isImageGeneratorOpen && !ImageGeneratorModal) {
    loadImageGeneratorModal();
  }
  
  function handlePromptSelect(event) {
    selectedPrompt.set(event.detail);
  }
  
  function handleNebulinoSelect(event) {
    const { nebulino, chatId, systemPrompt } = event.detail;
    // Il system prompt verrà applicato quando la chat viene caricata
    // Salviamo il system prompt nella chat e aggiungiamo il messaggio di benvenuto
    if (chatId && systemPrompt) {
      import('./stores/chat.js').then(({ chats, addMessage }) => {
        chats.update(allChats => {
          return allChats.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                systemPrompt: systemPrompt,
                title: nebulino.name
              };
            }
            return chat;
          });
        });
        
        // Aggiungi messaggio di benvenuto se presente
        if (nebulino.welcomeMessage) {
          const welcomeMessage = {
            type: 'ai',
            content: nebulino.welcomeMessage,
            timestamp: new Date().toISOString()
          };
          addMessage(chatId, welcomeMessage);
        }
      });
    }
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
  
  // Inizializza autenticazione e tema
  onMount(async () => {
    window.addEventListener('keydown', handleKeyboardShortcuts);
    initAuth();
    // Precarica SettingsModal dato che è un componente importante
    loadSettingsModal();
    
    // Gestisci callback Patreon
    const urlParams = new URLSearchParams(window.location.search);
    const patreonCallback = urlParams.get('patreon_callback');
    const patreonUserId = urlParams.get('patreon_user_id');
    const patreonToken = urlParams.get('patreon_token');
    const patreonError = urlParams.get('patreon_error');
    
    if (patreonError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      showAlert(`Errore collegamento Patreon: ${decodeURIComponent(patreonError)}`, 'Errore Patreon', 'OK', 'error');
    } else if (patreonCallback === 'true' && patreonUserId && patreonToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Processa collegamento quando l'utente è autenticato
      const processPatreonLink = async () => {
        if (!$isAuthenticatedStore) {
          // Salva temporaneamente e aspetta autenticazione
          localStorage.setItem('patreon_pending_user_id', patreonUserId);
          localStorage.setItem('patreon_pending_token', decodeURIComponent(patreonToken));
          return;
        }
        
        try {
          const linkResult = await linkPatreonAccount(patreonUserId, decodeURIComponent(patreonToken));
          
          if (linkResult.success) {
            if (linkResult.hasActiveMembership) {
              // Aggiorna store utente con subscription
              user.update(u => ({
                ...u,
                subscription: {
                  active: true,
                  plan: 'premium',
                  expiresAt: linkResult.subscription?.expires_at,
                  key: `NEBULA-PREMIUM-PATREON-${Date.now()}`
                }
              }));
              showAlert('Account Patreon collegato e abbonamento Premium attivato!', 'Patreon collegato', 'OK', 'success');
            } else {
              showAlert('Account Patreon collegato. Verifica il tuo abbonamento Premium su Patreon (minimo 5€/mese).', 'Account collegato', 'OK', 'info');
            }
          } else {
            showAlert(linkResult.message || 'Errore durante il collegamento', 'Errore', 'OK', 'error');
          }
        } catch (error) {
          console.error('Errore collegamento Patreon:', error);
          showAlert('Errore durante il collegamento con Patreon', 'Errore', 'OK', 'error');
        }
      };
      
      // Processa immediatamente se autenticato, altrimenti aspetta
      if ($isAuthenticatedStore) {
        processPatreonLink();
      } else {
        const unsubscribe = isAuthenticatedStore.subscribe(async (isAuth) => {
          if (isAuth) {
            unsubscribe();
            await new Promise(resolve => setTimeout(resolve, 500));
            await processPatreonLink();
          }
        });
        
        // Cleanup
        window._patreonUnsubscribe = unsubscribe;
      }
    }
    
    // Processa eventuali dati Patreon salvati in localStorage
    const pendingUserId = localStorage.getItem('patreon_pending_user_id');
    const pendingToken = localStorage.getItem('patreon_pending_token');
    if (pendingUserId && pendingToken && $isAuthenticatedStore) {
      localStorage.removeItem('patreon_pending_user_id');
      localStorage.removeItem('patreon_pending_token');
      
      linkPatreonAccount(pendingUserId, pendingToken).then(result => {
        if (result.success && result.hasActiveMembership) {
          user.update(u => ({
            ...u,
            subscription: {
              active: true,
              plan: 'premium',
              expiresAt: result.subscription?.expires_at,
              key: `NEBULA-PREMIUM-PATREON-${Date.now()}`
            }
          }));
        }
      });
    }
    
    // Inizializza il tema all'avvio
    const savedTheme = localStorage.getItem('nebula-theme') || 'system';
    const root = document.documentElement;
    if (savedTheme === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f5f5f5');
      root.style.setProperty('--bg-tertiary', '#e5e5e5');
      root.style.setProperty('--text-primary', '#171717');
      root.style.setProperty('--text-secondary', '#525252');
      root.style.setProperty('--border-color', '#d4d4d4');
    } else if (savedTheme === 'dark') {
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
    // Cleanup Patreon se presente
    if (window._patreonUnsubscribe) {
      window._patreonUnsubscribe();
      delete window._patreonUnsubscribe;
    }
  });
</script>

<div class="app-container">
  <div class="main-layout">
    <Sidebar />
    <MainArea on:openAuth={handleOpenAuth} />
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
  {#if $isHelpCenterModalOpen && HelpCenterModal}
    <svelte:component this={HelpCenterModal} bind:isOpen={$isHelpCenterModalOpen} />
  {/if}
  {#if $isReleaseNotesModalOpen && ReleaseNotesModal}
    <svelte:component this={ReleaseNotesModal} bind:isOpen={$isReleaseNotesModalOpen} />
  {/if}
  {#if $isTermsModalOpen && TermsModal}
    <svelte:component this={TermsModal} bind:isOpen={$isTermsModalOpen} />
  {/if}
  {#if $isDownloadAppModalOpen && DownloadAppModal}
    <svelte:component this={DownloadAppModal} bind:isOpen={$isDownloadAppModalOpen} />
  {/if}
  {#if $isWorkspaceSettingsModalOpen && WorkspaceSettingsModal}
    <svelte:component this={WorkspaceSettingsModal} />
  {/if}
  {#if $isNebuliniModalOpen && NebuliniModal}
    <svelte:component this={NebuliniModal} on:select={handleNebulinoSelect} />
  {/if}
  {#if $isImageGeneratorOpen && ImageGeneratorModal}
    <svelte:component this={ImageGeneratorModal} />
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
      /* Supporto safe area per iOS */
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }

    .app-container {
      overflow: hidden;
      position: fixed;
      width: 100vw;
      height: 100vh;
      height: 100dvh; /* Dynamic viewport height per mobile */
      /* Supporto safe area per iOS */
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
    }
  }

  /* Previeni scroll orizzontale su mobile */
  @media (max-width: 768px) {
    .app-container {
      overflow-x: hidden;
      /* Touch action ottimizzato */
      touch-action: pan-y pinch-zoom;
    }
    
    /* Ottimizzazioni performance mobile */
    .app-container * {
      -webkit-tap-highlight-color: rgba(255, 255, 255, 0.1);
    }
  }
</style>
