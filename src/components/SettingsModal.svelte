<script>
  import { isSettingsOpen, isPremiumModalOpen, isMobile, isSidebarOpen, isSharedLinksModalOpen } from '../stores/app.js';
  import { chats } from '../stores/chat.js';
  import { user as userStore } from '../stores/user.js';
  import { user as authUser, isAuthenticatedStore, clearUser } from '../stores/auth.js';
  import { deleteAccount, getToken, updateUsername, updatePassword, getCurrentUser } from '../services/authService.js';
  import { getCurrentAccount, removeAccount, accounts } from '../stores/accounts.js';
  import { getSubscription, saveSubscription } from '../services/subscriptionService.js';
  import { hasActiveSubscription, hasPlanOrHigher } from '../stores/user.js';
  import { createDataExport, downloadDataExport } from '../services/dataExportService.js';
  import { deleteAllChatsFromDatabase } from '../services/chatService.js';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { showConfirm, showAlert, showPrompt } from '../services/dialogService.js';
  import { availableLanguages } from '../utils/i18n.js';
  import { currentLanguage, t, setLanguage } from '../stores/language.js';
  
  let activeSection = 'generale';
  let theme = 'system';
  let uiStyle = 'material';
  let language = 'system';
  let username = '';
  let isEditingUsername = false;
  let usernameInput = '';
  let isSavingUsername = false;
  let isLoadingUsername = false;
  
  let isEditingPassword = false;
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let isSavingPassword = false;
  
  let sidebarRef;
  
  const sections = [
    { id: 'generale', label: 'Generale', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'profilo', label: 'Profilo', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'abbonamento', label: 'Abbonamento', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
    { id: 'dati', label: 'Dati', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    { id: 'informazioni', label: 'Informazioni', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
  ];
  
  onMount(() => {
    // Carica tema salvato
    const savedTheme = localStorage.getItem('nebula-theme');
    if (savedTheme) {
      theme = savedTheme;
      applyTheme(savedTheme);
    }
    
    // Carica stile UI salvato
    const savedUIStyle = localStorage.getItem('nebula-ui-style');
    if (savedUIStyle) {
      uiStyle = savedUIStyle;
      applyUIStyle(savedUIStyle);
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
  
  function applyTheme(newTheme) {
    const root = document.documentElement;
    const body = document.body;
    if (newTheme === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f5f5f5');
      root.style.setProperty('--bg-tertiary', '#e5e5e5');
      root.style.setProperty('--text-primary', '#171717');
      root.style.setProperty('--text-secondary', '#525252');
      root.style.setProperty('--border-color', '#d4d4d4');
      body.setAttribute('data-theme', 'light');
    } else if (newTheme === 'dark') {
      root.style.setProperty('--bg-primary', '#171717');
      root.style.setProperty('--bg-secondary', '#1f1f1f');
      root.style.setProperty('--bg-tertiary', '#2a2a2a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#a0a0a0');
      root.style.setProperty('--border-color', '#3a3a3a');
      body.setAttribute('data-theme', 'dark');
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
        body.setAttribute('data-theme', 'dark');
      } else {
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--bg-secondary', '#f5f5f5');
        root.style.setProperty('--bg-tertiary', '#e5e5e5');
        root.style.setProperty('--text-primary', '#171717');
        root.style.setProperty('--text-secondary', '#525252');
        root.style.setProperty('--border-color', '#d4d4d4');
        body.setAttribute('data-theme', 'light');
      }
    }
  }
  
  function handleThemeChange(newTheme) {
    theme = newTheme;
    localStorage.setItem('nebula-theme', newTheme);
    applyTheme(newTheme);
  }
  
  function applyUIStyle(newStyle) {
    const body = document.body;
    if (newStyle === 'liquid') {
      body.classList.add('liquid-glass');
    } else {
      body.classList.remove('liquid-glass');
    }
  }
  
  function handleUIStyleChange(newStyle) {
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
  
  function startEditingPassword() {
    isEditingPassword = true;
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
  }
  
  function cancelEditingPassword() {
    isEditingPassword = false;
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
  }
  
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
  
  async function savePassword() {
    if (isSavingPassword) return;
    
    if (!currentPassword) {
      await showAlert('Inserisci la password attuale', 'Errore', 'OK', 'error');
      return;
    }
    
    if (!newPassword || newPassword.length < 6) {
      await showAlert('La nuova password deve essere di almeno 6 caratteri', 'Errore', 'OK', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      await showAlert('Le password non corrispondono', 'Errore', 'OK', 'error');
      return;
    }
    
    isSavingPassword = true;
    try {
      const result = await updatePassword(currentPassword, newPassword);
      
      if (result.success) {
        isEditingPassword = false;
        currentPassword = '';
        newPassword = '';
        confirmPassword = '';
        await showAlert('Password aggiornata con successo', 'Successo', 'OK', 'success');
      } else {
        await showAlert(result.message || 'Errore durante l\'aggiornamento della password', 'Errore', 'OK', 'error');
      }
    } catch (error) {
      console.error('Errore durante aggiornamento password:', error);
      await showAlert('Errore durante l\'aggiornamento della password', 'Errore', 'OK', 'error');
    } finally {
      isSavingPassword = false;
    }
  }
  
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
    // Apri in una nuova finestra o mostra modal
    window.open('https://nebula-ai.com/terms', '_blank');
  }
  
  function handleViewPrivacy() {
    // Apri in una nuova finestra o mostra modal
    window.open('https://nebula-ai.com/privacy', '_blank');
  }
  
  async function handleManageSharedLinks() {
    isSharedLinksModalOpen.set(true);
  }
  
  let isLoadingSubscription = false;
  let subscriptionData = null;
  
  async function loadSubscription() {
    if (!$isAuthenticatedStore) return;
    
    isLoadingSubscription = true;
    try {
      const result = await getSubscription();
      if (result.success && result.subscription) {
        subscriptionData = result.subscription;
        // Sincronizza con lo store utente
        userStore.update(user => ({
          ...user,
          subscription: {
            active: result.subscription.status === 'active',
            plan: result.subscription.plan,
            expiresAt: result.subscription.expires_at ? new Date(result.subscription.expires_at).toISOString() : null,
            key: user.subscription?.key || null
          }
        }));
      }
    } catch (error) {
      console.error('Errore caricamento abbonamento:', error);
    } finally {
      isLoadingSubscription = false;
    }
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
    if (plan === 'pro') return get(t)('pro');
    if (plan === 'max') return get(t)('max');
    return plan;
  }
  
  function handleUpgrade() {
    isPremiumModalOpen.set(true);
    isSettingsOpen.set(false);
  }
  
  $: subscription = $userStore.subscription;
  $: isActive = subscription?.active && hasActiveSubscription();
  $: planName = getPlanName(subscription?.plan);
  
  onMount(() => {
    if ($isAuthenticatedStore) {
      loadSubscription();
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
                  on:click={() => handleUIStyleChange('liquid')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                  </svg>
                  <span>Liquid Glass</span>
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
          {/if}
          
          <!-- Abbonamento -->
          {#if activeSection === 'abbonamento'}
            {#if isLoadingSubscription}
              <div class="setting-section" class:section-visible={activeSection === 'abbonamento'}>
                <div class="loading-state">{$t('loadingSubscription')}</div>
              </div>
            {:else}
              <div class="setting-section" class:section-visible={activeSection === 'abbonamento'}>
                <h3 class="setting-title">{$t('subscriptionStatus')}</h3>
                
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
                
                {#if subscription?.startedAt}
                  <div class="setting-row" class:row-visible={activeSection === 'abbonamento'}>
                    <div class="setting-label">{$t('activationDate')}</div>
                    <div class="setting-value">{formatDate(subscription.startedAt)}</div>
                  </div>
                {/if}
                
                {#if !isActive || subscription?.plan === 'free'}
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
                        // Mostra modal o sezione API keys
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
                      <div class="setting-description">{$t('manageDescription')}</div>
                    </div>
                    <button class="manage-button" on:click={handleUpgrade}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                      {$t('manage')}
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
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
            
            <div class="setting-row" class:row-visible={activeSection === 'profilo'}>
              <div class="setting-label">Password</div>
              <div class="setting-value">
                {#if isEditingPassword}
                  <div class="phone-edit-container">
                    <input 
                      type="password" 
                      class="phone-input" 
                      bind:value={currentPassword} 
                      placeholder="Password attuale"
                      disabled={isSavingPassword}
                    />
                    <input 
                      type="password" 
                      class="phone-input" 
                      bind:value={newPassword} 
                      placeholder="Nuova password"
                      disabled={isSavingPassword}
                    />
                    <input 
                      type="password" 
                      class="phone-input" 
                      bind:value={confirmPassword} 
                      placeholder="Conferma nuova password"
                      disabled={isSavingPassword}
                    />
                    <div class="phone-edit-actions">
                      <button 
                        class="phone-save-button" 
                        on:click={savePassword} 
                        disabled={isSavingPassword}
                      >
                        {isSavingPassword ? get(t)('save') + '...' : get(t)('save')}
                      </button>
                      <button 
                        class="phone-cancel-button" 
                        on:click={cancelEditingPassword}
                        disabled={isSavingPassword}
                      >
                        {$t('cancel')}
                      </button>
                    </div>
                  </div>
                {:else}
                  <div class="phone-display-container">
                    <span>••••••••</span>
                    <button 
                      class="phone-edit-button" 
                      on:click={startEditingPassword}
                      title="Modifica password"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </button>
                  </div>
                {/if}
              </div>
            </div>
            
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
            
            <div class="setting-row" class:row-visible={activeSection === 'dati'}>
              <div class="setting-label">{$t('deleteAllChats')}</div>
              <button class="danger-button" on:click={handleDeleteAllChats} disabled={isDeletingAllChats}>
                {isDeletingAllChats ? get(t)('deletingAccount') + '...' : get(t)('clearAll')}
              </button>
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
      padding: 0;
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
      max-height: 90vh;
      height: 90vh;
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
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
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

  /* Rimuovi stili duplicati - già gestiti sopra */
</style>
