<script>
  import { onMount, onDestroy } from 'svelte';
  import TopBar from './components/TopBar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import MainArea from './components/MainArea.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import InviteModal from './components/InviteModal.svelte';
  import ProjectModal from './components/ProjectModal.svelte';
  import UserMenu from './components/UserMenu.svelte';
  import PremiumModal from './components/PremiumModal.svelte';
  import AISettingsModal from './components/AISettingsModal.svelte';
  import PromptLibraryModal from './components/PromptLibraryModal.svelte';
  import VoiceSelectModal from './components/VoiceSelectModal.svelte';
  import VoiceModeView from './components/VoiceModeView.svelte';
  import ShortcutsModal from './components/ShortcutsModal.svelte';
  import ReportBugModal from './components/ReportBugModal.svelte';
  import { selectedPrompt, isSettingsOpen, isShortcutsModalOpen, isAISettingsModalOpen, sidebarView, isSearchOpen, isSidebarOpen, isMobile } from './stores/app.js';
  import { createNewChat, deleteChat } from './stores/chat.js';
  import { get } from 'svelte/store';
  import { currentChatId } from './stores/chat.js';
  import { isInputElement } from './utils/shortcuts.js';
  
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
      createNewChat();
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
      if (chatId && confirm('Sei sicuro di voler eliminare questa chat?')) {
        deleteChat(chatId);
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
    
    // Ctrl+Shift+I: Istruzioni personalizzate
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      isAISettingsModalOpen.set(true);
      return;
    }
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
  
  onMount(() => {
    window.addEventListener('keydown', handleKeyboardShortcuts);
  });
  
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyboardShortcuts);
  });
</script>

<div class="app-container">
  <TopBar />
  <div class="main-layout">
    <Sidebar />
    <MainArea />
  </div>
  <SettingsModal />
  <InviteModal />
  <ProjectModal />
  <UserMenu />
  <PremiumModal />
  <AISettingsModal />
  <PromptLibraryModal on:select={handlePromptSelect} />
  <VoiceSelectModal on:voiceSelected={(e) => console.log('Voice selected:', e.detail)} />
  <VoiceModeView />
  <ShortcutsModal />
  <ReportBugModal />
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
    body {
      overflow-x: hidden;
      position: fixed;
      width: 100%;
    }

    #app {
      width: 100vw;
      max-width: 100vw;
      overflow-x: hidden;
    }
  }
</style>
