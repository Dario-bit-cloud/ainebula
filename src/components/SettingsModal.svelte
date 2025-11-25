<script>
  import { isSettingsOpen, isPremiumModalOpen } from '../stores/app.js';
  import { chats } from '../stores/chat.js';
  import { user as userStore } from '../stores/user.js';
  import { user as authUser, isAuthenticatedStore, clearUser } from '../stores/auth.js';
  import { deleteAccount, getToken, generate2FA, verify2FA, disable2FA, get2FAStatus } from '../services/authService.js';
  import { getCurrentAccount, removeAccount } from '../stores/accounts.js';
  import { getSubscription, saveSubscription } from '../services/subscriptionService.js';
  import { hasActiveSubscription, hasPlanOrHigher } from '../stores/user.js';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { showConfirm, showAlert, showPrompt } from '../services/dialogService.js';
  import { availableLanguages } from '../utils/i18n.js';
  import { currentLanguage, t } from '../stores/language.js';
  
  let activeSection = 'generale';
  let theme = 'system';
  let language = 'system';
  let phoneNumber = '';
  let isEditingPhone = false;
  let phoneInput = '';
  let isSavingPhone = false;
  let isLoadingPhone = false;
  
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
    
    // Carica lingua salvata
    const savedLanguage = localStorage.getItem('nebula-language');
    if (savedLanguage) {
      language = savedLanguage;
    }
  });
  
  function closeModal() {
    isSettingsOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function selectSection(sectionId) {
    activeSection = sectionId;
    // Carica il numero di telefono e lo stato 2FA quando si apre la sezione profilo
    if (sectionId === 'profilo' && $isAuthenticatedStore) {
      loadPhoneNumber();
      load2FAStatus();
    }
  }
  
  function applyTheme(newTheme) {
    const root = document.documentElement;
    if (newTheme === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f5f5f5');
      root.style.setProperty('--bg-tertiary', '#e5e5e5');
      root.style.setProperty('--text-primary', '#171717');
      root.style.setProperty('--text-secondary', '#525252');
      root.style.setProperty('--border-color', '#d4d4d4');
    } else if (newTheme === 'dark') {
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
  }
  
  function handleThemeChange(newTheme) {
    theme = newTheme;
    localStorage.setItem('nebula-theme', newTheme);
    applyTheme(newTheme);
  }
  
  function handleLanguageChange() {
    setLanguage(language);
    // Ricarica la pagina per applicare le traduzioni
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }
  
  async function handleDisconnect() {
    const confirmed = await showConfirm('Sei sicuro di voler disconnetterti da tutti i dispositivi?', 'Disconnetti', 'Disconnetti', 'Annulla');
    if (confirmed) {
      try {
        const token = getToken();
        if (!token) {
          await showAlert('Errore: token di autenticazione non trovato', 'Errore', 'OK', 'error');
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

        const response = await fetch(`${getApiBaseUrl()}?action=disconnect-all`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (data.success) {
          await showAlert('Disconnessione da tutti i dispositivi completata. La sessione corrente è stata mantenuta.', 'Disconnessione completata', 'OK', 'success');
        } else {
          await showAlert(data.message || 'Errore durante la disconnessione', 'Errore', 'OK', 'error');
        }
      } catch (error) {
        console.error('Errore durante disconnessione:', error);
        await showAlert('Errore durante la disconnessione da tutti i dispositivi', 'Errore', 'OK', 'error');
      }
    }
  }
  
  async function loadPhoneNumber() {
    if (!$isAuthenticatedStore || isLoadingPhone) return;
    
    isLoadingPhone = true;
    try {
      const token = getToken();
      if (!token) {
        isLoadingPhone = false;
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
        phoneNumber = data.user.phone_number || '';
        phoneInput = phoneNumber;
      }
    } catch (error) {
      console.error('Errore durante caricamento numero di telefono:', error);
    } finally {
      isLoadingPhone = false;
    }
  }
  
  function startEditingPhone() {
    isEditingPhone = true;
    phoneInput = phoneNumber;
  }
  
  function cancelEditingPhone() {
    isEditingPhone = false;
    phoneInput = phoneNumber;
  }
  
  async function savePhoneNumber() {
    if (isSavingPhone) return;
    
    isSavingPhone = true;
    try {
      const token = getToken();
      if (!token) {
        await showAlert('Errore: token di autenticazione non trovato', 'Errore', 'OK', 'error');
        isSavingPhone = false;
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

      const response = await fetch(`${getApiBaseUrl()}?action=update-phone`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone_number: phoneInput.trim() || null
        })
      });

      const data = await response.json();

      if (data.success) {
        phoneNumber = data.phone_number || '';
        isEditingPhone = false;
        await showAlert('Numero di telefono aggiornato con successo', 'Successo', 'OK', 'success');
      } else {
        await showAlert(data.message || 'Errore durante l\'aggiornamento del numero di telefono', 'Errore', 'OK', 'error');
      }
    } catch (error) {
      console.error('Errore durante aggiornamento numero di telefono:', error);
      await showAlert('Errore durante l\'aggiornamento del numero di telefono', 'Errore', 'OK', 'error');
    } finally {
      isSavingPhone = false;
    }
  }
  
  let isDeletingAccount = false;
  
  // 2FA state
  let twoFactorEnabled = false;
  let isLoading2FA = false;
  let isGeneratingQR = false;
  let isVerifying2FA = false;
  let isDisabling2FA = false;
  let qrCodeDataUrl = '';
  let manualEntryKey = '';
  let twoFactorCode = '';
  let showQRCode = false;
  let showDisable2FA = false;
  let disable2FACode = '';
  
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
    if (!$isAuthenticatedStore) {
      // Se non autenticato, esporta solo dati locali
      const exportData = {
        user: $userStore,
        chats: $chats,
        settings: {
          theme,
          language
        },
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nebula-ai-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await showAlert('Dati esportati con successo!', 'Esportazione completata', 'OK', 'success');
      return;
    }
    
    isExporting = true;
    try {
      // Crea la richiesta di export
      const result = await createDataExport();
      
      if (result.success) {
        // Scarica i dati
        const downloadResult = await downloadDataExport(result.exportToken);
        
        if (downloadResult.success) {
          await showAlert('Dati esportati con successo! Il link per il download sarà valido per 7 giorni.', 'Esportazione completata', 'OK', 'success');
        } else {
          await showAlert(downloadResult.message || 'Errore nel download dei dati', 'Errore', 'OK', 'error');
        }
      } else {
        await showAlert(result.message || 'Errore nella creazione dell\'export', 'Errore', 'OK', 'error');
      }
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
    await showAlert('Gestione link condivisi - Funzionalità in arrivo', 'Info', 'OK', 'info');
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
  
  async function load2FAStatus() {
    if (!$isAuthenticatedStore || isLoading2FA) return;
    
    isLoading2FA = true;
    try {
      const result = await get2FAStatus();
      if (result.success) {
        twoFactorEnabled = result.twoFactorEnabled || false;
      }
    } catch (error) {
      console.error('Errore caricamento stato 2FA:', error);
    } finally {
      isLoading2FA = false;
    }
  }
  
  async function handleGenerate2FA() {
    if (isGeneratingQR) return;
    
    isGeneratingQR = true;
    try {
      const result = await generate2FA();
      if (result.success) {
        qrCodeDataUrl = result.qrCode;
        manualEntryKey = result.manualEntryKey;
        showQRCode = true;
        twoFactorCode = '';
      } else {
        await showAlert(result.message || 'Errore durante la generazione del QR code', 'Errore', 'OK', 'error');
      }
    } catch (error) {
      console.error('Errore generazione 2FA:', error);
      await showAlert('Errore durante la generazione del QR code', 'Errore', 'OK', 'error');
    } finally {
      isGeneratingQR = false;
    }
  }
  
  async function handleVerify2FA() {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      await showAlert('Inserisci un codice 2FA valido (6 cifre)', 'Errore', 'OK', 'error');
      return;
    }
    
    if (isVerifying2FA) return;
    
    isVerifying2FA = true;
    try {
      const result = await verify2FA(twoFactorCode);
      if (result.success) {
        twoFactorEnabled = true;
        showQRCode = false;
        twoFactorCode = '';
        qrCodeDataUrl = '';
        manualEntryKey = '';
        await showAlert('2FA abilitato con successo!', 'Successo', 'OK', 'success');
      } else {
        await showAlert(result.message || 'Codice 2FA non valido', 'Errore', 'OK', 'error');
      }
    } catch (error) {
      console.error('Errore verifica 2FA:', error);
      await showAlert('Errore durante la verifica del codice', 'Errore', 'OK', 'error');
    } finally {
      isVerifying2FA = false;
    }
  }
  
  async function handleDisable2FA() {
    if (!disable2FACode || disable2FACode.length !== 6) {
      await showAlert('Inserisci un codice 2FA valido (6 cifre)', 'Errore', 'OK', 'error');
      return;
    }
    
    if (isDisabling2FA) return;
    
    isDisabling2FA = true;
    try {
      const result = await disable2FA(disable2FACode);
      if (result.success) {
        twoFactorEnabled = false;
        showDisable2FA = false;
        disable2FACode = '';
        await showAlert('2FA disabilitato con successo', 'Successo', 'OK', 'success');
      } else {
        await showAlert(result.message || 'Codice 2FA non valido', 'Errore', 'OK', 'error');
      }
    } catch (error) {
      console.error('Errore disabilitazione 2FA:', error);
      await showAlert('Errore durante la disabilitazione del 2FA', 'Errore', 'OK', 'error');
    } finally {
      isDisabling2FA = false;
    }
  }
  
  function cancel2FASetup() {
    showQRCode = false;
    twoFactorCode = '';
    qrCodeDataUrl = '';
    manualEntryKey = '';
  }
  
  function cancelDisable2FA() {
    showDisable2FA = false;
    disable2FACode = '';
  }
  
  onMount(() => {
    if ($isAuthenticatedStore) {
      loadSubscription();
      load2FAStatus();
      // Carica il numero di telefono se la sezione profilo è già attiva
      if (activeSection === 'profilo') {
        loadPhoneNumber();
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
        <aside class="settings-sidebar">
          {#each sections as section}
            <button
              class="sidebar-item"
              class:active={activeSection === section.id}
              on:click={() => selectSection(section.id)}
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
                {#if $isAuthenticatedStore && $authUser?.username}
                  {$authUser.username}
                {:else if $userStore.name}
                  {$userStore.name}
                {:else}
                  -
                {/if}
              </div>
            </div>
            
            <div class="setting-row" class:row-visible={activeSection === 'profilo'}>
              <div class="setting-label">{$t('phoneNumber')}</div>
              <div class="setting-value">
                {#if isEditingPhone}
                  <div class="phone-edit-container">
                    <input 
                      type="tel" 
                      class="phone-input" 
                      bind:value={phoneInput} 
                      placeholder={$t('phoneNumber')}
                      disabled={isSavingPhone}
                    />
                    <div class="phone-edit-actions">
                      <button 
                        class="phone-save-button" 
                        on:click={savePhoneNumber} 
                        disabled={isSavingPhone}
                      >
                        {isSavingPhone ? get(t)('save') + '...' : get(t)('save')}
                      </button>
                      <button 
                        class="phone-cancel-button" 
                        on:click={cancelEditingPhone}
                        disabled={isSavingPhone}
                      >
                        {$t('cancel')}
                      </button>
                    </div>
                  </div>
                {:else}
                  <div class="phone-display-container">
                    <span>{phoneNumber || '-'}</span>
                    <button 
                      class="phone-edit-button" 
                      on:click={startEditingPhone}
                      title={$t('edit') + ' ' + get(t)('phoneNumber')}
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
              <div class="setting-info">
                <div class="setting-label">Autenticazione a due fattori (2FA)</div>
                <div class="setting-description">
                  {#if twoFactorEnabled}
                    Il 2FA è attualmente abilitato. Aggiunge un ulteriore livello di sicurezza al tuo account.
                  {:else}
                    Aggiungi un ulteriore livello di sicurezza al tuo account con l'autenticazione a due fattori.
                  {/if}
                </div>
              </div>
              <div class="setting-actions">
                {#if twoFactorEnabled}
                  {#if !showDisable2FA}
                    <button class="danger-button" on:click={() => showDisable2FA = true}>
                      Disabilita 2FA
                    </button>
                  {:else}
                    <div class="two-factor-setup">
                      <p class="two-factor-description">Inserisci il codice 2FA per disabilitare:</p>
                      <input 
                        type="text" 
                        class="two-factor-input" 
                        bind:value={disable2FACode} 
                        placeholder="000000"
                        maxlength="6"
                        disabled={isDisabling2FA}
                      />
                      <div class="two-factor-actions">
                        <button 
                          class="manage-button" 
                          on:click={handleDisable2FA} 
                          disabled={isDisabling2FA || disable2FACode.length !== 6}
                        >
                          {isDisabling2FA ? 'Disabilitazione...' : 'Disabilita'}
                        </button>
                        <button 
                          class="phone-cancel-button" 
                          on:click={cancelDisable2FA}
                          disabled={isDisabling2FA}
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  {/if}
                {:else}
                  {#if !showQRCode}
                    <button class="manage-button" on:click={handleGenerate2FA} disabled={isGeneratingQR}>
                      {isGeneratingQR ? 'Generazione...' : 'Abilita 2FA'}
                    </button>
                  {:else}
                    <div class="two-factor-setup">
                      <p class="two-factor-description">Scansiona questo QR code con la tua app di autenticazione (es. Google Authenticator, Authy):</p>
                      {#if qrCodeDataUrl}
                        <div class="qr-code-container">
                          <img src={qrCodeDataUrl} alt="QR Code 2FA" class="qr-code-image" />
                        </div>
                        <p class="two-factor-description">Oppure inserisci manualmente questa chiave:</p>
                        <div class="manual-key-container">
                          <code class="manual-key">{manualEntryKey}</code>
                          <button 
                            class="copy-key-button" 
                            on:click={() => {
                              navigator.clipboard.writeText(manualEntryKey);
                              showAlert('Chiave copiata negli appunti!', 'Successo', 'OK', 'success');
                            }}
                          >
                            Copia
                          </button>
                        </div>
                        <p class="two-factor-description">Inserisci il codice di verifica dalla tua app:</p>
                        <input 
                          type="text" 
                          class="two-factor-input" 
                          bind:value={twoFactorCode} 
                          placeholder="000000"
                          maxlength="6"
                          disabled={isVerifying2FA}
                        />
                        <div class="two-factor-actions">
                          <button 
                            class="manage-button" 
                            on:click={handleVerify2FA} 
                            disabled={isVerifying2FA || twoFactorCode.length !== 6}
                          >
                            {isVerifying2FA ? 'Verifica...' : 'Verifica e abilita'}
                          </button>
                          <button 
                            class="phone-cancel-button" 
                            on:click={cancel2FASetup}
                            disabled={isVerifying2FA}
                          >
                            Annulla
                          </button>
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/if}
              </div>
            </div>
            
            <div class="setting-row" class:row-visible={activeSection === 'profilo'}>
              <div class="setting-label">{$t('disconnectAllDevices')}</div>
              <button class="danger-button" on:click={handleDisconnect}>{$t('disconnect')}</button>
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
    z-index: 1000;
    padding: 20px;
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 0;
      align-items: stretch;
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
      max-height: 100vh;
      height: 100vh;
      border-radius: 0;
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

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
    animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
  }
  
  @media (max-width: 768px) {
    .modal-header {
      padding: 16px;
    }
    
    .modal-title {
      font-size: 18px;
    }
    
    .close-button {
      min-width: 44px;
      min-height: 44px;
      padding: 8px;
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
    font-size: 20px;
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
  }

  .settings-sidebar {
    width: 200px;
    background-color: var(--bg-tertiary);
    border-right: 1px solid var(--border-color);
    padding: 16px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  @media (max-width: 768px) {
    .settings-sidebar {
      width: 100%;
      border-right: none;
      border-bottom: 1px solid var(--border-color);
      padding: 8px;
      flex-direction: row;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .sidebar-item {
      padding: 10px 16px;
      white-space: nowrap;
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
    padding: 32px;
    overflow-y: auto;
  }
  
  @media (max-width: 768px) {
    .settings-content {
      padding: 16px;
    }
    
    .setting-section {
      margin-bottom: 24px;
    }
    
    .setting-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    
    .setting-actions {
      width: 100%;
      flex-direction: column;
    }
    
    .manage-button,
    .danger-button,
    .view-button {
      width: 100%;
      min-height: 44px;
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
    margin-bottom: 32px;
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
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 16px 0;
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
    padding: 16px 0;
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

  .two-factor-setup {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 300px;
  }

  .two-factor-description {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .qr-code-container {
    display: flex;
    justify-content: center;
    padding: 16px;
    background-color: var(--bg-tertiary);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .qr-code-image {
    width: 200px;
    height: 200px;
    border-radius: 4px;
  }

  .manual-key-container {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background-color: var(--bg-tertiary);
    border-radius: 6px;
    border: 1px solid var(--border-color);
  }

  .manual-key {
    flex: 1;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    color: var(--text-primary);
    word-break: break-all;
    padding: 4px 0;
  }

  .copy-key-button {
    padding: 6px 12px;
    background-color: var(--accent-blue);
    color: #ffffff;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .copy-key-button:hover {
    background-color: #2563eb;
  }

  .two-factor-input {
    width: 100%;
    padding: 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 18px;
    font-family: 'Courier New', monospace;
    text-align: center;
    letter-spacing: 8px;
    outline: none;
    transition: all 0.3s;
  }

  .two-factor-input:focus {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  .two-factor-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .two-factor-actions {
    display: flex;
    gap: 8px;
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 0;
    }

    .modal-content {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
      height: 100vh;
    }

    .settings-sidebar {
      width: 160px;
    }

    .settings-content {
      padding: 20px 16px;
    }

    .theme-buttons {
      flex-direction: column;
    }

    .two-factor-setup {
      min-width: 100%;
    }

    .qr-code-image {
      width: 150px;
      height: 150px;
    }
  }
</style>
