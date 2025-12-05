<script>
  import { isSettingsOpen, isPremiumModalOpen, isMobile, isSidebarOpen, isSharedLinksModalOpen } from '../stores/app.js';
  import { chats } from '../stores/chat.js';
  import { user as userStore } from '../stores/user.js';
  import { user as authUser, isAuthenticatedStore, clearUser } from '../stores/auth.js';
  import { deleteAccount, getToken, updateUsername, getCurrentUser } from '../services/authService.js';
  import { getCurrentAccount, removeAccount, accounts } from '../stores/accounts.js';
  // Clerk rimosso - ora usiamo Supabase
  import { hasActiveSubscription, hasPlanOrHigher } from '../stores/user.js';
  import { createDataExport, downloadDataExport } from '../services/dataExportService.js';
  import { deleteAllChatsFromDatabase } from '../services/chatService.js';
  import { loadChatsBackup, exportChatsBackup, importChatsBackup } from '../services/backupChatService.js';
  import { loadChats } from '../stores/chat.js';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { showConfirm, showAlert, showPrompt } from '../services/dialogService.js';
  import { availableLanguages } from '../utils/i18n.js';
  import { currentLanguage, t, setLanguage } from '../stores/language.js';
  import { isMobileDevice, isIOS } from '../utils/platform.js';
  import { resetPWAInstallPrompt, isPWAInstalled } from '../utils/mobile.js';
  import { isDownloadAppModalOpen } from '../stores/app.js';
  import { applyTheme, setTheme, getTheme } from '../utils/theme.js';
  import { testDatabaseConnection } from '../services/databaseService.js';
  import { encryptMessage, decryptMessage, deriveEncryptionKey, getCachedPassword } from '../services/encryptionService.js';
  import { invalidateCache } from '../utils/apiCache.js';
  import { getChatsFromDatabase } from '../services/chatService.js';
  import TermsModal from './TermsModal.svelte';
  import PrivacyModal from './PrivacyModal.svelte';
  
  let activeSection = 'generale';
  let isTermsModalOpen = false;
  let isPrivacyModalOpen = false;
  let theme = 'system';
  let uiStyle = 'material';
  let language = 'system';
  let username = '';
  let isEditingUsername = false;
  let usernameInput = '';
  let isSavingUsername = false;
  let isLoadingUsername = false;
  
  // Password gestita da Supabase - non più disponibile qui
  
  let sidebarRef;
  
  const sections = [
    { id: 'generale', label: 'Generale', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'profilo', label: 'Profilo', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'abbonamento', label: 'Abbonamento', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
    { id: 'dati', label: 'Dati', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'informazioni', label: 'Informazioni', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
  ];
  
  onMount(() => {
    // Carica tema salvato
    const savedTheme = getTheme();
    theme = savedTheme;
    
    // Carica stile UI salvato (ma non liquid glass su iOS)
    const savedUIStyle = localStorage.getItem('nebula-ui-style');
    if (savedUIStyle) {
      // Se è liquid glass e siamo su iOS, forza material
      if (savedUIStyle === 'liquid' && isIOS()) {
        uiStyle = 'material';
        localStorage.setItem('nebula-ui-style', 'material');
        applyUIStyle('material');
      } else {
        uiStyle = savedUIStyle;
        applyUIStyle(savedUIStyle);
      }
    }
    
    // Carica lingua salvata
    const savedLanguage = localStorage.getItem('nebula-language');
    if (savedLanguage) {
      language = savedLanguage;
    }
    
    // Aggiungi listener per lo scroll su mobile
    return () => {
      if (sidebarRef) {
        sidebarRef.removeEventListener('scroll', handleSidebarScroll);
      }
    };
  });
  
  function handleSidebarScroll() {
    if (!$isMobile || !sidebarRef) return;
    
    // Trova la sezione più vicina al centro durante lo scroll
    const container = sidebarRef;
    const containerCenter = container.scrollLeft + container.offsetWidth / 2;
    const items = container.querySelectorAll('.sidebar-item');
    
    let closestItem = null;
    let closestDistance = Infinity;
    
    items.forEach((item) => {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const distance = Math.abs(itemCenter - containerCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestItem = item;
      }
    });
    
    if (closestItem) {
      const sectionId = closestItem.getAttribute('data-section');
      if (sectionId && sectionId !== activeSection) {
        activeSection = sectionId;
      }
    }
  }
  
  // Aggiungi listener quando sidebarRef è disponibile
  $: if (sidebarRef && $isMobile) {
    sidebarRef.addEventListener('scroll', handleSidebarScroll, { passive: true });
  }
  
  function closeModal() {
    isSettingsOpen.set(false);
  }
  
  // Chiudi la sidebar quando si apre il popup su mobile
  $: if ($isSettingsOpen && $isMobile) {
    isSidebarOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function selectSection(sectionId) {
    activeSection = sectionId;
    // Carica i dati quando si apre la sezione profilo
    if (sectionId === 'profilo' && $isAuthenticatedStore) {
      loadUsername();
    }
    
    // Su mobile, scrolla automaticamente alla sezione selezionata
    if ($isMobile && sidebarRef) {
      setTimeout(() => {
        scrollToSection(sectionId);
      }, 100);
    }
  }
  
  function scrollToSection(sectionId) {
    if (!sidebarRef) return;
    
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;
    
    const items = sidebarRef.querySelectorAll('.sidebar-item');
    if (items[sectionIndex]) {
      const item = items[sectionIndex];
      const container = sidebarRef;
      const itemLeft = item.offsetLeft;
      const itemWidth = item.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;
      const itemCenter = itemLeft + itemWidth / 2;
      const containerCenter = scrollLeft + containerWidth / 2;
      const scrollTo = scrollLeft + (itemCenter - containerCenter);
      
      container.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  }
  
  // Scrolla alla sezione attiva quando il modal si apre su mobile
  $: if ($isSettingsOpen && $isMobile && activeSection && sidebarRef) {
    setTimeout(() => {
      scrollToSection(activeSection);
    }, 300);
  }
  
  function handleThemeChange(newTheme) {
    theme = newTheme;
    setTheme(newTheme);
  }
  
  function applyUIStyle(newStyle) {
    const body = document.body;
    // Non applicare liquid glass su iOS
    if (newStyle === 'liquid' && !isIOS()) {
      body.classList.add('liquid-glass');
    } else {
      body.classList.remove('liquid-glass');
    }
  }
  
  function handleUIStyleChange(newStyle) {
    // Blocca liquid glass se è iOS o se è già bloccato
    if (newStyle === 'liquid' && isIOS()) {
      return; // Non permettere l'attivazione su iOS
    }
    uiStyle = newStyle;
    localStorage.setItem('nebula-ui-style', newStyle);
    applyUIStyle(newStyle);
  }
  
  function handleLanguageChange() {
    setLanguage(language);
    // Ricarica la pagina per applicare le traduzioni
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }
  
  async function loadUsername() {
    if (!$isAuthenticatedStore || isLoadingUsername) return;
    
    isLoadingUsername = true;
    try {
      const token = getToken();
      if (!token) {
        isLoadingUsername = false;
        return;
      }

      // Determina l'URL base dell'API
      const getApiBaseUrl = () => {
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001/api/auth';
          }
          const backendUrl = import.meta.env.VITE_API_BASE_URL;
          if (backendUrl) {
            return `${backendUrl}/api/auth`;
          }
          return '/api/auth';
        }
        return 'http://localhost:3001/api/auth';
      };

      const response = await fetch(`${getApiBaseUrl()}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        username = data.user.username || '';
        usernameInput = username;
      }
    } catch (error) {
      console.error('Errore durante caricamento username:', error);
    } finally {
      isLoadingUsername = false;
    }
  }
  
  function startEditingUsername() {
    isEditingUsername = true;
    usernameInput = username;
  }
  
  function cancelEditingUsername() {
    isEditingUsername = false;
    usernameInput = username;
  }
  
  // Password gestita da Supabase - funzioni rimosse
  
  async function saveUsername() {
    if (isSavingUsername) return;
    
    if (!usernameInput || usernameInput.trim().length < 3) {
      await showAlert('Lo username deve essere di almeno 3 caratteri', 'Errore', 'OK', 'error');
      return;
    }
    
    isSavingUsername = true;
    try {
      const result = await updateUsername(usernameInput.trim());
      
      if (result.success) {
        username = result.username || usernameInput.trim();
        isEditingUsername = false;
        // Aggiorna anche lo store auth
        if ($authUser) {
          authUser.update(u => ({ ...u, username: result.username }));
        }
        // Aggiorna anche il localStorage
        const currentUser = getCurrentUser();
        if (currentUser) {
          currentUser.username = result.username;
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
        await showAlert('Username aggiornato con successo', 'Successo', 'OK', 'success');
      } else {
        await showAlert(result.message || 'Errore durante l\'aggiornamento dello username', 'Errore', 'OK', 'error');
      }
    } catch (error) {
      console.error('Errore durante aggiornamento username:', error);
      await showAlert('Errore durante l\'aggiornamento dello username', 'Errore', 'OK', 'error');
    } finally {
      isSavingUsername = false;
    }
  }
  
  // Password gestita da Supabase - funzione rimossa
  
  let isDeletingAccount = false;
  
  async function handleDeleteAccount() {
    // Prima conferma: richiedi di digitare "ELIMINA" o equivalente
    const deleteWords = { it: 'ELIMINA', en: 'DELETE', es: 'ELIMINAR', fr: 'SUPPRIMER', de: 'LÖSCHEN' };
    const currentLang = $currentLanguage || 'it';
    const deleteWord = deleteWords[currentLang] || deleteWords['it'];
    
    const firstConfirmation = await showPrompt(
      get(t)('deleteAccountConfirm1'),
      get(t)('deleteAccount'),
      '',
      `Digita "${deleteWord}"`,
      get(t)('confirm'),
      get(t)('cancel'),
      'text'
    );
    
    if (firstConfirmation !== deleteWord) {
      if (firstConfirmation !== null) {
        await showAlert(get(t)('deleteAccountInvalid'), get(t)('operationCancelled'), get(t)('ok'), 'error');
      }
      return;
    }
    
    // Seconda conferma: dialog di conferma finale
    const secondConfirmation = await showConfirm(
      get(t)('deleteAccountConfirm2'),
      get(t)('deleteAccount'),
      get(t)('deleteAccountFinal'),
      get(t)('cancel'),
      'danger'
    );
    
    if (!secondConfirmation) {
      return;
    }
    
    try {
      isDeletingAccount = true;
      
      // Chiama l'API per eliminare l'account
      const result = await deleteAccount();
      
      if (result.success) {
        // Pulisci tutti gli store locali
        clearUser();
        chats.set([]);
        
        // Rimuovi l'account dal sistema account multipli se presente
        const currentAccount = getCurrentAccount();
        if (currentAccount) {
          removeAccount(currentAccount.id);
        }
        
        // Pulisci tutto il localStorage
        localStorage.clear();
        
        await showAlert(get(t)('deleteAccountSuccess'), get(t)('deleteAccount'), get(t)('ok'), 'success');
        
        // Ricarica la pagina dopo un breve delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        isDeletingAccount = false;
        await showAlert(get(t)('deleteAccountError', { error: result.message || get(t)('error') }), get(t)('error'), get(t)('ok'), 'error');
      }
    } catch (error) {
      isDeletingAccount = false;
      console.error('Errore durante eliminazione account:', error);
      await showAlert(get(t)('deleteAccountError', { error: error.message }), get(t)('error'), get(t)('ok'), 'error');
    }
  }
  
  let isExporting = false;
  let isRestoringBackup = false;
  let isExportingBackup = false;
  let isImportingBackup = false;
  
  async function handleExportData() {
    // Mostra avviso che il file contiene informazioni sensibili
    const confirmed = await showConfirm(
      '⚠️ ATTENZIONE: Il file di esportazione contiene informazioni personali e sensibili:\n\n' +
      '• Cronologia completa delle chat\n' +
      '• Credenziali account (username, email, token)\n' +
      '• Licenza piano di abbonamento\n\n' +
      'Mantieni questo file al sicuro e non condividerlo con nessuno.\n\n' +
      'Vuoi procedere con l\'esportazione?',
      'Esportazione Dati Personali',
      'Esporta',
      'Annulla',
      'warning'
    );
    
    if (!confirmed) return;
    
    isExporting = true;
    try {
      // Prepara i dati per l'esportazione
      const currentAccount = getCurrentAccount();
      const token = getToken();
      
      // Prepara le credenziali account
      const accountCredentials = {
        username: $authUser?.username || currentAccount?.username || 'N/A',
        email: $authUser?.email || currentAccount?.email || 'N/A',
        userId: $authUser?.id || currentAccount?.userId || 'N/A',
        authToken: token || 'N/A',
        exportDate: new Date().toISOString()
      };
      
      // Prepara la cronologia chat completa
      const chatHistory = $chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        projectId: chat.projectId || null,
        isTemporary: chat.isTemporary || false,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messages: chat.messages ? chat.messages.map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          hidden: msg.hidden || false,
          timestamp: msg.timestamp || msg.createdAt
        })) : []
      }));
      
      // Prepara la licenza piano di abbonamento
      const subscriptionLicense = {
        active: $userStore.subscription?.active || false,
        plan: $userStore.subscription?.plan || 'free',
        subscriptionKey: $userStore.subscription?.key || null,
        expiresAt: $userStore.subscription?.expiresAt || null,
        startedAt: $userStore.subscription?.startedAt || null
      };
      
      // Crea l'oggetto di esportazione completo
      const exportData = {
        warning: '⚠️ FILE PERSONALE E RISERVATO ⚠️\n\n' +
                 'Questo file contiene informazioni personali e sensibili:\n' +
                 '• Cronologia completa delle chat\n' +
                 '• Credenziali account (username, email, token di autenticazione)\n' +
                 '• Licenza piano di abbonamento\n\n' +
                 'NON CONDIVIDERE QUESTO FILE CON NESSUNO.\n' +
                 'Mantieni questo file al sicuro e protetto.',
        exportInfo: {
          exportDate: new Date().toISOString(),
          exportVersion: '1.0',
          appName: 'Nebula AI'
        },
        accountCredentials: accountCredentials,
        chatHistory: {
          totalChats: chatHistory.length,
          chats: chatHistory
        },
        subscriptionLicense: subscriptionLicense,
        settings: {
          theme: theme,
          uiStyle: uiStyle,
          language: language
        }
      };
      
      // Crea e scarica il file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nebula-ai-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await showAlert(
        '✅ Dati esportati con successo!\n\n' +
        'Il file contiene:\n' +
        '• Cronologia completa delle chat\n' +
        '• Credenziali account\n' +
        '• Licenza piano di abbonamento\n\n' +
        '⚠️ Ricorda: questo file è personale e contiene informazioni sensibili. Mantienilo al sicuro.',
        'Esportazione completata',
        'OK',
        'success'
      );
    } catch (error) {
      await showAlert('Errore durante l\'esportazione dei dati', 'Errore', 'OK', 'error');
      console.error('Errore export:', error);
    } finally {
      isExporting = false;
    }
  }
  
  async function handleDownloadSubscriptionKey() {
    const userData = $userStore;
    if (!userData.subscription?.key) {
      await showAlert(get(t)('noKeyAvailable'), get(t)('keyNotAvailable'), get(t)('ok'), 'warning');
      return;
    }
    
    const keyData = {
      subscriptionKey: userData.subscription.key,
      plan: userData.subscription.plan,
      expiresAt: userData.subscription.expiresAt,
      exportDate: new Date().toISOString(),
      instructions: 'Importa questa chiave nelle impostazioni di un altro dispositivo per ripristinare il tuo abbonamento.'
    };
    
    const blob = new Blob([JSON.stringify(keyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nebula-subscription-key-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    await showAlert(get(t)('downloadKeySuccess'), get(t)('keyDownloaded'), get(t)('ok'), 'success');
  }
  
  function handleImportSubscriptionKey() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const keyData = JSON.parse(event.target.result);
          if (keyData.subscriptionKey) {
            // Aggiorna lo store utente con la chiave importata
            userStore.update(user => ({
              ...user,
              subscription: {
                ...user.subscription,
                key: keyData.subscriptionKey,
                plan: keyData.plan || user.subscription.plan,
                expiresAt: keyData.expiresAt || user.subscription.expiresAt,
                active: true
              }
            }));
            showAlert(get(t)('importKeySuccess'), get(t)('keyImported'), get(t)('ok'), 'success');
          } else {
            showAlert(get(t)('invalidFile'), get(t)('error'), get(t)('ok'), 'error');
          }
        } catch (error) {
          showAlert(get(t)('importError'), get(t)('error'), get(t)('ok'), 'error');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
  
  let isDeletingAllChats = false;
  
  async function handleRestoreBackup() {
    const confirmed = await showConfirm(
      'Vuoi ripristinare le chat dall\'ultimo backup salvato nel database?\n\n' +
      '⚠️ ATTENZIONE: Questa operazione sostituirà tutte le chat attuali con quelle del backup.\n\n' +
      'Le chat attuali verranno perse se non sono già nel backup.',
      'Ripristina dal Backup',
      'Ripristina',
      'Annulla',
      'warning'
    );
    
    if (!confirmed) return;
    
    isRestoringBackup = true;
    try {
      const backupResult = await loadChatsBackup();
      
      if (backupResult.success && backupResult.chats && backupResult.chats.length > 0) {
        chats.set(backupResult.chats);
        // Salva anche in localStorage
        localStorage.setItem('nebula-ai-chats', JSON.stringify(backupResult.chats));
        await showAlert(
          `✅ Backup ripristinato con successo!\n\n${backupResult.chats.length} chat caricate.`,
          'Backup Ripristinato',
          'OK',
          'success'
        );
      } else {
        await showAlert(
          'Nessun backup trovato nel database.\n\nAssicurati di aver salvato almeno un backup prima.',
          'Nessun Backup',
          'OK',
          'warning'
        );
      }
    } catch (error) {
      console.error('Errore durante ripristino backup:', error);
      await showAlert(
        'Errore durante il ripristino del backup. Riprova più tardi.',
        'Errore',
        'OK',
        'error'
      );
    } finally {
      isRestoringBackup = false;
    }
  }
  
  async function handleExportBackup() {
    isExportingBackup = true;
    try {
      const allChats = get(chats);
      const chatsToExport = allChats.filter(chat => 
        chat.messages && 
        chat.messages.length > 0 && 
        chat.messages.some(msg => !msg.hidden)
      );
      
      if (chatsToExport.length === 0) {
        await showAlert(
          'Nessuna chat da esportare.\n\nCrea almeno una chat prima di esportare il backup.',
          'Nessuna Chat',
          'OK',
          'warning'
        );
        return;
      }
      
      exportChatsBackup(chatsToExport);
      await showAlert(
        `✅ Backup esportato con successo!\n\n${chatsToExport.length} chat esportate.`,
        'Backup Esportato',
        'OK',
        'success'
      );
    } catch (error) {
      console.error('Errore durante esportazione backup:', error);
      await showAlert(
        'Errore durante l\'esportazione del backup. Riprova più tardi.',
        'Errore',
        'OK',
        'error'
      );
    } finally {
      isExportingBackup = false;
    }
  }
  
  async function handleImportBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const confirmed = await showConfirm(
      'Vuoi importare le chat dal file di backup?\n\n' +
      '⚠️ ATTENZIONE: Questa operazione sostituirà tutte le chat attuali con quelle del backup.\n\n' +
      'Le chat attuali verranno perse se non sono già nel backup.',
      'Importa Backup',
      'Importa',
      'Annulla',
      'warning'
    );
    
    if (!confirmed) {
      event.target.value = ''; // Reset file input
      return;
    }
    
    isImportingBackup = true;
    try {
      const importResult = await importChatsBackup(file);
      
      if (importResult.success && importResult.chats && importResult.chats.length > 0) {
        chats.set(importResult.chats);
        // Salva in localStorage
        localStorage.setItem('nebula-ai-chats', JSON.stringify(importResult.chats));
        
        // Se autenticato, sincronizza anche nel database
        if ($isAuthenticatedStore) {
          const { saveChatsBackup } = await import('../services/backupChatService.js');
          await saveChatsBackup(importResult.chats);
        }
        
        await showAlert(
          `✅ Backup importato con successo!\n\n${importResult.chats.length} chat caricate.`,
          'Backup Importato',
          'OK',
          'success'
        );
      } else {
        await showAlert(
          'Il file di backup non è valido o non contiene chat.',
          'Backup Non Valido',
          'OK',
          'error'
        );
      }
    } catch (error) {
      console.error('Errore durante importazione backup:', error);
      await showAlert(
        'Errore durante l\'importazione del backup. Assicurati che il file sia valido.',
        'Errore',
        'OK',
        'error'
      );
    } finally {
      isImportingBackup = false;
      event.target.value = ''; // Reset file input
    }
  }
  
  async function handleDeleteAllChats() {
    const confirmed = await showConfirm(
      'Sei sicuro di voler eliminare tutte le chat? Questa azione è irreversibile.',
      'Elimina tutte le chat',
      'Elimina',
      'Annulla',
      'danger'
    );
    
    if (!confirmed) return;
    
    isDeletingAllChats = true;
    try {
      if ($isAuthenticatedStore) {
        // Elimina dal database se autenticato
        const result = await deleteAllChatsFromDatabase();
        if (result.success) {
          chats.set([]);
          localStorage.removeItem('nebula-ai-chats');
          await showAlert('Tutte le chat sono state eliminate dal database.', 'Chat eliminate', 'OK', 'success');
        } else {
          await showAlert(result.message || 'Errore nell\'eliminazione delle chat', 'Errore', 'OK', 'error');
        }
      } else {
        // Elimina solo da localStorage se non autenticato
        chats.set([]);
        localStorage.removeItem('nebula-ai-chats');
        await showAlert('Tutte le chat sono state eliminate.', 'Chat eliminate', 'OK', 'success');
      }
    } catch (error) {
      await showAlert('Errore durante l\'eliminazione delle chat', 'Errore', 'OK', 'error');
      console.error('Errore eliminazione chat:', error);
    } finally {
      isDeletingAllChats = false;
    }
  }
  
  function maskEmail(email) {
    if (!email) return '-';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return email;
    const masked = localPart.substring(0, 2) + '*'.repeat(localPart.length - 2) + localPart.slice(-2);
    return `${masked}@${domain}`;
  }
  
  function handleViewTerms() {
    isTermsModalOpen = true;
  }
  
  function handleViewPrivacy() {
    isPrivacyModalOpen = true;
  }
  
  async function handleManageSharedLinks() {
    isSharedLinksModalOpen.set(true);
  }
  
  // Abbonamenti gestiti dal database Neon
  async function getSubscription() {
    if (!$isAuthenticatedStore || !$authUser) {
      return null;
    }
    
    try {
      const token = getToken();
      if (!token) return null;
      
      const getApiBaseUrl = () => {
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001/api/auth';
          }
          const backendUrl = import.meta.env.VITE_API_BASE_URL;
          if (backendUrl) {
            return `${backendUrl}/api/auth`;
          }
          return '/api/auth';
        }
        return 'http://localhost:3001/api/auth';
      };
      
      const response = await fetch(`${getApiBaseUrl()}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user && data.user.subscription) {
          return data.user.subscription;
        }
      }
    } catch (error) {
      console.error('Errore recupero abbonamento:', error);
    }
    
    return null;
  }
  
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  }
  
  function getPlanName(plan) {
    if (!plan || plan === 'free') return get(t)('free');
    if (plan === 'pro') return 'Nebula Pro';
    if (plan === 'max') return 'Nebula Max';
    return plan;
  }
  
  function handleUpgrade() {
    isPremiumModalOpen.set(true);
    isSettingsOpen.set(false);
  }
  
  async function handleShowInstallPrompt() {
    // Resetta il flag per permettere di mostrare di nuovo il prompt
    resetPWAInstallPrompt();
    // Apri il modal di installazione
    isDownloadAppModalOpen.set(true);
    // Chiudi le impostazioni
    isSettingsOpen.set(false);
  }
  
  // ==================== TROUBLESHOOTING ====================
  let troubleshootingStatus = {};
  let isRunningTest = false;
  let testResults = {};
  
  async function testDatabase() {
    isRunningTest = true;
    troubleshootingStatus.database = 'testing';
    try {
      const result = await testDatabaseConnection();
      if (result.success) {
        troubleshootingStatus.database = 'success';
        testResults.database = `✅ Connessione riuscita!\nVersione: ${result.version || 'N/A'}`;
        await showAlert(testResults.database, 'Test Database', 'OK', 'success');
      } else {
        troubleshootingStatus.database = 'error';
        testResults.database = `❌ Errore: ${result.message || result.error || 'Connessione fallita'}`;
        await showAlert(testResults.database, 'Test Database', 'OK', 'error');
      }
    } catch (error) {
      troubleshootingStatus.database = 'error';
      testResults.database = `❌ Errore: ${error.message}`;
      await showAlert(testResults.database, 'Test Database', 'OK', 'error');
    } finally {
      isRunningTest = false;
    }
  }
  
  async function testEncryption() {
    isRunningTest = true;
    troubleshootingStatus.encryption = 'testing';
    try {
      const testMessage = 'Test crittografia Nebula AI';
      const testUserId = $authUser?.id || 'test-user';
      const testPassword = 'test-password-123';
      
      // Deriva la chiave
      const key = await deriveEncryptionKey(testPassword, testUserId);
      
      // Crittografa
      const encrypted = await encryptMessage(testMessage, key);
      
      // Decrittografa
      const decrypted = await decryptMessage(encrypted, key);
      
      if (decrypted === testMessage) {
        troubleshootingStatus.encryption = 'success';
        testResults.encryption = '✅ Crittografia funzionante correttamente!';
        await showAlert(testResults.encryption, 'Test Crittografia', 'OK', 'success');
      } else {
        troubleshootingStatus.encryption = 'error';
        testResults.encryption = '❌ Errore: Il messaggio decrittografato non corrisponde';
        await showAlert(testResults.encryption, 'Test Crittografia', 'OK', 'error');
      }
    } catch (error) {
      troubleshootingStatus.encryption = 'error';
      testResults.encryption = `❌ Errore: ${error.message}`;
      await showAlert(testResults.encryption, 'Test Crittografia', 'OK', 'error');
    } finally {
      isRunningTest = false;
    }
  }
  
  async function clearCache() {
    const confirmed = await showConfirm(
      'Vuoi pulire la cache dell\'applicazione?\n\nQuesto rimuoverà:\n• Cache delle API\n• Dati temporanei\n• Cache del browser\n\nLe tue chat e impostazioni non verranno eliminate.',
      'Pulizia Cache',
      'Pulisci',
      'Annulla',
      'warning'
    );
    
    if (!confirmed) return;
    
    try {
      // Pulisci cache API
      invalidateCache();
      
      // Pulisci cache del browser (solo per questo dominio)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      await showAlert(
        '✅ Cache pulita con successo!\n\nLa pagina verrà ricaricata per applicare le modifiche.',
        'Cache Pulita',
        'OK',
        'success'
      );
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      await showAlert(
        `❌ Errore durante la pulizia: ${error.message}`,
        'Errore',
        'OK',
        'error'
      );
    }
  }
  
  function checkStorage() {
    try {
      let totalSize = 0;
      let itemCount = 0;
      const items = [];
      
      // Controlla localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const size = new Blob([value]).size;
        totalSize += size;
        itemCount++;
        items.push({ key, size });
      }
      
      // Controlla sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        const size = new Blob([value]).size;
        totalSize += size;
        itemCount++;
        items.push({ key, size, type: 'session' });
      }
      
      const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
      const sizeKB = (totalSize / 1024).toFixed(2);
      const displaySize = totalSize > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
      
      // Limite approssimativo per localStorage (circa 5-10MB)
      const limitMB = 5;
      const usagePercent = ((totalSize / 1024 / 1024) / limitMB * 100).toFixed(1);
      
      let status = '✅';
      let statusText = 'Storage in buono stato';
      if (totalSize > limitMB * 1024 * 1024 * 0.8) {
        status = '⚠️';
        statusText = 'Storage quasi pieno';
      }
      
      const message = `${status} ${statusText}\n\n` +
        `Spazio utilizzato: ${displaySize}\n` +
        `Numero di elementi: ${itemCount}\n` +
        `Utilizzo approssimativo: ${usagePercent}% di ~${limitMB}MB\n\n` +
        `Elementi più grandi:\n` +
        items.sort((a, b) => b.size - a.size).slice(0, 5).map(item => 
          `• ${item.key}: ${(item.size / 1024).toFixed(2)} KB`
        ).join('\n');
      
      showAlert(message, 'Verifica Storage', 'OK', totalSize > limitMB * 1024 * 1024 * 0.8 ? 'warning' : 'info');
    } catch (error) {
      showAlert(`❌ Errore: ${error.message}`, 'Errore', 'OK', 'error');
    }
  }
  
  async function testAPI() {
    isRunningTest = true;
    troubleshootingStatus.api = 'testing';
    try {
      const getApiBaseUrl = () => {
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001/api';
          }
          const backendUrl = import.meta.env.VITE_API_BASE_URL;
          if (backendUrl) {
            return `${backendUrl}/api`;
          }
          return '/api';
        }
        return 'http://localhost:3001/api';
      };
      
      const apiBase = getApiBaseUrl();
      const startTime = Date.now();
      
      // Test endpoint health o auth/me
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${apiBase}/auth/me`, {
        method: 'GET',
        headers
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok || response.status === 401) {
        troubleshootingStatus.api = 'success';
        testResults.api = `✅ API raggiungibile!\nTempo di risposta: ${responseTime}ms\nStatus: ${response.status}`;
        await showAlert(testResults.api, 'Test API', 'OK', 'success');
      } else {
        troubleshootingStatus.api = 'error';
        testResults.api = `⚠️ API risponde ma con errore\nStatus: ${response.status}\nTempo: ${responseTime}ms`;
        await showAlert(testResults.api, 'Test API', 'OK', 'warning');
      }
    } catch (error) {
      troubleshootingStatus.api = 'error';
      testResults.api = `❌ Errore: ${error.message}`;
      await showAlert(testResults.api, 'Test API', 'OK', 'error');
    } finally {
      isRunningTest = false;
    }
  }
  
  async function resetLocalSettings() {
    const confirmed = await showConfirm(
      'Vuoi resettare le impostazioni locali?\n\nQuesto rimuoverà:\n• Tema personalizzato\n• Stile UI\n• Lingua\n• Altre preferenze locali\n\nLe tue chat e account non verranno toccati.',
      'Reset Impostazioni',
      'Reset',
      'Annulla',
      'warning'
    );
    
    if (!confirmed) return;
    
    try {
      // Rimuovi solo le impostazioni locali, non i dati
      localStorage.removeItem('nebula-theme');
      localStorage.removeItem('nebula-ui-style');
      localStorage.removeItem('nebula-language');
      
      await showAlert(
        '✅ Impostazioni locali resettate!\n\nLa pagina verrà ricaricata per applicare le impostazioni predefinite.',
        'Reset Completato',
        'OK',
        'success'
      );
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      await showAlert(`❌ Errore: ${error.message}`, 'Errore', 'OK', 'error');
    }
  }
  
  async function repairChats() {
    const confirmed = await showConfirm(
      'Vuoi tentare di riparare le chat corrotte?\n\nQuesta operazione:\n• Verifica l\'integrità delle chat\n• Rimuove chat duplicate\n• Ripara formati corrotti\n• Sincronizza con il database\n\nLe chat valide non verranno modificate.',
      'Ripara Chat',
      'Ripara',
      'Annulla',
      'info'
    );
    
    if (!confirmed) return;
    
    isRunningTest = true;
    troubleshootingStatus.repair = 'testing';
    
    try {
      let repaired = 0;
      let removed = 0;
      let errors = 0;
      
      const allChats = get(chats);
      const validChats = [];
      const seenIds = new Set();
      
      for (const chat of allChats) {
        // Verifica duplicati
        if (seenIds.has(chat.id)) {
          removed++;
          continue;
        }
        seenIds.add(chat.id);
        
        // Verifica struttura base
        if (!chat.id || !chat.title) {
          // Tenta di riparare
          if (!chat.id) {
            chat.id = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            repaired++;
          }
          if (!chat.title) {
            chat.title = 'Chat senza titolo';
            repaired++;
          }
        }
        
        // Verifica messaggi
        if (chat.messages && Array.isArray(chat.messages)) {
          chat.messages = chat.messages.filter(msg => {
            if (!msg || typeof msg !== 'object') {
              errors++;
              return false;
            }
            return true;
          });
        }
        
        validChats.push(chat);
      }
      
      chats.set(validChats);
      
      // Salva in localStorage
      localStorage.setItem('nebula-ai-chats', JSON.stringify(validChats));
      
      // Se autenticato, sincronizza con database
      if ($isAuthenticatedStore) {
        try {
          const result = await getChatsFromDatabase();
          if (result.success && result.chats) {
            chats.set(result.chats);
          }
        } catch (error) {
          console.warn('Errore sincronizzazione database:', error);
        }
      }
      
      troubleshootingStatus.repair = 'success';
      const message = `✅ Riparazione completata!\n\n` +
        `Chat valide: ${validChats.length}\n` +
        `Chat riparate: ${repaired}\n` +
        `Chat duplicate rimosse: ${removed}\n` +
        `Errori corretti: ${errors}`;
      
      await showAlert(message, 'Riparazione Completata', 'OK', 'success');
    } catch (error) {
      troubleshootingStatus.repair = 'error';
      await showAlert(`❌ Errore: ${error.message}`, 'Errore', 'OK', 'error');
    } finally {
      isRunningTest = false;
    }
  }
  
  async function syncData() {
    if (!$isAuthenticatedStore) {
      await showAlert(
        '⚠️ Devi essere autenticato per sincronizzare i dati.',
        'Autenticazione Richiesta',
        'OK',
        'warning'
      );
      return;
    }
    
    isRunningTest = true;
    troubleshootingStatus.sync = 'testing';
    
    try {
      // Carica chat dal database
      const result = await getChatsFromDatabase();
      
      if (result.success && result.chats) {
        chats.set(result.chats);
        // Salva anche in localStorage
        localStorage.setItem('nebula-ai-chats', JSON.stringify(result.chats));
        
        troubleshootingStatus.sync = 'success';
        await showAlert(
          `✅ Sincronizzazione completata!\n\n${result.chats.length} chat sincronizzate con il database.`,
          'Sincronizzazione',
          'OK',
          'success'
        );
      } else {
        troubleshootingStatus.sync = 'error';
        await showAlert(
          `⚠️ ${result.message || 'Errore durante la sincronizzazione'}`,
          'Sincronizzazione',
          'OK',
          'warning'
        );
      }
    } catch (error) {
      troubleshootingStatus.sync = 'error';
      await showAlert(
        `❌ Errore durante la sincronizzazione: ${error.message}`,
        'Errore',
        'OK',
        'error'
      );
    } finally {
      isRunningTest = false;
    }
  }
  
  function checkBrowserPermissions() {
    const permissions = [];
    const checks = [];
    
    // Check localStorage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      checks.push({ name: 'localStorage', status: '✅ Disponibile' });
    } catch (e) {
      checks.push({ name: 'localStorage', status: '❌ Non disponibile', error: e.message });
    }
    
    // Check sessionStorage
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      checks.push({ name: 'sessionStorage', status: '✅ Disponibile' });
    } catch (e) {
      checks.push({ name: 'sessionStorage', status: '❌ Non disponibile', error: e.message });
    }
    
    // Check IndexedDB
    if ('indexedDB' in window) {
      checks.push({ name: 'IndexedDB', status: '✅ Disponibile' });
    } else {
      checks.push({ name: 'IndexedDB', status: '⚠️ Non disponibile' });
    }
    
    // Check Web Crypto API
    if (window.crypto && window.crypto.subtle) {
      checks.push({ name: 'Web Crypto API', status: '✅ Disponibile' });
    } else {
      checks.push({ name: 'Web Crypto API', status: '❌ Non disponibile' });
    }
    
    // Check Fetch API
    if ('fetch' in window) {
      checks.push({ name: 'Fetch API', status: '✅ Disponibile' });
    } else {
      checks.push({ name: 'Fetch API', status: '❌ Non disponibile' });
    }
    
    // Check Service Worker
    if ('serviceWorker' in navigator) {
      checks.push({ name: 'Service Worker', status: '✅ Disponibile' });
    } else {
      checks.push({ name: 'Service Worker', status: '⚠️ Non disponibile' });
    }
    
    const message = 'Verifica Permessi Browser:\n\n' +
      checks.map(c => `${c.status} ${c.name}${c.error ? `\n   Errore: ${c.error}` : ''}`).join('\n');
    
    const hasErrors = checks.some(c => c.status.includes('❌'));
    showAlert(message, 'Permessi Browser', 'OK', hasErrors ? 'warning' : 'info');
  }
  
  function showPerformanceDiagnostics() {
    const perf = {
      memory: null,
      connection: null,
      timing: null
    };
    
    // Memory info (se disponibile)
    if (performance.memory) {
      const memory = performance.memory;
      perf.memory = {
        used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
      };
    }
    
    // Connection info (se disponibile)
    if (navigator.connection) {
      const conn = navigator.connection;
      perf.connection = {
        effectiveType: conn.effectiveType || 'N/A',
        downlink: conn.downlink ? conn.downlink + ' Mbps' : 'N/A',
        rtt: conn.rtt ? conn.rtt + ' ms' : 'N/A',
        saveData: conn.saveData ? 'Attivo' : 'Disattivo'
      };
    }
    
    // Navigation timing
    if (performance.timing) {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      perf.timing = {
        loadTime: (loadTime / 1000).toFixed(2) + ' s',
        domReady: ((timing.domContentLoadedEventEnd - timing.navigationStart) / 1000).toFixed(2) + ' s'
      };
    }
    
    let message = 'Diagnostica Performance:\n\n';
    
    if (perf.memory) {
      message += `Memoria:\n` +
        `• Utilizzata: ${perf.memory.used}\n` +
        `• Totale: ${perf.memory.total}\n` +
        `• Limite: ${perf.memory.limit}\n\n`;
    }
    
    if (perf.connection) {
      message += `Connessione:\n` +
        `• Tipo: ${perf.connection.effectiveType}\n` +
        `• Velocità: ${perf.connection.downlink}\n` +
        `• Latenza: ${perf.connection.rtt}\n` +
        `• Risparmio dati: ${perf.connection.saveData}\n\n`;
    }
    
    if (perf.timing) {
      message += `Tempi di Caricamento:\n` +
        `• Caricamento completo: ${perf.timing.loadTime}\n` +
        `• DOM pronto: ${perf.timing.domReady}\n`;
    }
    
    if (!perf.memory && !perf.connection && !perf.timing) {
      message = '⚠️ Informazioni di performance limitate.\n\nIl tuo browser potrebbe non supportare tutte le API di performance.';
    }
    
    showAlert(message, 'Diagnostica Performance', 'OK', 'info');
  }
  
  // Ottieni abbonamento dal database
  let subscription = null;
  
  $: if ($isAuthenticatedStore) {
    getSubscription().then(sub => {
      subscription = sub;
    });
  }
  
  $: planName = subscription?.plan ? getPlanName(subscription.plan) : get(t)('free');
  $: isActive = subscription?.active || false;
  
  onMount(() => {
    if ($isAuthenticatedStore) {
      // Carica i dati se la sezione profilo è già attiva
      if (activeSection === 'profilo') {
        loadUsername();
      }
    }
  });
</script>

{#if $isSettingsOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">{$t('settings')}</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body-container">
        <!-- Sidebar -->
        <aside class="settings-sidebar" bind:this={sidebarRef}>
          {#each sections as section}
            <button
              class="sidebar-item"
              class:active={activeSection === section.id}
              on:click={() => selectSection(section.id)}
              data-section={section.id}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d={section.icon} />
              </svg>
              <span>{section.label}</span>
            </button>
          {/each}
        </aside>
        
        <!-- Content -->
        <div class="settings-content" class:content-visible={$isSettingsOpen}>
          <!-- Generale -->
          {#if activeSection === 'generale'}
            <div class="setting-section" class:section-visible={activeSection === 'generale'}>
              <h3 class="setting-title">{$t('theme')}</h3>
              <div class="theme-buttons">
                <button 
                  class="theme-button" 
                  class:active={theme === 'light'}
                  on:click={() => handleThemeChange('light')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  <span>{$t('light')}</span>
                </button>
                <button 
                  class="theme-button" 
                  class:active={theme === 'dark'}
                  on:click={() => handleThemeChange('dark')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                  <span>{$t('dark')}</span>
                </button>
                <button 
                  class="theme-button" 
                  class:active={theme === 'system'}
                  on:click={() => handleThemeChange('system')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <span>{$t('system')}</span>
                </button>
              </div>
            </div>
            
            <div class="setting-section" class:section-visible={activeSection === 'generale'}>
              <h3 class="setting-title">Stile Interfaccia</h3>
              <div class="theme-buttons">
                <button 
                  class="theme-button" 
                  class:active={uiStyle === 'material'}
                  on:click={() => handleUIStyleChange('material')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <span>Material Design</span>
                </button>
                <button 
                  class="theme-button" 
                  class:active={uiStyle === 'liquid'}
                  class:disabled={true}
                  disabled={true}
                  on:click={() => {}}
                  title="Presto in arrivo"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                  </svg>
                  <span>Liquid Glass <span class="coming-soon-badge">Presto in arrivo</span></span>
                </button>
              </div>
            </div>
            
            <div class="setting-section" class:section-visible={activeSection === 'generale'}>
              <h3 class="setting-title">{$t('language')}</h3>
              <select class="setting-select" bind:value={language} on:change={handleLanguageChange}>
                {#each availableLanguages as lang}
                  <option value={lang.code}>{lang.nativeName[$currentLanguage] || lang.name}</option>
                {/each}
              </select>
            </div>
            
            {#if isMobileDevice()}
              <div class="setting-section" class:section-visible={activeSection === 'generale'}>
                <h3 class="setting-title">Installa App</h3>
                {#if isPWAInstalled()}
                  <div class="setting-row" class:row-visible={activeSection === 'generale'}>
                    <div class="setting-info">
                      <div class="setting-label">App Installata</div>
                      <div class="setting-description">Nebula AI è già installata sul tuo dispositivo come app.</div>
                    </div>
                    <div class="installed-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Installata</span>
                    </div>
                  </div>
                {:else}
                  <div class="setting-row" class:row-visible={activeSection === 'generale'}>
                    <div class="setting-info">
                      <div class="setting-label">Crea Shortcut</div>
                      <div class="setting-description">Aggiungi Nebula AI alla schermata home del tuo dispositivo per un accesso rapido.</div>
                    </div>
                    <button class="manage-button" on:click={handleShowInstallPrompt}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Mostra Istruzioni
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          {/if}
          
          <!-- Abbonamento - Database Neon -->
          {#if activeSection === 'abbonamento'}
            <div class="setting-section" class:section-visible={activeSection === 'abbonamento'}>
              <h3 class="setting-title">{$t('subscriptionStatus')}</h3>
              
              {#if $isAuthenticatedStore && $authUser}
                <div class="subscription-status">
                  <div class="subscription-badge" class:active={isActive} class:pro={subscription?.plan === 'pro'} class:max={subscription?.plan === 'max'}>
                    <span class="badge-label">{planName}</span>
                    {#if isActive}
                      <span class="badge-status">{$t('active')}</span>
                    {:else}
                      <span class="badge-status">{$t('inactive')}</span>
                    {/if}
                  </div>
                </div>
                
                <div class="setting-row" class:row-visible={activeSection === 'abbonamento'}>
                  <div class="setting-label">{$t('currentPlan')}</div>
                  <div class="setting-value">{planName}</div>
                </div>
                
                {#if subscription?.expiresAt}
                  <div class="setting-row" class:row-visible={activeSection === 'abbonamento'}>
                    <div class="setting-label">{$t('expiration')}</div>
                    <div class="setting-value">{formatDate(subscription.expiresAt)}</div>
                  </div>
                {/if}
                
                {#if !isActive || !subscription || subscription?.plan === 'free'}
                  <div class="setting-row" class:row-visible={activeSection === 'abbonamento'}>
                    <div class="setting-info">
                      <div class="setting-label">{$t('upgradePlan')}</div>
                      <div class="setting-description">{$t('upgradeDescription')}</div>
                    </div>
                    <button class="manage-button" on:click={handleUpgrade}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                      </svg>
                      {$t('upgrade')}
                    </button>
                  </div>
                {:else}
                  {#if subscription?.plan === 'pro' || subscription?.plan === 'max'}
                    <div class="setting-row" class:row-visible={activeSection === 'abbonamento'}>
                      <div class="setting-info">
                        <div class="setting-label">Supporto Prioritario</div>
                        <div class="setting-description">Hai accesso al supporto prioritario. Le tue richieste verranno gestite con priorità.</div>
                      </div>
                      <div class="priority-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                          <path d="M2 17l10 5 10-5"/>
                          <path d="M2 12l10 5 10-5"/>
                        </svg>
                        <span>Attivo</span>
                      </div>
                    </div>
                  {/if}
                  
                  {#if subscription?.plan === 'max'}
                    <div class="setting-row" class:row-visible={activeSection === 'abbonamento'}>
                      <div class="setting-info">
                        <div class="setting-label">Analisi Avanzata Immagini e Documenti</div>
                        <div class="setting-description">Hai accesso all'analisi avanzata di immagini e documenti con modelli di visione avanzati.</div>
                      </div>
                      <div class="priority-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span>Attivo</span>
                      </div>
                    </div>
                    
                    <div class="setting-row" class:row-visible={activeSection === 'abbonamento'}>
                      <div class="setting-info">
                        <div class="setting-label">Accesso Anticipato</div>
                        <div class="setting-description">Hai accesso anticipato a nuovi modelli e funzionalità prima del rilascio pubblico.</div>
                      </div>
                      <div class="priority-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                          <path d="M2 17l10 5 10-5"/>
                          <path d="M2 12l10 5 10-5"/>
                        </svg>
                        <span>Attivo</span>
                      </div>
                    </div>
                    
                    <div class="setting-row" class:row-visible={activeSection === 'abbonamento'}>
                      <div class="setting-info">
                        <div class="setting-label">API Access</div>
                        <div class="setting-description">Hai accesso all'API per integrare Nebula AI nelle tue applicazioni.</div>
                      </div>
                      <button class="manage-button" on:click={() => {
                        showAlert('L\'accesso API è incluso nel tuo piano Max. Le API keys possono essere generate dalla sezione API nelle impostazioni avanzate.', 'API Access', 'OK', 'info');
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                          <path d="M2 17l10 5 10-5"/>
                          <path d="M2 12l10 5 10-5"/>
                        </svg>
                        <span>Gestisci API</span>
                      </button>
                    </div>
                  {/if}
                  
                  <div class="setting-row" class:row-visible={activeSection === 'abbonamento'}>
                    <div class="setting-info">
                      <div class="setting-label">{$t('manageSubscription')}</div>
                      <div class="setting-description">Gestisci il tuo abbonamento dal database.</div>
                    </div>
                    <button class="manage-button" on:click={handleUpgrade}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                      {$t('manage')}
                    </button>
                  </div>
                {/if}
              {:else}
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-label">Autenticazione richiesta</div>
                    <div class="setting-description">Accedi per visualizzare e gestire il tuo abbonamento.</div>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
          
          <!-- Profilo -->
          {#if activeSection === 'profilo'}
            <div class="setting-row" class:row-visible={activeSection === 'profilo'}>
              <div class="setting-label">{$t('username')}</div>
              <div class="setting-value">
                {#if isEditingUsername}
                  <div class="phone-edit-container">
                    <input 
                      type="text" 
                      class="phone-input" 
                      bind:value={usernameInput} 
                      placeholder={$t('username')}
                      disabled={isSavingUsername}
                    />
                    <div class="phone-edit-actions">
                      <button 
                        class="phone-save-button" 
                        on:click={saveUsername} 
                        disabled={isSavingUsername}
                      >
                        {isSavingUsername ? get(t)('save') + '...' : get(t)('save')}
                      </button>
                      <button 
                        class="phone-cancel-button" 
                        on:click={cancelEditingUsername}
                        disabled={isSavingUsername}
                      >
                        {$t('cancel')}
                      </button>
                    </div>
                  </div>
                {:else}
                  <div class="phone-display-container">
                    <span>
                      {#if $isAuthenticatedStore && $authUser?.username}
                        {$authUser.username}
                      {:else if username}
                        {username}
                      {:else if $userStore.name}
                        {$userStore.name}
                      {:else}
                        -
                      {/if}
                    </span>
                    {#if $isAuthenticatedStore}
                      <button 
                        class="phone-edit-button" 
                        on:click={startEditingUsername}
                        title={$t('edit') + ' ' + get(t)('username')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
            
            <!-- Password gestita da Supabase - sezione rimossa -->
            
            <div class="setting-row" class:row-visible={activeSection === 'profilo'}>
              <div class="setting-label">{$t('deleteAccount')}</div>
              <button class="danger-button" on:click={handleDeleteAccount} disabled={isDeletingAccount}>
                {isDeletingAccount ? get(t)('deletingAccount') : get(t)('delete')}
              </button>
            </div>
          {/if}
          
          <!-- Dati -->
          {#if activeSection === 'dati'}
            <div class="setting-row" class:row-visible={activeSection === 'dati'}>
              <div class="setting-label">{$t('sharedLinks')}</div>
              <button class="manage-button" on:click={handleManageSharedLinks}>{$t('manage')}</button>
            </div>
            
            <div class="setting-row" class:row-visible={activeSection === 'dati'}>
              <div class="setting-info">
                <div class="setting-label">{$t('exportData')}</div>
                <div class="setting-description">{$t('exportDescription')}</div>
              </div>
              <button class="manage-button" on:click={handleExportData} disabled={isExporting}>
                {isExporting ? get(t)('exportCompleted') + '...' : get(t)('exportData')}
              </button>
            </div>
            
            {#if $userStore.subscription?.active && $userStore.subscription?.key}
              <div class="setting-row" class:row-visible={activeSection === 'dati'}>
                <div class="setting-info">
                  <div class="setting-label">{$t('subscriptionKey')}</div>
                  <div class="setting-description">{$t('subscriptionKeyDescription')}</div>
                </div>
                <div class="setting-actions">
                  <button class="manage-button" on:click={handleDownloadSubscriptionKey}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {$t('downloadKey')}
                  </button>
                  <button class="manage-button secondary" on:click={handleImportSubscriptionKey}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {$t('importKey')}
                  </button>
                </div>
              </div>
            {/if}
            
            {#if $isAuthenticatedStore}
              <div class="setting-row" class:row-visible={activeSection === 'dati'}>
                <div class="setting-info">
                  <div class="setting-label">Ripristina Chat dal Backup</div>
                  <div class="setting-description">Ripristina le chat dall'ultimo backup salvato nel database (sincronizzazione tra dispositivi)</div>
                </div>
                <button class="manage-button" on:click={handleRestoreBackup} disabled={isRestoringBackup}>
                  {isRestoringBackup ? 'Ripristino...' : 'Ripristina dal Backup'}
                </button>
              </div>
              
              <div class="setting-row" class:row-visible={activeSection === 'dati'}>
                <div class="setting-info">
                  <div class="setting-label">Esporta Backup Chat</div>
                  <div class="setting-description">Scarica un file di backup con tutte le tue chat</div>
                </div>
                <button class="manage-button" on:click={handleExportBackup} disabled={isExportingBackup}>
                  {isExportingBackup ? 'Esportazione...' : 'Esporta Backup'}
                </button>
              </div>
              
              <div class="setting-row" class:row-visible={activeSection === 'dati'}>
                <div class="setting-info">
                  <div class="setting-label">Importa Backup Chat</div>
                  <div class="setting-description">Ripristina le chat da un file di backup</div>
                </div>
                <label class="manage-button secondary" style="cursor: pointer;">
                  <input type="file" accept=".json" style="display: none;" on:change={handleImportBackup} disabled={isImportingBackup} />
                  {isImportingBackup ? 'Importazione...' : 'Importa Backup'}
                </label>
              </div>
            {/if}
            
            <div class="setting-row" class:row-visible={activeSection === 'dati'}>
              <div class="setting-label">{$t('deleteAllChats')}</div>
              <button class="danger-button" on:click={handleDeleteAllChats} disabled={isDeletingAllChats}>
                {isDeletingAllChats ? get(t)('deletingAccount') + '...' : get(t)('clearAll')}
              </button>
            </div>
          {/if}
          
          <!-- Troubleshooting -->
          {#if activeSection === 'troubleshooting'}
            <div class="setting-section" class:section-visible={activeSection === 'troubleshooting'}>
              <h3 class="setting-title">Test Connessioni</h3>
              
              <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                <div class="setting-info">
                  <div class="setting-label">Test Database</div>
                  <div class="setting-description">Verifica la connessione al database e lo stato del servizio</div>
                </div>
                <button 
                  class="manage-button" 
                  on:click={testDatabase} 
                  disabled={isRunningTest}
                >
                  {#if troubleshootingStatus.database === 'testing'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    Test in corso...
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Testa
                  {/if}
                </button>
              </div>
              
              <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                <div class="setting-info">
                  <div class="setting-label">Test Crittografia</div>
                  <div class="setting-description">Verifica che il sistema di crittografia funzioni correttamente</div>
                </div>
                <button 
                  class="manage-button" 
                  on:click={testEncryption} 
                  disabled={isRunningTest}
                >
                  {#if troubleshootingStatus.encryption === 'testing'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    Test in corso...
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    Testa
                  {/if}
                </button>
              </div>
              
              <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                <div class="setting-info">
                  <div class="setting-label">Test API</div>
                  <div class="setting-description">Verifica che le API del server rispondano correttamente</div>
                </div>
                <button 
                  class="manage-button" 
                  on:click={testAPI} 
                  disabled={isRunningTest}
                >
                  {#if troubleshootingStatus.api === 'testing'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    Test in corso...
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 16V8a2 2 0 00-2-2h-5l-2-3H6a2 2 0 00-2 2v8a2 2 0 002 2h13a2 2 0 002-2z"/>
                      <circle cx="12" cy="13" r="3"/>
                    </svg>
                    Testa
                  {/if}
                </button>
              </div>
            </div>
            
            <div class="setting-section" class:section-visible={activeSection === 'troubleshooting'}>
              <h3 class="setting-title">Manutenzione</h3>
              
              <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                <div class="setting-info">
                  <div class="setting-label">Pulizia Cache</div>
                  <div class="setting-description">Rimuove la cache dell'applicazione e del browser per risolvere problemi di caricamento</div>
                </div>
                <button class="manage-button" on:click={clearCache}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                  Pulisci
                </button>
              </div>
              
              <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                <div class="setting-info">
                  <div class="setting-label">Verifica Storage</div>
                  <div class="setting-description">Controlla lo spazio utilizzato in localStorage e sessionStorage</div>
                </div>
                <button class="manage-button" on:click={checkStorage}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 00-2-2h-5l-2-3H6a2 2 0 00-2 2v8a2 2 0 002 2h13a2 2 0 002-2z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                  Verifica
                </button>
              </div>
              
              <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                <div class="setting-info">
                  <div class="setting-label">Reset Impostazioni Locali</div>
                  <div class="setting-description">Ripristina tema, stile UI e altre preferenze alle impostazioni predefinite</div>
                </div>
                <button class="manage-button secondary" on:click={resetLocalSettings}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 4v6h6M23 20v-6h-6"/>
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 003.51 15"/>
                  </svg>
                  Reset
                </button>
              </div>
            </div>
            
            <div class="setting-section" class:section-visible={activeSection === 'troubleshooting'}>
              <h3 class="setting-title">Riparazione Dati</h3>
              
              {#if $isAuthenticatedStore}
                <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                  <div class="setting-info">
                    <div class="setting-label">Ripara Chat</div>
                    <div class="setting-description">Verifica e ripara chat corrotte, rimuove duplicati e corregge errori di formato</div>
                  </div>
                  <button 
                    class="manage-button" 
                    on:click={repairChats} 
                    disabled={isRunningTest}
                  >
                    {#if troubleshootingStatus.repair === 'testing'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      Riparazione...
                    {:else}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 010-8.49l-2.82-2.83a6 6 0 01-8.49 0l-3.76 3.76a1 1 0 00-.38 1.11l.95 4.57-4.95 4.95a2 2 0 000 2.83l2.82 2.82a2 2 0 002.83 0l4.95-4.95.95.95a1 1 0 001.11.38l4.57-.95a1 1 0 00.62-.52l.74-1.48a1 1 0 00-.16-1.34l-3.77-3.77z"/>
                      </svg>
                      Ripara
                    {/if}
                  </button>
                </div>
                
                <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                  <div class="setting-info">
                    <div class="setting-label">Sincronizza Dati</div>
                    <div class="setting-description">Forza una sincronizzazione completa con il database</div>
                  </div>
                  <button 
                    class="manage-button" 
                    on:click={syncData} 
                    disabled={isRunningTest}
                  >
                    {#if troubleshootingStatus.sync === 'testing'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      Sincronizzazione...
                    {:else}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Sincronizza
                    {/if}
                  </button>
                </div>
              {:else}
                <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                  <div class="setting-info">
                    <div class="setting-label">Autenticazione richiesta</div>
                    <div class="setting-description">Accedi per utilizzare le funzioni di riparazione e sincronizzazione</div>
                  </div>
                </div>
              {/if}
            </div>
            
            <div class="setting-section" class:section-visible={activeSection === 'troubleshooting'}>
              <h3 class="setting-title">Diagnostica</h3>
              
              <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                <div class="setting-info">
                  <div class="setting-label">Verifica Permessi Browser</div>
                  <div class="setting-description">Controlla i permessi e le API disponibili nel tuo browser</div>
                </div>
                <button class="manage-button" on:click={checkBrowserPermissions}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Verifica
                </button>
              </div>
              
              <div class="setting-row" class:row-visible={activeSection === 'troubleshooting'}>
                <div class="setting-info">
                  <div class="setting-label">Diagnostica Performance</div>
                  <div class="setting-description">Mostra informazioni su memoria, connessione e tempi di caricamento</div>
                </div>
                <button class="manage-button" on:click={showPerformanceDiagnostics}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  Mostra
                </button>
              </div>
            </div>
          {/if}
          
          <!-- Informazioni -->
          {#if activeSection === 'informazioni'}
            <div class="setting-row" class:row-visible={activeSection === 'informazioni'}>
              <div class="setting-label">{$t('termsOfService')}</div>
              <button class="view-button" on:click={handleViewTerms}>{$t('view')}</button>
            </div>
            
            <div class="setting-row" class:row-visible={activeSection === 'informazioni'}>
              <div class="setting-label">{$t('privacyPolicy')}</div>
              <button class="view-button" on:click={handleViewPrivacy}>{$t('view')}</button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<TermsModal bind:isOpen={isTermsModalOpen} />
<PrivacyModal bind:isOpen={isPrivacyModalOpen} />

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1004;
    padding: 20px;
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  @media (max-width: 768px) {
    .modal-backdrop {
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
      align-items: flex-end;
      background-color: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
    }
  }

  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background-color: var(--bg-secondary);
    border-radius: 12px;
    max-width: 800px;
    width: 100%;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  @media (max-width: 768px) {
    .modal-content {
      max-width: 100%;
      max-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3);
    }
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @media (max-width: 768px) {
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
    flex-shrink: 0;
    position: relative;
  }
  
  @media (max-width: 768px) {
    .modal-header {
      padding: 16px 20px;
      padding-top: calc(16px + env(safe-area-inset-top));
      border-bottom: none;
    }
    
    .modal-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--border-color);
    }
    
    .close-button {
      min-width: 44px;
      min-height: 44px;
      padding: 12px;
      touch-action: manipulation;
    }
    
    .modal-title {
      font-size: 20px;
      font-weight: 700;
    }
    
    .close-button {
      min-width: 44px;
      min-height: 44px;
      padding: 10px;
      border-radius: 50%;
      background-color: var(--bg-tertiary);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 4px;
  }

  .close-button:hover {
    opacity: 0.7;
    background-color: rgba(255, 255, 255, 0.1);
    transform: rotate(90deg);
  }

  .modal-body-container {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
  
  @media (max-width: 768px) {
    .modal-body-container {
      flex-direction: column;
      overflow: hidden;
      flex: 1;
      min-height: 0;
      display: flex;
    }
  }

  .settings-sidebar {
    width: 200px;
    background-color: var(--bg-tertiary);
    border-right: 1px solid var(--border-color);
    padding: 16px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }
  
  @media (max-width: 768px) {
    .settings-sidebar {
      width: 100%;
      border-right: none;
      border-bottom: 1px solid var(--border-color);
      padding: 12px 16px;
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      gap: 12px;
      background-color: var(--bg-secondary);
      scroll-snap-type: x mandatory;
      scroll-padding: 0 16px;
      position: relative;
      scroll-behavior: smooth;
      flex-shrink: 0;
      min-height: 60px;
    }
    
    .settings-sidebar::-webkit-scrollbar {
      display: none;
    }
    
    /* Rimuovi i gradienti - non funzionano bene con sticky */
    
    .sidebar-item {
      padding: 12px 24px;
      white-space: nowrap;
      flex-shrink: 0;
      border-radius: 24px;
      min-width: fit-content;
      min-height: 44px;
      touch-action: manipulation;
      font-size: 14px;
      font-weight: 500;
      scroll-snap-align: center;
      scroll-snap-stop: always;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    
    .sidebar-item.active {
      background-color: var(--accent-blue);
      color: white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
      transform: scale(1.05);
    }
    
    .sidebar-item.active::before {
      display: none;
    }
    
    .sidebar-item:active {
      transform: scale(0.95);
    }
    
    .sidebar-item:hover:not(.active) {
      transform: none;
      background-color: var(--hover-bg);
    }
    
    .sidebar-item svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  }

  .sidebar-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .sidebar-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 3px;
    background-color: var(--accent-blue);
    transform: scaleY(0);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar-item:hover {
    background-color: var(--hover-bg);
    transform: translateX(4px);
  }

  .sidebar-item.active {
    background-color: var(--hover-bg);
  }

  .sidebar-item.active::before {
    transform: scaleY(1);
  }

  .sidebar-item svg {
    flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar-item:hover svg {
    transform: scale(1.1);
  }

  .settings-content {
    flex: 1;
    padding: 20px 24px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  @media (max-width: 768px) {
    .settings-content {
      padding: 20px 16px;
      padding-bottom: calc(20px + env(safe-area-inset-bottom));
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      flex: 1;
      min-height: 0;
    }
    
    .setting-section {
      margin-bottom: 32px;
    }
    
    .setting-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
      padding: 20px 0;
      border-bottom: 1px solid var(--border-color);
    }
    
    .setting-row:last-child {
      border-bottom: none;
    }
    
    .setting-label {
      font-size: 15px;
      font-weight: 600;
      width: 100%;
    }
    
    .setting-value {
      width: 100%;
      font-size: 14px;
    }
    
    .setting-actions {
      width: 100%;
      flex-direction: column;
      gap: 12px;
    }
    
    .view-button,
    .manage-button,
    .danger-button,
    .view-button {
      width: 100%;
      min-height: 48px;
      font-size: 15px;
      border-radius: 12px;
      font-weight: 500;
    }
    
    .theme-buttons {
      flex-direction: column;
      gap: 12px;
    }
    
    .theme-button {
      padding: 20px;
      border-radius: 16px;
      font-size: 15px;
    }
    
    .setting-select {
      width: 100%;
      max-width: 100%;
      padding: 14px 16px;
      font-size: 15px;
      border-radius: 12px;
    }
  }

  .content-visible {
    animation: fadeInContent 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
  }

  @keyframes fadeInContent {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .setting-section {
    margin-bottom: 24px;
    animation: slideInLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  .section-visible {
    animation-delay: 0.1s;
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .setting-section:last-child {
    margin-bottom: 0;
  }

  .setting-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
  }

  .theme-buttons {
    display: flex;
    gap: 12px;
  }

  .theme-button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .theme-button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.05);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .theme-button:hover::before {
    width: 300px;
    height: 300px;
  }

  .theme-button:hover {
    background-color: var(--hover-bg);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .theme-button.active {
    background-color: var(--bg-tertiary);
    border-color: var(--text-primary);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }

  .theme-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    position: relative;
  }

  .theme-button:disabled:hover {
    transform: none;
    background-color: var(--bg-tertiary);
    box-shadow: none;
  }

  .coming-soon-badge {
    display: inline-block;
    font-size: 11px;
    padding: 2px 6px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 4px;
    color: var(--text-secondary);
    font-weight: 500;
    margin-left: 4px;
  }

  .theme-button svg {
    flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 1;
  }

  .theme-button:hover svg {
    transform: scale(1.1) rotate(5deg);
  }

  .setting-select {
    width: 100%;
    max-width: 300px;
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .setting-select:hover {
    border-color: var(--text-secondary);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .setting-select:focus {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-color);
    animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  .row-visible {
    animation-delay: calc(var(--row-index, 0) * 0.05s);
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .setting-row:last-child {
    border-bottom: none;
  }

  .setting-label {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .setting-value {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .setting-info {
    flex: 1;
    min-width: 0;
  }

  .setting-description {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
    line-height: 1.5;
  }

  .manage-button,
  .view-button {
    padding: 8px 16px;
    background-color: var(--bg-tertiary);
    border: none;
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }

  .manage-button::before,
  .view-button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.05);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .manage-button:hover::before,
  .view-button:hover::before {
    width: 300px;
    height: 300px;
  }

  .manage-button:hover,
  .view-button:hover {
    background-color: var(--hover-bg);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .manage-button:active,
  .view-button:active {
    transform: translateY(0);
  }

  .danger-button {
    padding: 8px 16px;
    background-color: transparent;
    border: 1px solid #ef4444;
    border-radius: 6px;
    color: #ef4444;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }

  .danger-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: rgba(239, 68, 68, 0.1);
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .danger-button:hover::before {
    left: 0;
  }

  .danger-button:hover {
    background-color: rgba(239, 68, 68, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .danger-button:active {
    transform: translateY(0);
  }

  .loading-state {
    padding: 20px;
    text-align: center;
    color: var(--text-secondary);
  }
  
  .subscription-status {
    margin-bottom: 24px;
  }
  
  @media (max-width: 768px) {
    .subscription-status {
      margin-bottom: 20px;
    }
    
    .subscription-badge {
      width: 100%;
      padding: 16px;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      border-radius: 16px;
    }
    
    .badge-label {
      font-size: 18px;
    }
    
    .badge-status {
      font-size: 13px;
      padding: 6px 12px;
    }
  }
  
  .subscription-badge {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-radius: 8px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
  }
  
  .subscription-badge.active {
    border-color: var(--accent-blue);
  }
  
  .subscription-badge.premium {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%);
    border-color: #fbbf24;
  }
  
  .subscription-badge.pro {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
    border-color: #667eea;
  }
  
  .subscription-badge.max {
    background: linear-gradient(135deg, rgba(240, 147, 251, 0.2) 0%, rgba(245, 87, 108, 0.2) 100%);
    border-color: #f093fb;
  }
  
  .priority-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%);
    border: 1px solid #fbbf24;
    border-radius: 6px;
    color: #fbbf24;
    font-size: 13px;
    font-weight: 600;
  }
  
  .priority-badge svg {
    flex-shrink: 0;
  }
  
  .badge-label {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .badge-status {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    font-weight: 500;
  }
  
  .subscription-badge.active .badge-status {
    background-color: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }
  
  .manage-button.secondary {
    background-color: transparent;
    border: 1px solid var(--border-color);
  }
  
  .manage-button.secondary:hover {
    background-color: var(--bg-tertiary);
  }

  .phone-display-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .phone-edit-button {
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
  }

  .phone-edit-button:hover {
    color: var(--text-primary);
    background-color: var(--hover-bg);
  }

  .phone-edit-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 250px;
  }
  
  @media (max-width: 768px) {
    .phone-edit-container {
      width: 100%;
      min-width: 100%;
    }
    
    .phone-input {
      width: 100%;
      padding: 14px 16px;
      font-size: 15px;
      border-radius: 12px;
    }
    
    .phone-edit-actions {
      width: 100%;
      gap: 12px;
    }
    
    .phone-save-button,
    .phone-cancel-button {
      flex: 1;
      padding: 14px;
      font-size: 15px;
      border-radius: 12px;
      min-height: 48px;
    }
    
    .phone-display-container {
      width: 100%;
      justify-content: space-between;
    }
  }

  .phone-input {
    padding: 8px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: all 0.3s;
  }

  .phone-input:focus {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  .phone-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .phone-edit-actions {
    display: flex;
    gap: 8px;
  }

  .phone-save-button,
  .phone-cancel-button {
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .phone-save-button {
    background-color: var(--accent-blue);
    color: #ffffff;
  }

  .phone-save-button:hover:not(:disabled) {
    background-color: #2563eb;
    transform: translateY(-1px);
  }

  .phone-save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .phone-cancel-button {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .phone-cancel-button:hover:not(:disabled) {
    background-color: var(--hover-bg);
  }

  .phone-cancel-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .installed-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%);
    border: 1px solid #22c55e;
    border-radius: 6px;
    color: #22c55e;
    font-size: 13px;
    font-weight: 600;
  }
  
  .installed-badge svg {
    flex-shrink: 0;
  }

  /* Rimuovi stili duplicati - già gestiti sopra */
  
  /* Troubleshooting styles */
  .spinning {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .manage-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  .manage-button:disabled:hover {
    transform: none;
    background-color: var(--bg-tertiary);
  }
</style>
