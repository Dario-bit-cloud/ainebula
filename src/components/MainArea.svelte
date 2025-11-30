<script>
  import { onMount, tick, afterUpdate } from 'svelte';
  import { get } from 'svelte/store';
  import { createEventDispatcher } from 'svelte';
  import { chats, currentChatId, currentChat, isGenerating, addMessage, createNewChat, updateMessage, deleteMessage, saveChatsToStorage } from '../stores/chat.js';
  import { selectedModel, availableModels } from '../stores/models.js';
  import { hasActiveSubscription, user as userStore } from '../stores/user.js';
  import { isAuthenticatedStore } from '../stores/auth.js';
  import { generateResponseStream, generateResponse } from '../services/aiService.js';
  import { isPremiumModalOpen, selectedPrompt, isMobile, sidebarView, isSidebarOpen, isIncognitoMode } from '../stores/app.js';
  import { currentAbortController, setAbortController, abortCurrentRequest } from '../stores/abortController.js';
  import { renderMarkdown, initCodeCopyButtons, normalizeTextSpacing } from '../utils/markdown.js';
  import MessageActions from './MessageActions.svelte';
  import { estimateChatTokens, estimateMessageTokens } from '../utils/tokenCounter.js';
  import { tokenInfo } from '../stores/tokenInfo.js';
  import PrivacyModal from './PrivacyModal.svelte';
  import { showAlert, showPrompt } from '../services/dialogService.js';
  import { currentLanguage, t } from '../stores/language.js';
  import TopBar from './TopBar.svelte';
  import { throttle } from '../utils/performance.js';
  import { logError } from '../utils/logger.js';
  import Skeleton from './Skeleton.svelte';
  import EmptyState from './EmptyState.svelte';
  import { showSuccess, showError, showWarning } from '../services/toastService.js';
  
  const dispatch = createEventDispatcher();
  
  function handleOpenAuth(event) {
    dispatch('openAuth', event.detail);
  }
  
  let inputValue = '';
  let inputRef;
  let textareaRef;
  let fileInput;
  let imageInput;
  let attachedImages = [];
  let messagesContainer;
  let currentStreamingMessageId = null;
  let editingMessageIndex = null;
  let searchQuery = '';
  let showScrollToTop = false;
  let showSearchBar = false;
  let showTokenCounter = true;
  let highlightedMessageIndex = null;
  let showImageStyles = false;
  let selectedImageIndex = null;
  let imageDescription = '';
  let showPrivacyCard = true;
  let showAttachMenu = false;
  let showMobileActionsMenu = false;
  let mobileActionsRef;
  
  // Verifica se il modello selezionato supporta web search
  $: currentModel = $availableModels.find(m => m.id === $selectedModel);
  $: hasWebSearch = currentModel?.webSearch || false;
  $: allowsPremiumFeatures = currentModel?.allowsPremiumFeatures || false;
  let isPrivacyModalOpen = false;
  let mainAreaElement;
  let deepResearchEnabled = false;
  let webSearchEnabled = false;
  
  // Variabili per gestione swipe
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isSwiping = false;
  const SWIPE_THRESHOLD = 50; // Soglia minima per aprire la sidebar (in px)
  const SWIPE_EDGE_THRESHOLD = 20; // Area dal bordo sinistro dove inizia lo swipe (in px)
  const MAX_VERTICAL_SWIPE = 30; // Massimo movimento verticale consentito (in px)
  
  const imageStyles = [
    {
      id: 'cyberpunk',
      name: 'Cyberpunk',
      icon: 'https://cdn.openai.com/API/images/image-picker-styles/v2/cyberpunk.webp'
    },
    {
      id: 'anime',
      name: 'Anime',
      icon: 'https://cdn.openai.com/API/images/image-picker-styles/v2/anime.webp'
    },
    {
      id: 'dramatic-headshot',
      name: 'Primo piano d\'effetto',
      icon: 'https://cdn.openai.com/API/images/image-picker-styles/v2/dramatic-headshot.webp'
    },
    {
      id: 'coloring-book',
      name: 'Album da colorare',
      icon: 'https://cdn.openai.com/API/images/image-picker-styles/v2/coloring-book.webp'
    },
    {
      id: 'photo-shoot',
      name: 'Servizio fotografico',
      icon: 'https://cdn.openai.com/API/images/image-picker-styles/v2/photo-shoot.webp'
    },
    {
      id: 'retro-cartoon',
      name: 'Cartone retro',
      icon: 'https://cdn.openai.com/API/images/image-picker-styles/v2/retro-cartoon.webp'
    }
  ];
  
  // Variabili reattive
  let messages = [];
  let showErrorBanner = false;
  let errorMessage = '';
  let currentChatTokens = 0;
  let maxTokens = 4000;
  let tokenUsagePercentage = 0;
  let tokenWarning = false;
  let isLoadingChat = false;
  
  // Usa textarea invece di input
  $: isTextarea = true;
  
  // Ottieni i messaggi dalla chat corrente
  $: {
    try {
      messages = $currentChat?.messages || [];
    } catch (error) {
      logError('Error accessing currentChat:', error);
      messages = [];
    }
  }
  
  // Filtra i messaggi nascosti per la visualizzazione
  $: visibleMessages = messages.filter(msg => !msg.hidden);
  
  // Usa derived store per token info (ottimizzato)
  $: {
    const info = $tokenInfo;
    currentChatTokens = info.currentChatTokens;
    maxTokens = info.maxTokens;
    tokenUsagePercentage = info.tokenUsagePercentage;
    tokenWarning = info.tokenWarning;
  }
  
  // Gestisci prompt selezionato dalla libreria
  $: {
    if ($selectedPrompt) {
      // Inserisci il prompt nell'input
      const promptText = $selectedPrompt.prompt || '';
      if (promptText) {
        // Se c'è già testo, aggiungi una nuova riga prima del prompt
        if (inputValue.trim()) {
          inputValue = inputValue + '\n\n' + promptText;
        } else {
          inputValue = promptText;
        }
        // Focus sul textarea e resize dopo un tick per assicurarsi che sia renderizzato
        tick().then(() => {
          if (textareaRef) {
            textareaRef.focus();
            resizeTextarea();
          }
        });
        // Reset del prompt selezionato
        selectedPrompt.set(null);
      }
    }
  }
  
  // Inizializza i pulsanti di copia dopo ogni aggiornamento
  afterUpdate(() => {
    if (messagesContainer) {
      initCodeCopyButtons(messagesContainer);
    }
  });

  // Funzioni per gestione swipe
  function handleTouchStart(event) {
    // Solo su mobile e quando la sidebar è chiusa
    if (!get(isMobile) || get(isSidebarOpen)) return;
    
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    isSwiping = false;
    
    // Inizia lo swipe solo se si parte dal bordo sinistro
    if (touchStartX <= SWIPE_EDGE_THRESHOLD) {
      isSwiping = true;
    }
  }
  
  function handleTouchMove(event) {
    if (!get(isMobile) || !isSwiping || get(isSidebarOpen)) return;
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // Se lo swipe verticale è troppo grande, annulla
    if (deltaY > MAX_VERTICAL_SWIPE) {
      isSwiping = false;
      return;
    }
    
    // Previeni lo scroll orizzontale durante lo swipe
    if (deltaX > 10) {
      event.preventDefault();
    }
  }
  
  function handleTouchEnd(event) {
    if (!get(isMobile) || !isSwiping || get(isSidebarOpen)) return;
    
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);
    const deltaTime = Date.now() - touchStartTime;
    
    // Verifica che sia uno swipe valido
    if (
      deltaX > SWIPE_THRESHOLD && // Swipe verso destra abbastanza lungo
      deltaY < MAX_VERTICAL_SWIPE && // Non troppo verticale
      deltaTime < 300 && // Veloce (meno di 300ms)
      touchStartX <= SWIPE_EDGE_THRESHOLD // Partito dal bordo sinistro
    ) {
      // Apri la sidebar
      isSidebarOpen.set(true);
    }
    
    isSwiping = false;
    touchStartX = 0;
    touchStartY = 0;
    touchStartTime = 0;
  }

  onMount(() => {
    // Se non c'è una chat corrente, creane una nuova
    currentChatId.subscribe(id => {
      if (!id) {
        createNewChat();
      }
    })();
    
    // Gestione incolla immagini con Ctrl+V
    const handlePaste = async (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      
      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      
      if (imageItems.length > 0) {
        event.preventDefault();
        
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file) {
            try {
              const preview = await readFileAsDataURL(file);
              attachedImages = [...attachedImages, { file, preview }];
            } catch (error) {
              logError('Error processing pasted image:', error);
            }
          }
        }
      }
    };
    
    // Aggiungi listener globale per l'incolla
    window.addEventListener('paste', handlePaste);
    
    // Chiudi menu mobile quando si clicca fuori
    function handleClickOutside(event) {
      if (mobileActionsRef && !mobileActionsRef.contains(event.target)) {
        showMobileActionsMenu = false;
      }
    }
    
    document.addEventListener('click', handleClickOutside);
    
    // Aggiungi listener per swipe su mobile
    // Usa tick per assicurarsi che l'elemento sia disponibile
    tick().then(() => {
      if (mainAreaElement) {
        mainAreaElement.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainAreaElement.addEventListener('touchmove', handleTouchMove, { passive: false });
        mainAreaElement.addEventListener('touchend', handleTouchEnd, { passive: true });
      }
    });
    
    // Scroll automatico quando arrivano nuovi messaggi
    const unsubscribe = currentChat.subscribe(async (chat) => {
      if (chat) {
        await tick();
        if (messagesContainer) {
          scrollToBottom();
        }
      }
    });
    
    // Monitor scroll per mostrare/nascondere pulsante scroll to top
    // Usa afterUpdate per assicurarsi che messagesContainer sia disponibile
    const setupScrollListener = () => {
      if (messagesContainer) {
        messagesContainer.addEventListener('scroll', handleScroll);
        return true;
      }
      return false;
    };
    
    // Prova a impostare il listener, se non è disponibile, riprova dopo un tick
    if (!setupScrollListener()) {
      tick().then(() => {
        setupScrollListener();
      });
    }
    
    
    // Inizializza i pulsanti di copia codice
    tick().then(() => {
      if (messagesContainer) {
        initCodeCopyButtons(messagesContainer);
      }
    });
    
    // Gestione tastiera virtuale su mobile
    let initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    
    function handleViewportResize() {
      if (!$isMobile) return;
      
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      // Se l'altezza è diminuita significativamente, probabilmente si è aperta la tastiera
      if (heightDifference > 150) {
        handleKeyboardOpen();
      } else if (heightDifference < 50 && currentHeight >= initialViewportHeight * 0.8) {
        // La tastiera potrebbe essere stata chiusa
        handleKeyboardClose();
      }
    }
    
    // Salva i riferimenti per il cleanup
    keyboardHandlers.handleTextareaFocus = handleTextareaFocus;
    keyboardHandlers.handleKeyboardClose = handleKeyboardClose;
    keyboardHandlers.handleViewportResize = handleViewportResize;
    
    // Aggiungi listener per il focus sul textarea
    tick().then(() => {
      if (textareaRef) {
        textareaRef.addEventListener('focus', handleTextareaFocus);
        textareaRef.addEventListener('blur', handleKeyboardClose);
      }
    });
    
    // Listener per resize viewport
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    } else {
      window.addEventListener('resize', handleViewportResize);
    }
    
    // Cleanup
    // Cleanup function
    return () => {
      window.removeEventListener('paste', handlePaste);
      document.removeEventListener('click', handleClickOutside);
      if (mainAreaElement) {
        mainAreaElement.removeEventListener('touchstart', handleTouchStart);
        mainAreaElement.removeEventListener('touchmove', handleTouchMove);
        mainAreaElement.removeEventListener('touchend', handleTouchEnd);
      }
      if (messagesContainer) {
        messagesContainer.removeEventListener('scroll', handleScroll);
        // Rimuovi listener per copia codice
        if (messagesContainer._copyButtonHandler) {
          messagesContainer.removeEventListener('click', messagesContainer._copyButtonHandler);
          delete messagesContainer._copyButtonHandler;
        }
      }
      if (textareaRef && keyboardHandlers.handleTextareaFocus) {
        textareaRef.removeEventListener('focus', keyboardHandlers.handleTextareaFocus);
        textareaRef.removeEventListener('blur', keyboardHandlers.handleKeyboardClose);
      }
      
      // Rimuovi listener viewport resize
      if (keyboardHandlers.handleViewportResize && 'visualViewport' in window) {
        window.visualViewport.removeEventListener('resize', keyboardHandlers.handleViewportResize);
      }
      if (keyboardHandlers.handleViewportResize) {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', keyboardHandlers.handleViewportResize);
        } else {
          window.removeEventListener('resize', keyboardHandlers.handleViewportResize);
        }
      }
      if (unsubscribe) unsubscribe();
    };
  });
  
  function handleScroll() {
    if (messagesContainer) {
      showScrollToTop = messagesContainer.scrollTop > 300;
    }
  }
  
  function scrollToBottom(smooth = true) {
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }
  
  // Throttled scroll per performance durante streaming
  const throttledScrollToBottom = throttle(() => {
    scrollToBottom(false);
  }, 100); // Max una volta ogni 100ms
  
  function scrollToTop() {
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }
  
  // Funzioni per gestione tastiera virtuale su mobile (ottimizzate)
  let keyboardHandlers = {
    handleTextareaFocus: null,
    handleKeyboardClose: null,
    handleViewportResize: null
  };
  
  let keyboardHeight = 0;
  let originalViewportHeight = 0;
  
  function handleKeyboardOpen() {
    if (!$isMobile) return;
    
    // Salva altezza viewport originale
    if (originalViewportHeight === 0) {
      originalViewportHeight = window.innerHeight;
    }
    
    // Calcola altezza tastiera
    const currentHeight = window.innerHeight;
    keyboardHeight = originalViewportHeight - currentHeight;
    
    // Scrolla per assicurarsi che l'input sia visibile
    setTimeout(() => {
      if (textareaRef) {
        // Usa scrollIntoView con opzioni ottimizzate
        textareaRef.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center', 
          inline: 'nearest' 
        });
      }
      // Scrolla anche i messaggi per mostrare l'input
      scrollToBottom(false);
    }, 200); // Ridotto da 300ms per risposta più veloce
  }
  
  function handleKeyboardClose() {
    if (!$isMobile) return;
    
    // Quando la tastiera si chiude, ripristina lo scroll
    setTimeout(() => {
      scrollToBottom(false);
      keyboardHeight = 0;
      // Ripristina viewport height se necessario
      if (originalViewportHeight > 0 && window.innerHeight >= originalViewportHeight * 0.9) {
        originalViewportHeight = 0;
      }
    }, 100);
  }
  
  function handleTextareaFocus() {
    if ($isMobile) {
      handleKeyboardOpen();
    }
  }
  
  // Gestione resize viewport (per tastiera virtuale)
  function handleViewportResize() {
    if (!$isMobile) return;
    
    const currentHeight = window.innerHeight;
    const heightDiff = originalViewportHeight - currentHeight;
    
    // Se la differenza è significativa (>150px), probabilmente la tastiera è aperta
    if (heightDiff > 150 && originalViewportHeight > 0) {
      keyboardHeight = heightDiff;
      handleKeyboardOpen();
    } else if (heightDiff < 50 && keyboardHeight > 0) {
      // Tastiera chiusa
      handleKeyboardClose();
    }
  }
  
  async function handleSubmit() {
    // Prevenzione invii multipli
    if ($isGenerating) {
      return;
    }
    
    // Le funzioni addMessage, updateMessage sono async ma non bloccanti
    // Chiamate senza await per non bloccare l'UI
    if (editingMessageIndex !== null) {
      handleEditSave();
      return;
    }
    
    const hasText = inputValue.trim().length > 0;
    const hasImages = attachedImages.length > 0;
    const hasMax = hasActiveSubscription() && $userStore.subscription?.plan === 'max';
    const hasPro = hasActiveSubscription() && $userStore.subscription?.plan === 'pro';
    const currentModel = $availableModels.find(m => m.id === $selectedModel);
    const allowsPremiumFeatures = currentModel?.allowsPremiumFeatures || false;
    
    // Se ci sono immagini, verifica abbonamento (Pro e Max possono usare immagini)
    // Oppure se il modello permette funzioni premium
    if (hasImages && !hasMax && !hasPro && !hasActiveSubscription() && !allowsPremiumFeatures) {
      isPremiumModalOpen.set(true);
      return;
    }
    
    if (!hasText) {
      return;
    }
    
    try {
      const chatId = $currentChatId || await createNewChat();
      
      const userMessage = { 
        type: 'user', 
        content: inputValue.trim() || '',
        timestamp: new Date().toISOString() 
      };
      
      addMessage(chatId, userMessage);
      const messageText = inputValue.trim();
      
      inputValue = '';
      attachedImages = [];
      
      await tick();
      scrollToBottom();
      
      isGenerating.set(true);
      
      // Crea AbortController per poter fermare la generazione
      const abortController = new AbortController();
      setAbortController(abortController);
      
      // Crea messaggio AI vuoto
      const aiMessageId = Date.now().toString();
      currentStreamingMessageId = aiMessageId;
      const aiMessage = { 
        id: aiMessageId,
        type: 'ai', 
        content: '', 
        timestamp: new Date().toISOString() 
      };
      addMessage(chatId, aiMessage);
      
      try {
        const currentChatData = get(currentChat);
        if (!currentChatData) {
          throw new Error('Chat corrente non disponibile');
        }
        
        const messageIndex = currentChatData.messages.length - 1;
        
        // Rileva se è una richiesta di generazione immagini
        const isImageRequest = isImageGenerationRequest(messageText);
        
        // Se è una richiesta di generazione immagini, usa Gemini Flash Image
        const modelToUse = isImageRequest ? 'gemini-2.5-flash-image' : effectiveModel;
        
        // Generazione testo normale
        let fullResponse = '';
        const chatHistory = currentChatData.messages.slice(0, -1); // Escludi il messaggio corrente
        
        // Ottieni il system prompt dalla chat se presente (per nebulini)
        const customSystemPrompt = currentChatData.systemPrompt || null;
        
        for await (const chunk of generateResponseStream(
          messageText, 
          modelToUse, 
          chatHistory,
          [],
          abortController,
          deepResearchEnabled,
          customSystemPrompt
        )) {
          fullResponse += chunk;
          // Aggiorna il messaggio in tempo reale SENZA normalizzazione (più veloce)
          updateMessage(chatId, messageIndex, { content: fullResponse });
          await tick();
          throttledScrollToBottom(); // Scroll throttled per performance
        }
        
        // Normalizza e salva la risposta finale (solo una volta alla fine)
        const normalizedFinalResponse = normalizeTextSpacing(fullResponse);
        updateMessage(chatId, messageIndex, { content: normalizedFinalResponse });
        
        currentStreamingMessageId = null;
        
      } catch (error) {
        logError('Error generating response:', error);
        
        // Rimuovi il messaggio vuoto se è stato interrotto
        const currentChatData = get(currentChat);
        if (currentStreamingMessageId && error.message && error.message.includes('interrotta')) {
          if (currentChatData && currentChatData.messages.length > 0) {
            await deleteMessage(chatId, currentChatData.messages.length - 1);
          }
        } else {
          const errorMsg = error?.message || get(t)('errorOccurred');
          if (currentChatData && currentChatData.messages.length > 0) {
            updateMessage(chatId, currentChatData.messages.length - 1, { 
              content: `❌ Errore: ${errorMsg}`
            });
          } else {
            // Se non c'è un messaggio AI, aggiungilo
            addMessage(chatId, {
              type: 'ai',
              content: `❌ Errore: ${errorMsg}`,
              timestamp: new Date().toISOString()
            });
          }
        }
        currentStreamingMessageId = null;
      } finally {
        isGenerating.set(false);
        setAbortController(null);
        await tick();
        scrollToBottom();
      }
    } catch (error) {
      logError('Error in handleSubmit:', error);
      // In caso di errore, resetta tutto
      isGenerating.set(false);
    }
  }
  
  function handleStop() {
    abortCurrentRequest();
    isGenerating.set(false);
  }
  
  function resizeTextarea() {
    if (textareaRef) {
      // Reset height per calcolare correttamente scrollHeight
      textareaRef.style.height = 'auto';
      // Calcola l'altezza necessaria basata sul contenuto
      const scrollHeight = textareaRef.scrollHeight;
      // Altezza minima quando vuoto, massima quando pieno
      const minHeight = inputValue.trim() === '' ? 24 : 24;
      const maxHeight = 200; // Altezza massima prima dello scroll
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.style.height = newHeight + 'px';
      
      // Aggiorna anche il wrapper per adattarsi
      if (textareaRef.parentElement) {
        const wrapper = textareaRef.closest('.input-wrapper');
        if (wrapper) {
          wrapper.style.minHeight = newHeight + 'px';
        }
      }
    }
  }
  
  function handleKeyPress(event) {
    // Shift+Enter per nuova riga, Enter per inviare
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      handleSubmit();
    }
    // Auto-resize textarea dopo il keypress
    setTimeout(() => resizeTextarea(), 0);
  }
  
  function handleInputResize() {
    resizeTextarea();
  }
  
  // Funzioni per gestione messaggi
  async function handleCopyMessage(messageIndex) {
    const message = messages[messageIndex];
    if (message && message.content) {
      await navigator.clipboard.writeText(message.content);
      // Potresti mostrare un toast qui
    }
  }
  
  function handleEditMessage(messageIndex) {
    const message = messages[messageIndex];
    if (message && message.type === 'user') {
      editingMessageIndex = messageIndex;
      inputValue = message.content;
      if (textareaRef) {
        textareaRef.focus();
        handleInputResize();
      }
      scrollToBottom();
    }
  }
  
  async function handleEditSave() {
    if (editingMessageIndex === null) return;
    
    const chatId = $currentChatId;
    if (!chatId || !inputValue.trim()) return;
    
    // Aggiorna il messaggio
    updateMessage(chatId, editingMessageIndex, { content: inputValue.trim() });
    
    // Salva l'indice prima di resettarlo
    const savedIndex = editingMessageIndex;
    
    // Elimina tutti i messaggi dopo quello modificato
    const messagesToDelete = messages.length - editingMessageIndex - 1;
    for (let i = 0; i < messagesToDelete; i++) {
      deleteMessage(chatId, editingMessageIndex + 1);
    }
    
    editingMessageIndex = null;
    inputValue = '';
    
    // Rigenera la risposta se c'era una risposta AI dopo
    await tick();
    const currentMessages = $currentChat?.messages || [];
    if (currentMessages[savedIndex + 1]?.type === 'ai' || currentMessages.length === savedIndex + 1) {
      handleRegenerateMessage(savedIndex);
    }
  }
  
  function handleEditCancel() {
    editingMessageIndex = null;
    inputValue = '';
    if (textareaRef) {
      handleInputResize();
    }
  }
  
  async function handleRegenerateMessage(messageIndex, styleModifier = null) {
    const chatId = $currentChatId;
    if (!chatId) return;
    
    // Elimina la risposta AI corrente e tutte le successive
    const messagesToDelete = messages.length - messageIndex - 1;
    for (let i = 0; i < messagesToDelete; i++) {
      deleteMessage(chatId, messageIndex + 1);
    }
    
    // Ottieni il messaggio utente precedente
    const userMessage = messages[messageIndex];
    if (userMessage && userMessage.type === 'user') {
      await tick();
      
      isGenerating.set(true);
      const abortController = new AbortController();
      setAbortController(abortController);
      
      const aiMessageId = Date.now().toString();
      currentStreamingMessageId = aiMessageId;
      const aiMessage = { 
        id: aiMessageId,
        type: 'ai', 
        content: '', 
        timestamp: new Date().toISOString() 
      };
      addMessage(chatId, aiMessage);
      
      try {
        let fullResponse = '';
        const chatHistory = messages.slice(0, messageIndex + 1);
        
        // Aggiungi un messaggio utente nascosto con la richiesta di modifica dello stile
        let modifiedHistory = chatHistory.slice(0, -1);
        if (styleModifier === 'moreDetailed') {
          modifiedHistory = [...modifiedHistory, {
            type: 'user',
            content: 'Per favore, rispondi in modo più dettagliato e approfondito, fornendo maggiori informazioni e spiegazioni.',
            hidden: true,
            timestamp: new Date().toISOString()
          }, userMessage];
        } else if (styleModifier === 'moreSimple') {
          modifiedHistory = [...modifiedHistory, {
            type: 'user',
            content: 'Per favore, rispondi in modo più semplice e conciso, evitando tecnicismi e usando un linguaggio più accessibile.',
            hidden: true,
            timestamp: new Date().toISOString()
          }, userMessage];
        } else {
          // Se non c'è modificatore, usa la cronologia normale
          modifiedHistory = chatHistory;
        }
        
        // Ottieni il system prompt dalla chat se presente (per nebulini)
        const currentChatDataForRegen = get(currentChat);
        const customSystemPromptForRegen = currentChatDataForRegen?.systemPrompt || null;
        
        for await (const chunk of generateResponseStream(
          userMessage.content,
          effectiveModel,
          styleModifier ? modifiedHistory.slice(0, -1) : chatHistory.slice(0, -1),
          [],
          abortController,
          deepResearchEnabled,
          customSystemPromptForRegen
        )) {
          fullResponse += chunk;
          // Aggiorna senza normalizzazione durante streaming (più veloce)
          const currentChatData = get(currentChat);
          if (currentChatData && currentChatData.messages.length > 0) {
            updateMessage(chatId, currentChatData.messages.length - 1, { content: fullResponse });
          }
          await tick();
          throttledScrollToBottom();
        }
        
        // Normalizza e salva la risposta finale (solo una volta alla fine)
        const normalizedFinalResponse = normalizeTextSpacing(fullResponse);
        const currentChatData = get(currentChat);
        if (currentChatData && currentChatData.messages.length > 0) {
          updateMessage(chatId, currentChatData.messages.length - 1, { content: normalizedFinalResponse });
        }
        currentStreamingMessageId = null;
        
      } catch (error) {
        logError('Error regenerating response:', error);
        const currentChatData = get(currentChat);
        if (currentStreamingMessageId && error?.message && error.message.includes('interrotta')) {
          if (currentChatData && currentChatData.messages.length > 0) {
            deleteMessage(chatId, currentChatData.messages.length - 1);
          }
        } else {
          const errorMsg = error?.message || 'Errore sconosciuto';
          if (currentChatData && currentChatData.messages.length > 0) {
            updateMessage(chatId, currentChatData.messages.length - 1, { 
              content: `❌ Errore: ${errorMsg}`
            });
          } else {
            // Se non c'è un messaggio AI, aggiungilo
            addMessage(chatId, {
              type: 'ai',
              content: `❌ Errore: ${errorMsg}`,
              timestamp: new Date().toISOString()
            });
          }
        }
        currentStreamingMessageId = null;
      } finally {
        isGenerating.set(false);
        setAbortController(null);
        await tick();
        scrollToBottom();
      }
    }
  }
  
  function handleDeleteMessage(messageIndex) {
    const chatId = $currentChatId;
    if (chatId) {
      deleteMessage(chatId, messageIndex);
    }
  }
  
  function handleReadAloud(messageIndex) {
    const message = messages[messageIndex];
    if (message && message.content && message.type === 'ai') {
      // Rimuovi markdown e HTML per ottenere testo puro
      const textContent = message.content
        .replace(/```[\s\S]*?```/g, '') // Rimuovi blocchi di codice
        .replace(/`[^`]+`/g, '') // Rimuovi codice inline
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Rimuovi link markdown
        .replace(/#{1,6}\s+/g, '') // Rimuovi header markdown
        .replace(/\*\*([^\*]+)\*\*/g, '$1') // Rimuovi bold
        .replace(/\*([^\*]+)\*/g, '$1') // Rimuovi italic
        .replace(/<[^>]+>/g, '') // Rimuovi HTML tags
        .trim();
      
      if (textContent && 'speechSynthesis' in window) {
        // Ferma qualsiasi sintesi vocale in corso
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(textContent);
        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        window.speechSynthesis.speak(utterance);
      } else {
        showAlert('La sintesi vocale non è disponibile nel tuo browser.', 'Sintesi vocale non disponibile', 'OK', 'warning');
      }
    }
  }
  
  async function handleReportMessage(messageIndex) {
    const message = messages[messageIndex];
    if (message && message.type === 'ai') {
      const reason = await showPrompt(
        'Perché vuoi segnalare questo messaggio?\n\n1. Contenuto inappropriato\n2. Informazioni errate\n3. Altro\n\nInserisci il motivo:',
        'Segnala messaggio',
        '',
        'Inserisci il motivo della segnalazione',
        'Segnala',
        'Annulla',
        'textarea'
      );
      if (reason) {
        // Qui potresti inviare la segnalazione a un server
        // Messaggio segnalato (logging solo in dev)
        if (import.meta.env.DEV) {
          console.log('Messaggio segnalato:', {
            messageIndex,
            messageId: message.id,
            content: message.content,
            reason: reason
          });
        }
        await showAlert('Grazie per la segnalazione. Il messaggio è stato segnalato.', 'Segnalazione inviata', 'OK', 'success');
      }
    }
  }
  
  function handleMessageFeedback(messageIndex, type) {
    // Qui puoi implementare il salvataggio del feedback
    // Feedback (logging solo in dev)
    if (import.meta.env.DEV) {
      console.log('Feedback:', { messageIndex, type });
    }
  }
  
  function handleAttachFile() {
    fileInput?.click();
  }
  
  function handleAttachImage() {
    imageInput?.click();
  }
  
  function handleClearContext() {
    if (visibleMessages.length === 0) {
      return;
    }
    showPrompt(
      'Sei sicuro di voler pulire il contesto della chat? Tutti i messaggi verranno eliminati.',
      'Pulisci contesto',
      async () => {
        const chatId = $currentChatId;
        if (chatId) {
          const allChats = get(chats);
          const chat = allChats.find(c => c.id === chatId);
          if (chat) {
            chat.messages = [];
            chats.set(allChats);
            await saveChatsToStorage();
            await tick();
            scrollToBottom();
          }
        }
      },
      'Pulisci',
      'Annulla'
    );
  }
  
  function handleToggleWebSearch() {
    webSearchEnabled = !webSearchEnabled;
    if (webSearchEnabled) {
      showAlert('Ricerca web attivata: l\'AI può accedere a informazioni in tempo reale dal web', 'Web Search', 'OK', 'success');
    } else {
      showAlert('Ricerca web disattivata', 'Web Search', 'OK', 'info');
    }
  }
  
  // Funzione per rilevare se il messaggio contiene una richiesta di generazione immagini
  function isImageGenerationRequest(message) {
    if (!message || typeof message !== 'string') return false;
    
    const lowerMessage = message.toLowerCase().trim();
    
    // Pattern per rilevare richieste di generazione immagini
    const imageGenerationPatterns = [
      /genera\s+(un'?|una|un)?\s*immagine/i,
      /crea\s+(un'?|una|un)?\s*immagine/i,
      /fai\s+(un'?|una|un)?\s*immagine/i,
      /disegna\s+(un'?|una|un)?\s*immagine/i,
      /realizza\s+(un'?|una|un)?\s*immagine/i,
      /produci\s+(un'?|una|un)?\s*immagine/i,
      /immagina\s+(un'?|una|un)?/i,
      /genera\s+immagini/i,
      /crea\s+immagini/i,
      /fai\s+immagini/i,
      /disegna\s+immagini/i,
      /generate\s+(an?|the)?\s*image/i,
      /create\s+(an?|the)?\s*image/i,
      /make\s+(an?|the)?\s*image/i,
      /draw\s+(an?|the)?\s*image/i,
      /generate\s+images/i,
      /create\s+images/i,
      /make\s+images/i,
      /draw\s+images/i
    ];
    
    return imageGenerationPatterns.some(pattern => pattern.test(lowerMessage));
  }
  
  // Determina il modello da usare: se web search è attivo, usa il modello search, 
  // se è una richiesta di generazione immagini usa Gemini Flash Image, altrimenti quello selezionato
  $: effectiveModel = webSearchEnabled 
    ? 'gpt-4o-mini-search-preview-2025-03-11' 
    : $selectedModel;
  
  async function handleImageSelect(event) {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Carica le immagini senza mostrare il modal premium
    for (const file of imageFiles) {
      const preview = await readFileAsDataURL(file);
      attachedImages = [...attachedImages, { 
        file, 
        preview,
        style: null,
        description: ''
      }];
    }
    
    // Reset input per permettere di selezionare di nuovo lo stesso file
    if (imageInput) {
      imageInput.value = '';
    }
  }
  
  async function handleFileSelect(event) {
    const files = Array.from(event.target.files || []);
    // Gestisci file generici (non immagini)
    const nonImageFiles = files.filter(file => !file.type.startsWith('image/'));
    
    if (nonImageFiles.length > 0) {
      // Per ora mostra un alert, in futuro si potrà implementare l'upload
      showAlert('Caricamento file generici - Funzionalità in arrivo', 'Info', 'OK', 'info');
    }
    
    // Reset input per permettere di selezionare di nuovo lo stesso file
    if (fileInput) {
      fileInput.value = '';
    }
  }
  
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  function removeImage(index) {
    attachedImages = attachedImages.filter((_, i) => i !== index);
    if (selectedImageIndex === index) {
      selectedImageIndex = null;
      showImageStyles = false;
      imageDescription = '';
    }
  }
  
  function openImageStyles(index) {
    selectedImageIndex = index;
    showImageStyles = true;
    imageDescription = attachedImages[index]?.description || '';
  }
  
  function applyImageStyle(styleId) {
    if (selectedImageIndex !== null && attachedImages[selectedImageIndex]) {
      attachedImages[selectedImageIndex].style = styleId;
      attachedImages = [...attachedImages]; // Trigger reactivity
    }
  }
  
  function handleCreateImage() {
    if (attachedImages.length > 0) {
      const targetIndex = selectedImageIndex !== null ? selectedImageIndex : 0;
      const image = attachedImages[targetIndex];
      if (image && image.style) {
        // Qui implementeresti la chiamata API per modificare l'immagine
        // Creating image with style (logging solo in dev)
        if (import.meta.env.DEV) {
          console.log('Creating image with style:', {
            image: image.preview,
            style: image.style,
            description: image.description || imageDescription
          });
        }
        showAlert(`Immagine modificata con stile: ${imageStyles.find(s => s.id === image.style)?.name}`, 'Immagine modificata', 'OK', 'success');
      } else {
        showAlert('Seleziona uno stile prima di creare', 'Stile non selezionato', 'OK', 'warning');
        showImageStyles = true;
        if (selectedImageIndex === null && attachedImages.length > 0) {
          selectedImageIndex = 0;
        }
      }
    }
  }
  
  function closeImageStyles() {
    showImageStyles = false;
    selectedImageIndex = null;
  }
  
  // Funzioni per export chat
  let showExportMenu = false;
  let exportMenuRef;
  
  function exportChat(format = 'txt') {
    const chat = $currentChat;
    if (!chat || messages.length === 0) return;
    
    // Verifica se l'utente ha abbonamento Pro per esportazione avanzata
    const hasPro = hasActiveSubscription() && $userStore.subscription?.plan === 'pro';
    const currentModel = $availableModels.find(m => m.id === $selectedModel);
    const allowsPremiumFeatures = currentModel?.allowsPremiumFeatures || false;
    const isAdvancedFormat = format === 'pdf' || format === 'json';
    
    if (isAdvancedFormat && !hasPro && !allowsPremiumFeatures) {
      showAlert('L\'esportazione in ' + format.toUpperCase() + ' è disponibile solo per utenti Pro. Aggiorna il tuo piano per accedere a questa funzionalità.', 'Funzionalità Premium', 'OK', 'warning');
      isPremiumModalOpen.set(true);
      return;
    }
    
    if (format === 'json') {
      const exportData = {
        chat: {
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          isTemporary: chat.isTemporary || false
        },
        messages: visibleMessages.map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp || msg.createdAt,
          hidden: msg.hidden || false
        })),
        exportInfo: {
          exportDate: new Date().toISOString(),
          exportVersion: '1.0',
          appName: 'Nebula AI'
        }
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chat.title || 'chat'}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Chat esportata come JSON!');
      return;
    }
    
    if (format === 'pdf') {
      // Crea un documento HTML per il PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showAlert('Impossibile aprire la finestra di stampa. Verifica che i popup non siano bloccati.', 'Errore', 'OK', 'error');
        return;
      }
      
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${chat.title || 'Chat Export'}</title>
          <style>
            @media print {
              @page {
                margin: 2cm;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #2563eb;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 10px;
            }
            .meta {
              color: #666;
              font-size: 14px;
              margin-bottom: 30px;
            }
            .message {
              margin-bottom: 30px;
              padding: 15px;
              border-radius: 8px;
            }
            .message-user {
              background-color: #f3f4f6;
              border-left: 4px solid #2563eb;
            }
            .message-ai {
              background-color: #eff6ff;
              border-left: 4px solid #10b981;
            }
            .message-role {
              font-weight: 600;
              margin-bottom: 10px;
              color: #1f2937;
            }
            .message-content {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .separator {
              height: 1px;
              background: #e5e7eb;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h1>${chat.title || 'Nebula AI Chat'}</h1>
          <div class="meta">
            <p><strong>Data creazione:</strong> ${new Date(chat.createdAt).toLocaleString('it-IT')}</p>
            <p><strong>Data esportazione:</strong> ${new Date().toLocaleString('it-IT')}</p>
            <p><strong>Numero messaggi:</strong> ${visibleMessages.length}</p>
          </div>
      `;
      
      visibleMessages.forEach((msg, index) => {
        const role = msg.type === 'user' ? 'User' : 'Nebula AI';
        const messageClass = msg.type === 'user' ? 'message-user' : 'message-ai';
        const escapedContent = msg.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
          .replace(/\n/g, '<br>');
        
        htmlContent += `
          <div class="message ${messageClass}">
            <div class="message-role">${role}</div>
            <div class="message-content">${escapedContent}</div>
          </div>
        `;
        
        if (index < visibleMessages.length - 1) {
          htmlContent += '<div class="separator"></div>';
        }
      });
      
      htmlContent += `
        </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Attendi che il contenuto sia caricato prima di stampare
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          showSuccess('Chat pronta per l\'esportazione PDF!');
        }, 250);
      };
      
      return;
    }
    
    // Formati Markdown e TXT (disponibili per tutti)
    let content = `Nebula AI Chat Export\n`;
    content += `Title: ${chat.title}\n`;
    content += `Date: ${new Date(chat.createdAt).toLocaleString()}\n`;
    content += `${'='.repeat(50)}\n\n`;
    
    if (format === 'markdown') {
      visibleMessages.forEach(msg => {
        const role = msg.type === 'user' ? '**User**' : '**Nebula AI**';
        content += `${role}\n\n${msg.content}\n\n---\n\n`;
      });
    } else {
      visibleMessages.forEach(msg => {
        const role = msg.type === 'user' ? 'User' : 'Nebula AI';
        content += `[${role}]\n${msg.content}\n\n`;
      });
    }
    
    const blob = new Blob([content], { type: format === 'markdown' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title || 'chat'}-${Date.now()}.${format === 'markdown' ? 'md' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess(`Chat esportata come ${format === 'markdown' ? 'Markdown' : 'TXT'}!`);
  }
  
  function toggleExportMenu() {
    showExportMenu = !showExportMenu;
  }
  
  function handleExportOption(format) {
    exportChat(format);
    showExportMenu = false;
  }
  
  // Funzione per ricerca nella chat corrente
  function handleSearchInput(value) {
    searchQuery = value;
    if (searchQuery && visibleMessages.length > 0) {
      // Trova il primo messaggio visibile che corrisponde
      const index = visibleMessages.findIndex(msg => 
        msg.content && msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (index !== -1) {
        highlightedMessageIndex = index;
        setTimeout(() => {
          const messageElements = messagesContainer?.querySelectorAll('.message');
          if (messageElements && messageElements[index]) {
            messageElements[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        highlightedMessageIndex = null;
      }
    } else {
      highlightedMessageIndex = null;
    }
  }
  
  function toggleSearchBar() {
    showSearchBar = !showSearchBar;
    if (!showSearchBar) {
      searchQuery = '';
      highlightedMessageIndex = null;
    } else if (textareaRef || inputRef) {
      // Focus sulla search bar dopo un breve delay
      setTimeout(() => {
        const searchInput = document.querySelector('.chat-search-input');
        if (searchInput) searchInput.focus();
      }, 100);
    }
  }
  
</script>

<main class="main-area" bind:this={mainAreaElement}>
  <TopBar on:openAuth={handleOpenAuth} />
  {#if showErrorBanner}
    <div class="error-banner">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{errorMessage}</span>
      <button class="error-close" on:click={() => showErrorBanner = false}>×</button>
    </div>
  {/if}
  
  {#if $isIncognitoMode}
    <div class="incognito-chat-banner">
      <div class="incognito-banner-content">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.52148 15.1664C4.61337 14.8108 4.39951 14.4478 4.04395 14.3559C3.73281 14.2756 3.41605 14.4295 3.28027 14.7074L3.2334 14.8334C3.13026 15.2324 3.0046 15.6297 2.86133 16.0287L2.71289 16.4281C2.63179 16.6393 2.66312 16.8775 2.79688 17.06C2.93067 17.2424 3.14825 17.3443 3.37402 17.3305L3.7793 17.3002C4.62726 17.2265 5.44049 17.0856 6.23438 16.8764C6.84665 17.1788 7.50422 17.4101 8.19434 17.558C8.55329 17.6348 8.9064 17.4062 8.9834 17.0473C9.06036 16.6882 8.83177 16.3342 8.47266 16.2572C7.81451 16.1162 7.19288 15.8862 6.62305 15.5815C6.50913 15.5206 6.38084 15.4946 6.25391 15.5053L6.12793 15.5277C5.53715 15.6955 4.93256 15.819 4.30566 15.9027C4.33677 15.8053 4.36932 15.7081 4.39844 15.6098L4.52148 15.1664Z"></path>
          <path d="M15.7998 14.5365C15.5786 14.3039 15.2291 14.2666 14.9668 14.4301L14.8604 14.5131C13.9651 15.3633 12.8166 15.9809 11.5273 16.2572C11.1682 16.3342 10.9396 16.6882 11.0166 17.0473C11.0936 17.4062 11.4467 17.6348 11.8057 17.558C13.2388 17.2509 14.5314 16.5858 15.5713 15.6645L15.7754 15.477C16.0417 15.2241 16.0527 14.8028 15.7998 14.5365Z"></path>
          <path d="M2.23828 7.58927C1.97668 8.34847 1.83496 9.15958 1.83496 10.0004C1.835 10.736 1.94324 11.4483 2.14551 12.1234L2.23828 12.4106C2.35793 12.7576 2.73588 12.9421 3.08301 12.8227C3.3867 12.718 3.56625 12.4154 3.52637 12.1088L3.49512 11.977C3.2808 11.3549 3.16508 10.6908 3.16504 10.0004C3.16504 9.30977 3.28072 8.64514 3.49512 8.02286C3.61476 7.67563 3.43024 7.2968 3.08301 7.17716C2.73596 7.05778 2.35799 7.24232 2.23828 7.58927Z"></path>
          <path d="M16.917 12.8227C17.2641 12.9421 17.6421 12.7576 17.7617 12.4106C18.0233 11.6515 18.165 10.8411 18.165 10.0004C18.165 9.15958 18.0233 8.34847 17.7617 7.58927C17.642 7.24231 17.264 7.05778 16.917 7.17716C16.5698 7.2968 16.3852 7.67563 16.5049 8.02286C16.7193 8.64514 16.835 9.30977 16.835 10.0004C16.8349 10.6908 16.7192 11.3549 16.5049 11.977C16.3852 12.3242 16.5698 12.703 16.917 12.8227Z"></path>
          <path d="M8.9834 2.95255C8.90632 2.59374 8.55322 2.3651 8.19434 2.44181C6.76126 2.74892 5.46855 3.41405 4.42871 4.33536L4.22461 4.52286C3.95829 4.77577 3.94729 5.19697 4.2002 5.46329C4.42146 5.69604 4.77088 5.73328 5.0332 5.56973L5.13965 5.4877C6.03496 4.63748 7.18337 4.0189 8.47266 3.74259C8.83177 3.66563 9.06036 3.31166 8.9834 2.95255Z"></path>
          <path d="M15.5713 4.33536C14.5314 3.41405 13.2387 2.74892 11.8057 2.44181C11.4468 2.3651 11.0937 2.59374 11.0166 2.95255C10.9396 3.31166 11.1682 3.66563 11.5273 3.74259C12.7361 4.00163 13.8209 4.56095 14.6895 5.33048L14.8604 5.4877L14.9668 5.56973C15.2291 5.73327 15.5785 5.69604 15.7998 5.46329C16.0211 5.23026 16.0403 4.87903 15.8633 4.6254L15.7754 4.52286L15.5713 4.33536Z"></path>
        </svg>
        <div class="incognito-banner-text">
          <strong>Modalità Incognito attiva</strong>
          <span class="incognito-banner-subtitle">Le chat non verranno salvate nel database</span>
        </div>
      </div>
    </div>
  {/if}
  
  {#if showSearchBar}
    <div class="search-bar">
      <input
        type="text"
        class="chat-search-input"
        placeholder={$t('searchInChat')}
        bind:value={searchQuery}
        on:input={(e) => handleSearchInput(e.target.value)}
      />
      <button class="search-close" on:click={toggleSearchBar} title="Chiudi ricerca">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  {/if}
  
  {#if showTokenCounter && visibleMessages.length > 0}
    <div class="token-counter" class:token-warning={tokenWarning}>
      <div class="token-info">
        <span class="token-label">
          {$t('tokens')}: {currentChatTokens.toLocaleString()} / {maxTokens === Infinity ? $t('unlimited') : maxTokens.toLocaleString()}
        </span>
        {#if maxTokens !== Infinity}
          <div class="token-bar">
            <div class="token-bar-fill" style="width: {Math.min(tokenUsagePercentage, 100)}%"></div>
          </div>
        {/if}
      </div>
      <button class="token-counter-toggle" on:click={() => showTokenCounter = false} title={$t('close')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  {:else if visibleMessages.length > 0}
    <button class="token-counter-show" on:click={() => showTokenCounter = true} title={$t('tokens')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </button>
  {/if}
  
  <div class="messages-container" bind:this={messagesContainer}>
    {#if isLoadingChat}
      <div class="loading-messages">
        {#each Array(3) as _, i}
          <div class="message-skeleton-wrapper" class:user={i % 2 === 0}>
            <Skeleton variant="message" />
          </div>
        {/each}
      </div>
    {:else if visibleMessages.length === 0}
      <div class="welcome-message">
        <div class="welcome-content">
          <div class="welcome-header">
            <div class="welcome-text-section">
              <h1 class="welcome-title">{$t('welcomeTitle')}</h1>
              <p class="welcome-subtitle">{@html $t('welcomeSubtitle')}</p>
            </div>
            <div class="welcome-logo">
              <img src="/logo.png" alt="Nebula AI" />
            </div>
          </div>
          
          {#if showPrivacyCard}
            <div class="privacy-card" on:click={() => isPrivacyModalOpen = true} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && (isPrivacyModalOpen = true)}>
              <div class="privacy-card-header">
                <div class="privacy-card-title-wrapper">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" class="privacy-icon-header">
                    <path d="M4.52148 15.1664C4.61337 14.8108 4.39951 14.4478 4.04395 14.3559C3.73281 14.2756 3.41605 14.4295 3.28027 14.7074L3.2334 14.8334C3.13026 15.2324 3.0046 15.6297 2.86133 16.0287L2.71289 16.4281C2.63179 16.6393 2.66312 16.8775 2.79688 17.06C2.93067 17.2424 3.14825 17.3443 3.37402 17.3305L3.7793 17.3002C4.62726 17.2265 5.44049 17.0856 6.23438 16.8764C6.84665 17.1788 7.50422 17.4101 8.19434 17.558C8.55329 17.6348 8.9064 17.4062 8.9834 17.0473C9.06036 16.6882 8.83177 16.3342 8.47266 16.2572C7.81451 16.1162 7.19288 15.8862 6.62305 15.5815C6.50913 15.5206 6.38084 15.4946 6.25391 15.5053L6.12793 15.5277C5.53715 15.6955 4.93256 15.819 4.30566 15.9027C4.33677 15.8053 4.36932 15.7081 4.39844 15.6098L4.52148 15.1664Z"></path>
                    <path d="M15.7998 14.5365C15.5786 14.3039 15.2291 14.2666 14.9668 14.4301L14.8604 14.5131C13.9651 15.3633 12.8166 15.9809 11.5273 16.2572C11.1682 16.3342 10.9396 16.6882 11.0166 17.0473C11.0936 17.4062 11.4467 17.6348 11.8057 17.558C13.2388 17.2509 14.5314 16.5858 15.5713 15.6645L15.7754 15.477C16.0417 15.2241 16.0527 14.8028 15.7998 14.5365Z"></path>
                    <path d="M2.23828 7.58927C1.97668 8.34847 1.83496 9.15958 1.83496 10.0004C1.835 10.736 1.94324 11.4483 2.14551 12.1234L2.23828 12.4106C2.35793 12.7576 2.73588 12.9421 3.08301 12.8227C3.3867 12.718 3.56625 12.4154 3.52637 12.1088L3.49512 11.977C3.2808 11.3549 3.16508 10.6908 3.16504 10.0004C3.16504 9.30977 3.28072 8.64514 3.49512 8.02286C3.61476 7.67563 3.43024 7.2968 3.08301 7.17716C2.73596 7.05778 2.35799 7.24232 2.23828 7.58927Z"></path>
                    <path d="M16.917 12.8227C17.2641 12.9421 17.6421 12.7576 17.7617 12.4106C18.0233 11.6515 18.165 10.8411 18.165 10.0004C18.165 9.15958 18.0233 8.34847 17.7617 7.58927C17.642 7.24231 17.264 7.05778 16.917 7.17716C16.5698 7.2968 16.3852 7.67563 16.5049 8.02286C16.7193 8.64514 16.835 9.30977 16.835 10.0004C16.8349 10.6908 16.7192 11.3549 16.5049 11.977C16.3852 12.3242 16.5698 12.703 16.917 12.8227Z"></path>
                    <path d="M8.9834 2.95255C8.90632 2.59374 8.55322 2.3651 8.19434 2.44181C6.76126 2.74892 5.46855 3.41405 4.42871 4.33536L4.22461 4.52286C3.95829 4.77577 3.94729 5.19697 4.2002 5.46329C4.42146 5.69604 4.77088 5.73328 5.0332 5.56973L5.13965 5.4877C6.03496 4.63748 7.18337 4.0189 8.47266 3.74259C8.83177 3.66563 9.06036 3.31166 8.9834 2.95255Z"></path>
                    <path d="M15.5713 4.33536C14.5314 3.41405 13.2387 2.74892 11.8057 2.44181C11.4468 2.3651 11.0937 2.59374 11.0166 2.95255C10.9396 3.31166 11.1682 3.66563 11.5273 3.74259C12.7361 4.00163 13.8209 4.56095 14.6895 5.33048L14.8604 5.4877L14.9668 5.56973C15.2291 5.73327 15.5785 5.69604 15.7998 5.46329C16.0211 5.23026 16.0403 4.87903 15.8633 4.6254L15.7754 4.52286L15.5713 4.33536Z"></path>
                  </svg>
                  <span class="privacy-card-title">Qualunque cosa mi chiedi è:</span>
                </div>
                <button class="privacy-card-close" on:click|stopPropagation={() => showPrivacyCard = false} title="Chiudi">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div class="privacy-features">
                <div class="privacy-feature">
                  <div class="privacy-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M9 12l2 2 4-4"/>
                    </svg>
                  </div>
                  <h3 class="privacy-feature-title">Privata</h3>
                  <p class="privacy-feature-description">A differenza di altri assistenti, non registro le nostre conversazioni.</p>
                </div>
                <div class="privacy-feature">
                  <div class="privacy-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h3 class="privacy-feature-title">Protetta</h3>
                  <p class="privacy-feature-description">Le tue conversazioni sono crittografate e sicure.</p>
                </div>
                <div class="privacy-feature">
                  <div class="privacy-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M9 12l2 2 4-4"/>
                    </svg>
                  </div>
                  <h3 class="privacy-feature-title">Trattato con rispetto</h3>
                  <p class="privacy-feature-description">Le nostre conversazioni non vengono mai usate per l'addestramento.</p>
                </div>
              </div>
              <div class="privacy-card-footer">
                <span class="privacy-card-link">Scopri di più</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
    
    {#each visibleMessages as message, index (message.id || index)}
      <div 
        class="message" 
        class:user-message={message.type === 'user'} 
        class:ai-message={message.type === 'ai'}
        class:highlighted={highlightedMessageIndex === index && searchQuery}
      >
        {#if message.images && message.images.length > 0}
          <div class="message-images">
            {#each message.images as image}
              <img src={image.url} alt={image.name} class="message-image" on:click={() => window.open(image.url, '_blank')} />
            {/each}
          </div>
        {/if}
        {#if message.content}
          <div class="message-content">
            {#if message.type === 'ai'}
              {@html renderMarkdown(message.content)}
              {#if currentStreamingMessageId === message.id && message.content.trim().length < 50}
                <div class="typing-indicator-inline">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              {/if}
            {:else}
              {message.content}
            {/if}
          </div>
        {:else if message.type === 'ai' && currentStreamingMessageId === message.id}
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        {/if}
        <MessageActions 
          messageIndex={index}
          messageType={message.type}
          on:copy={() => handleCopyMessage(index)}
          on:edit={() => handleEditMessage(index)}
          on:regenerate={() => {
            // Trova il messaggio utente precedente nell'array messages completo
            const currentMessage = visibleMessages[index];
            const messageId = currentMessage?.id;
            if (messageId) {
              const messageIndexInFull = messages.findIndex(m => m.id === messageId);
              if (messageIndexInFull >= 0) {
                // Cerca indietro per trovare il messaggio utente
                for (let i = messageIndexInFull - 1; i >= 0; i--) {
                  if (messages[i].type === 'user' && !messages[i].hidden) {
                    handleRegenerateMessage(i);
                    return;
                  }
                }
              }
            }
          }}
          on:moreDetailed={() => {
            // Trova il messaggio utente precedente nell'array messages completo
            const currentMessage = visibleMessages[index];
            const messageId = currentMessage?.id;
            if (messageId) {
              const messageIndexInFull = messages.findIndex(m => m.id === messageId);
              if (messageIndexInFull >= 0) {
                // Cerca indietro per trovare il messaggio utente
                for (let i = messageIndexInFull - 1; i >= 0; i--) {
                  if (messages[i].type === 'user' && !messages[i].hidden) {
                    handleRegenerateMessage(i, 'moreDetailed');
                    return;
                  }
                }
              }
            }
          }}
          on:moreSimple={() => {
            // Trova il messaggio utente precedente nell'array messages completo
            const currentMessage = visibleMessages[index];
            const messageId = currentMessage?.id;
            if (messageId) {
              const messageIndexInFull = messages.findIndex(m => m.id === messageId);
              if (messageIndexInFull >= 0) {
                // Cerca indietro per trovare il messaggio utente
                for (let i = messageIndexInFull - 1; i >= 0; i--) {
                  if (messages[i].type === 'user' && !messages[i].hidden) {
                    handleRegenerateMessage(i, 'moreSimple');
                    return;
                  }
                }
              }
            }
          }}
          on:delete={() => handleDeleteMessage(index)}
          on:feedback={(e) => handleMessageFeedback(index, e.detail.type)}
          on:readAloud={() => handleReadAloud(index)}
          on:report={() => handleReportMessage(index)}
        />
      </div>
    {/each}
    
    {#if $isGenerating && !currentStreamingMessageId}
      <div class="message ai-message">
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    {/if}
  </div>
  
  {#if showScrollToTop}
    <button 
      class="scroll-to-top" 
      on:click={scrollToTop} 
      title="Torna all'inizio"
      aria-label="Torna all'inizio della conversazione"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 15l-6-6-6 6"/>
      </svg>
    </button>
  {/if}
  
  {#if $isGenerating}
    <div class="generation-progress" role="status" aria-live="polite">
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <span class="progress-text">Generazione in corso...</span>
    </div>
  {/if}
  
  {#if $isMobile}
    <div class="input-toolbar mobile-toolbar">
      <button 
        class="toolbar-button" 
        on:click={toggleSearchBar}
        title="Cerca nella chat"
        class:active={showSearchBar}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
      </button>
      <div class="export-button-wrapper" bind:this={exportMenuRef}>
        <button 
          class="toolbar-button" 
          on:click={toggleExportMenu}
          title="Esporta chat"
          disabled={messages.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        {#if showExportMenu && messages.length > 0}
          <div class="export-menu">
            <button class="export-option" on:click={() => handleExportOption('txt')}>
              <span>Esporta come TXT</span>
            </button>
            <button class="export-option" on:click={() => handleExportOption('markdown')}>
              <span>Esporta come Markdown</span>
            </button>
            {#if (hasActiveSubscription() && $userStore.subscription?.plan === 'pro') || allowsPremiumFeatures}
              <button class="export-option premium" on:click={() => handleExportOption('json')}>
                <span>Esporta come JSON</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </button>
              <button class="export-option premium" on:click={() => handleExportOption('pdf')}>
                <span>Esporta come PDF</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
  <div class="input-container">
    {#if !$isMobile && (inputValue.trim() || editingMessageIndex !== null || visibleMessages.length > 0)}
      <div class="input-toolbar">
        <button 
          class="toolbar-button" 
          on:click={toggleSearchBar}
          title="Cerca nella chat"
          class:active={showSearchBar}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </button>
        <div class="export-button-wrapper" bind:this={exportMenuRef}>
          <button 
            class="toolbar-button" 
            on:click={toggleExportMenu}
            title="Esporta chat"
            disabled={messages.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          {#if showExportMenu && messages.length > 0}
            <div class="export-menu">
              <button class="export-option" on:click={() => handleExportOption('txt')}>
                <span>Esporta come TXT</span>
              </button>
              <button class="export-option" on:click={() => handleExportOption('markdown')}>
                <span>Esporta come Markdown</span>
              </button>
              {#if (hasActiveSubscription() && $userStore.subscription?.plan === 'pro') || allowsPremiumFeatures}
                <button class="export-option premium" on:click={() => handleExportOption('json')}>
                  <span>Esporta come JSON</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </button>
                <button class="export-option premium" on:click={() => handleExportOption('pdf')}>
                  <span>Esporta come PDF</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
      {#if attachedImages.length > 0}
        <div class="attached-images">
          {#if hasActiveSubscription() && $userStore.subscription?.plan === 'max'}
            <div class="advanced-analysis-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              <span>Analisi Avanzata Attiva</span>
            </div>
          {/if}
          {#each attachedImages as imageItem, index}
            <div class="image-preview" class:selected={selectedImageIndex === index}>
              <img src={imageItem.preview} alt={imageItem.file.name} />
              <div class="image-overlay">
                <button class="image-edit" on:click={() => openImageStyles(index)} title={$t('editImage')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="image-remove" on:click={() => removeImage(index)} title="Rimuovi">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              {#if imageItem.style}
                <div class="image-style-badge">
                  {imageStyles.find(s => s.id === imageItem.style)?.name}
                </div>
              {/if}
            </div>
          {/each}
        </div>
        
        <div class="image-actions-bar">
          <button class="image-action-button" on:click={handleCreateImage}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Crea</span>
          </button>
          <div class="styles-dropdown-wrapper">
            <button class="image-action-button" on:click={() => { showImageStyles = !showImageStyles; if (!selectedImageIndex && attachedImages.length > 0) selectedImageIndex = 0; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              <span>Stili</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {#if showImageStyles}
              <div class="styles-menu">
                <div class="styles-grid">
                  {#each imageStyles as style}
                    <button 
                      class="style-option"
                      class:selected={selectedImageIndex !== null && attachedImages[selectedImageIndex]?.style === style.id}
                      on:click={() => applyImageStyle(style.id)}
                      title={style.name}
                    >
                      <img src={style.icon} alt={style.name} />
                      <span>{style.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
          {#if attachedImages.length > 0 && selectedImageIndex !== null && attachedImages[selectedImageIndex]?.style}
            <div class="image-description-input">
              <input
                type="text"
                placeholder={$t('describeImage')}
                bind:value={imageDescription}
                on:input={(e) => {
                  if (selectedImageIndex !== null) {
                    attachedImages[selectedImageIndex].description = e.target.value;
                  }
                }}
              />
            </div>
          {/if}
        </div>
      {/if}
    <div class="input-container-wrapper">
      <div class="input-wrapper" class:input-empty={!inputValue.trim()}>
        <!-- Pulsanti integrati nell'input (solo quando vuoto) -->
        {#if !inputValue.trim() && !editingMessageIndex && visibleMessages.length === 0}
          <div class="input-quick-actions">
            <!-- Pulsante Prompt temporaneamente nascosto -->
            <!--
            <button 
              class="quick-action-btn" 
              on:click={() => isPromptLibraryModalOpen.set(true)}
              title="Libreria prompt"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              <span>Prompt</span>
            </button>
            -->
          </div>
        {/if}
        
        <!-- Nuove icone nella barra della chat -->
        <div class="chat-input-icons">
          {#if $isMobile}
            <!-- Su mobile: menu a tendina per azioni secondarie -->
            <div class="mobile-actions-wrapper" bind:this={mobileActionsRef}>
              <button 
                class="chat-icon-button mobile-menu-button" 
                on:click={() => showMobileActionsMenu = !showMobileActionsMenu}
                title="Menu azioni"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              
              {#if showMobileActionsMenu}
                <div class="mobile-actions-menu" on:click|stopPropagation>
                  <button 
                    class="mobile-action-item" 
                    on:click={() => { handleAttachFile(); showMobileActionsMenu = false; }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span>Carica file</span>
                  </button>
                  
                  <button 
                    class="mobile-action-item" 
                    on:click={() => { handleAttachImage(); showMobileActionsMenu = false; }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>Carica immagine</span>
                  </button>
                  
                  <button 
                    class="mobile-action-item" 
                    on:click={() => { handleClearContext(); showMobileActionsMenu = false; }}
                    disabled={visibleMessages.length === 0}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                    <span>Pulisci contesto</span>
                  </button>
                </div>
              {/if}
            </div>
          {:else}
            <!-- Su desktop: tutti i pulsanti visibili -->
            <button 
              class="chat-icon-button" 
              on:click={handleAttachFile}
              title="Carica file"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>
            
            <button 
              class="chat-icon-button" 
              on:click={handleAttachImage}
              title="Carica immagine"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            
            <button 
              class="chat-icon-button" 
              on:click={handleClearContext}
              title="Pulisci contesto"
              disabled={visibleMessages.length === 0}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          {/if}
          
          <button 
            class="chat-icon-button web-search-button" 
            class:active={webSearchEnabled}
            on:click={handleToggleWebSearch}
            title="Ricerca web"
            disabled={$isGenerating}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            {#if !$isMobile}
              <span>Web Search</span>
            {/if}
          </button>
        </div>
        
      <input 
        type="file"
        bind:this={fileInput}
        on:change={handleFileSelect}
        multiple
        style="display: none;"
      />
      <input 
        type="file"
        bind:this={imageInput}
        on:change={handleImageSelect}
        accept="image/*"
        multiple
        style="display: none;"
      />
      {#if editingMessageIndex !== null}
        <div class="edit-mode">
          <span class="edit-label">{$t('editMessage')}</span>
          <button class="edit-cancel" on:click={handleEditCancel}>{$t('cancel')}</button>
        </div>
      {/if}
      {#if deepResearchEnabled}
        <div class="deep-research-indicator" title="Deep Research attivo: l'AI approfondirà maggiormente le risposte">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <span>Deep Research</span>
        </div>
      {/if}
      <textarea
        class="message-input"
        class:textarea-input={isTextarea}
        placeholder={editingMessageIndex !== null ? $t('editMessagePlaceholder') : ($isMobile ? "" : $t('messageToNebula'))}
        bind:value={inputValue}
        bind:this={textareaRef}
        on:keydown={handleKeyPress}
        on:input={handleInputResize}
        on:paste={(e) => {
          // Resize dopo il paste
          setTimeout(() => resizeTextarea(), 0);
        }}
        disabled={$isGenerating && editingMessageIndex === null}
        rows="1"
      ></textarea>
      <div class="input-actions">
        {#if $isGenerating && editingMessageIndex === null}
          <button 
            class="stop-button" 
            title={$t('stopGeneration')}
            on:click={handleStop}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
        {:else}
          <button 
            class="send-button" 
            title={editingMessageIndex !== null ? $t('saveEdit') : $t('sendMessage')}
            on:click={handleSubmit}
            disabled={!inputValue.trim() && attachedImages.length === 0}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        {/if}
      </div>
    </div>
  </div>
  
  <div class="disclaimer">
    Contenuto generato da IA. Verificare sempre l'accuratezza delle risposte, che possono contenere inesattezze.
  </div>
</main>

<PrivacyModal bind:isOpen={isPrivacyModalOpen} />

<!-- Modal errore microfono -->

<style>
  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--md-sys-color-surface);
    position: relative;
    overflow: hidden;
    min-height: 0;
  }
  
  .incognito-chat-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 24px;
    background: var(--md-sys-color-primary-container);
    border-bottom: 2px solid var(--md-sys-color-primary);
    animation: slideDown var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
    position: relative;
    overflow: hidden;
    box-shadow: var(--md-sys-elevation-level1);
  }

  .incognito-chat-banner::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    animation: shimmer 3s infinite;
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }

  .incognito-banner-content {
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 1;
    position: relative;
  }

  .temporary-banner-content svg {
    color: var(--md-sys-color-primary);
    flex-shrink: 0;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.05);
    }
  }

  .incognito-banner-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .temporary-banner-text strong {
    font-size: var(--md-sys-typescale-body-medium-size);
    font-weight: var(--md-sys-typescale-title-medium-weight);
    font-family: var(--md-sys-typescale-body-medium-font);
    color: var(--md-sys-color-on-primary-container);
  }

  .incognito-banner-subtitle {
    font-size: var(--md-sys-typescale-body-small-size);
    font-family: var(--md-sys-typescale-body-small-font);
    color: var(--md-sys-color-on-primary-container);
    opacity: 0.8;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background-color: var(--md-sys-color-surface-container);
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    animation: slideDown var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
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
  
  .chat-search-input {
    flex: 1;
    padding: 8px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  
  .chat-search-input:focus {
    border-color: var(--accent-blue);
  }
  
  .search-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }
  
  .search-close:hover {
    color: var(--text-primary);
  }
  
  .token-counter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    font-size: 12px;
    transition: background-color 0.2s;
  }
  
  .token-counter.token-warning {
    background-color: rgba(239, 68, 68, 0.1);
    border-bottom-color: rgba(239, 68, 68, 0.3);
  }
  
  .token-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .token-label {
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .token-bar {
    height: 4px;
    background-color: var(--bg-tertiary);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .token-bar-fill {
    height: 100%;
    background-color: var(--accent-blue);
    transition: width 0.3s ease, background-color 0.3s ease;
  }
  
  .token-counter.token-warning .token-bar-fill {
    background-color: #ef4444;
  }
  
  .token-counter-toggle {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }
  
  .token-counter-toggle:hover {
    color: var(--text-primary);
  }
  
  .token-counter-show {
    position: absolute;
    top: 12px;
    right: 16px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    z-index: 10;
  }
  
  .token-counter-show:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-height: 0;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  
  .message.highlighted {
    background-color: rgba(59, 130, 246, 0.2) !important;
    border: 2px solid var(--accent-blue);
    animation: highlightPulse 1s ease;
  }
  
  @keyframes highlightPulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
    }
  }
  
  .input-toolbar {
    display: flex;
    gap: 8px;
    padding: 8px 24px;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .mobile-toolbar {
    padding: 8px 16px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 8px;
  }

  @media (max-width: 768px) {
    .input-toolbar {
      padding: 8px 16px;
    }
  }
  
  .toolbar-button {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 6px 10px;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .toolbar-button:hover:not(:disabled) {
    background-color: var(--hover-bg);
    color: var(--text-primary);
    border-color: var(--accent-blue);
  }
  
  .toolbar-button.active {
    background-color: var(--accent-blue);
    color: white;
    border-color: var(--accent-blue);
  }
  
  .toolbar-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .export-button-wrapper {
    position: relative;
  }
  
  .export-menu {
    position: absolute;
    bottom: 100%;
    right: 0;
    margin-bottom: 8px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    z-index: 1000;
    overflow: hidden;
  }
  
  .export-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 16px;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
    text-align: left;
  }
  
  .export-option:hover {
    background-color: var(--hover-bg);
  }
  
  .export-option.premium {
    color: #fbbf24;
  }
  
  .export-option.premium svg {
    color: #fbbf24;
    flex-shrink: 0;
  }
  
  .export-option span {
    flex: 1;
  }

  .welcome-message {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 60vh;
    width: 100%;
    padding: 40px 24px;
  }
  
  .welcome-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: 1200px;
    width: 100%;
    animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .welcome-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 32px;
    width: 100%;
  }
  
  .welcome-text-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .welcome-title {
    font-size: 48px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.2;
    letter-spacing: -1px;
  }
  
  .welcome-subtitle {
    font-size: 20px;
    font-weight: 400;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.6;
  }
  
  .welcome-logo {
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .welcome-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0.9;
  }

  .welcome-text {
    font-size: 32px;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
    animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    margin: 0;
    letter-spacing: -0.5px;
  }
  
  .privacy-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .privacy-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border-color: var(--accent-blue);
  }
  
  .privacy-card:active {
    transform: translateY(0);
  }
  
  .privacy-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  
  .privacy-card-title-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .privacy-icon-header {
    color: var(--accent-blue);
    flex-shrink: 0;
    opacity: 0.9;
    transition: opacity 0.2s;
  }
  
  .privacy-card:hover .privacy-icon-header {
    opacity: 1;
  }
  
  .privacy-card-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .privacy-card-close {
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
  
  .privacy-card-close:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }
  
  .privacy-features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  
  @media (max-width: 1024px) {
    .privacy-features {
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    
    .welcome-title {
      font-size: 40px;
    }
    
    .welcome-subtitle {
      font-size: 18px;
    }
  }
  
  .privacy-feature {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .privacy-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff6b35;
    margin-bottom: 4px;
  }
  
  .privacy-feature-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
  
  .privacy-feature-description {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }
  
  .privacy-card-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
    color: var(--accent-blue);
    font-size: 14px;
    font-weight: 500;
  }
  
  .privacy-card-link {
    color: var(--accent-blue);
    transition: color 0.2s;
  }
  
  .privacy-card:hover .privacy-card-link {
    color: #60a5fa;
  }
  
  .privacy-card-footer svg {
    color: var(--accent-blue);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .privacy-card:hover .privacy-card-footer svg {
    transform: translateX(4px);
  }

  @media (max-width: 768px) {
    .welcome-message {
      min-height: 50vh;
      padding: 24px 16px;
    }
    
    .welcome-content {
      gap: 24px;
    }
    
    .welcome-header {
      flex-direction: column;
      gap: 24px;
      align-items: center;
      text-align: center;
    }
    
    .welcome-title {
      font-size: 32px;
    }
    
    .welcome-subtitle {
      font-size: 16px;
    }
    
    .welcome-logo {
      width: 80px;
      height: 80px;
    }
    
    .privacy-card {
      display: none;
    }
    
    .privacy-features {
      grid-template-columns: 1fr;
      gap: 16px;
    }
    
    .privacy-feature {
      text-align: center;
    }
    
    .privacy-icon {
      margin: 0 auto 8px;
    }

    .welcome-text {
      font-size: 22px;
      padding: 0 12px;
    }

    .messages-container {
      padding: 12px 8px;
      padding-bottom: calc(150px + env(safe-area-inset-bottom));
      gap: 12px;
    }

    .message {
      max-width: 90%;
      min-width: 0;
      padding: 10px 12px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    .user-message {
      max-width: 90%;
    }

    .ai-message {
      max-width: 90%;
    }

    .message-content {
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
      overflow-x: hidden;
    }

    .input-container {
      padding: 10px 12px;
      padding-bottom: calc(10px + env(safe-area-inset-bottom));
      position: sticky;
      bottom: 0;
      background-color: transparent;
      z-index: 100;
    }

    .input-wrapper {
      padding: 10px 12px;
      gap: 6px;
      flex-wrap: nowrap;
    }
    
    .chat-input-icons {
      flex-shrink: 0;
    }
    
    .message-input {
      flex: 1;
      min-width: 0;
    }

    .message-image {
      max-width: 100%;
      max-height: 150px;
      width: auto;
      height: auto;
      border-radius: 8px;
      object-fit: contain;
    }

    .message-images {
      width: 100%;
      max-width: 100%;
    }

    .user-message .message-images,
    .ai-message .message-images {
      width: 100%;
      max-width: 100%;
    }

    .attached-images {
      gap: 8px;
      margin-bottom: 8px;
      padding: 0 4px;
    }

    .image-preview {
      width: 100px;
      height: 100px;
    }
    
    .image-actions-bar {
      flex-direction: column;
      align-items: stretch;
    }
    
    .image-action-button {
      width: 100%;
      justify-content: center;
      min-height: 44px;
      font-size: 14px;
    }
    
    .styles-menu {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      top: auto;
      margin: 0;
      border-radius: 16px 16px 0 0;
      max-height: 60vh;
      overflow-y: auto;
    }
    
    .styles-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      padding: 8px;
    }
    
    .style-option {
      padding: 12px;
    }
    
    .style-option img {
      width: 80px;
      height: 80px;
    }
    
    .image-description-input {
      min-width: 100%;
      width: 100%;
    }
    
    .image-description-input input {
      min-height: 44px;
      font-size: 16px; /* Previene zoom su iOS */
    }

    .disclaimer {
      font-size: 10px;
      padding: 6px 12px;
      text-align: center;
      line-height: 1.4;
      margin-top: 4px;
    }

    .message-input {
      font-size: 16px; /* Previene zoom su iOS */
      padding: 10px 16px;
      min-height: 24px;
    }
    
    .input-wrapper.input-empty .message-input {
      font-size: 16px;
      padding: 10px 16px;
    }
  }

  @media (max-width: 480px) {
    .welcome-text {
      font-size: 20px;
    }

    .messages-container {
      padding: 12px 8px;
      padding-bottom: calc(150px + env(safe-area-inset-bottom));
      gap: 12px;
    }

    .message {
      max-width: 90%;
      padding: 8px 12px;
      font-size: 13px;
    }

    .input-container {
      padding: 8px;
      padding-bottom: calc(8px + env(safe-area-inset-bottom));
      position: sticky;
      bottom: 0;
      background-color: transparent;
      z-index: 100;
    }

    .input-wrapper {
      padding: 8px 10px;
      gap: 4px;
    }
    
    .chat-input-icons {
      gap: 4px;
      margin-right: 4px;
    }

    .message-image {
      max-height: 130px;
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .message {
    max-width: 80%;
    min-width: 0;
    padding: 16px 20px;
    border-radius: 12px;
    animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .message:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .message :global(.message-actions) {
    align-self: flex-end;
    margin-top: 4px;
  }
  
  .user-message :global(.message-actions) {
    align-self: flex-start;
  }

  @keyframes messageSlideIn {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .user-message {
    align-self: flex-end;
    background-color: var(--accent-blue);
    color: white;
  }

  .ai-message {
    align-self: flex-start;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .message-content {
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
    min-width: 0;
  }

  .message-images {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }

  .message-image {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, box-shadow 0.3s ease;
    border: 1px solid var(--border-color);
    animation: imageFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes imageFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .message-image:hover {
    transform: scale(1.05);
    opacity: 0.9;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .user-message .message-images {
    justify-content: flex-end;
  }

  .ai-message .message-images {
    justify-content: flex-start;
  }

  .message:has(.message-images) .message-content {
    margin-top: 12px;
  }

  .message:has(.message-images) .message-content {
    margin-top: 12px;
  }

  .user-message .message-images {
    justify-content: flex-end;
  }

  .ai-message .message-images {
    justify-content: flex-start;
  }

  .typing-indicator {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 12px 0;
  }

  .typing-indicator span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: var(--text-secondary);
    animation: typing-bounce 1.4s infinite ease-in-out;
    opacity: 0.6;
  }

  .typing-indicator span:nth-child(1) {
    animation-delay: 0s;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  .typing-indicator-inline {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    margin-left: 8px;
    vertical-align: middle;
  }

  .typing-indicator-inline span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--text-secondary);
    animation: typing-pulse 1.2s infinite ease-in-out;
    opacity: 0.5;
  }

  .typing-indicator-inline span:nth-child(1) {
    animation-delay: 0s;
  }

  .typing-indicator-inline span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator-inline span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing-bounce {
    0%, 60%, 100% {
      transform: translateY(0) scale(1);
      opacity: 0.6;
    }
    30% {
      transform: translateY(-12px) scale(1.1);
      opacity: 1;
    }
  }

  @keyframes typing-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.3);
      opacity: 1;
    }
  }

  .image-preview {
    position: relative;
    width: 100px;
    height: 100px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    background-color: var(--bg-tertiary);
    animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .image-preview.selected {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  .image-preview:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .image-preview:hover .image-overlay {
    opacity: 1;
  }

  .image-edit {
    position: absolute;
    top: 4px;
    left: 4px;
    background: rgba(0, 0, 0, 0.7);
    border: none;
    border-radius: 4px;
    color: white;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
  }

  .image-edit:hover {
    background: rgba(0, 0, 0, 0.9);
  }

  .image-style-badge {
    position: absolute;
    bottom: 4px;
    left: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .input-container {
    padding: 16px 24px;
    background-color: transparent;
    border-top: none;
    position: relative;
    z-index: 10;
  }

  .attached-images {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
    padding: 0 4px;
    position: relative;
  }
  
  .advanced-analysis-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, rgba(240, 147, 251, 0.2) 0%, rgba(245, 87, 108, 0.1) 100%);
    border: 1px solid #f093fb;
    border-radius: 6px;
    color: #f093fb;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
    width: 100%;
    justify-content: center;
  }
  
  .advanced-analysis-badge svg {
    flex-shrink: 0;
  }

  .image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .image-preview:hover img {
    transform: scale(1.1);
  }

  .image-actions-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 4px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .image-action-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .image-action-button:hover {
    background-color: var(--hover-bg);
    border-color: var(--accent-blue);
  }

  .styles-dropdown-wrapper {
    position: relative;
  }

  .styles-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 8px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    min-width: 300px;
  }

  .styles-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .style-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px;
    background-color: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .style-option:hover {
    border-color: var(--accent-blue);
    transform: translateY(-2px);
  }

  .style-option.selected {
    border-color: var(--accent-blue);
    background-color: rgba(59, 130, 246, 0.1);
  }

  .style-option img {
    width: 60px;
    height: 60px;
    border-radius: 6px;
    object-fit: cover;
  }

  .style-option span {
    font-size: 11px;
    color: var(--text-primary);
    text-align: center;
    line-height: 1.2;
  }

  .image-description-input {
    flex: 1;
    min-width: 200px;
  }

  .image-description-input input {
    width: 100%;
    padding: 8px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }

  .image-description-input input:focus {
    border-color: var(--accent-blue);
  }

  .image-description-input input::placeholder {
    color: var(--text-secondary);
  }

  .image-remove {
    position: absolute;
    top: 4px;
    right: 4px;
    background-color: rgba(0, 0, 0, 0.7);
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
    opacity: 0;
    transform: scale(0.8);
  }

  .image-preview:hover .image-remove {
    opacity: 1;
    transform: scale(1);
  }

  .image-remove:hover {
    background-color: rgba(239, 68, 68, 0.9);
    transform: scale(1.1) rotate(90deg);
  }

  .image-remove svg {
    width: 14px;
    height: 14px;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .input-container-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    position: relative;
  }

  .side-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 8px;
    min-width: 240px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    animation: menuSlideUp 0.2s ease;
  }

  @keyframes menuSlideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .side-menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
    font-size: 14px;
    text-align: left;
  }

  .side-menu-item:hover {
    background-color: var(--hover-bg);
  }

  .side-menu-item.active {
    background-color: var(--md-sys-color-secondary-container);
    color: var(--md-sys-color-on-secondary-container);
  }

  .side-menu-item svg {
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .side-menu-item:hover svg,
  .side-menu-item.active svg {
    color: var(--text-primary);
  }

  .side-menu-item-wrapper {
    position: relative;
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 12px 16px;
    transition: all 0.2s;
    min-height: 56px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
    flex: 1;
  }

  .input-wrapper.input-empty {
    padding: 8px 12px;
    min-height: 44px;
  }

  @media (max-width: 768px) {
    .input-wrapper {
      padding: 10px 12px;
      min-height: 48px;
    }

    .input-wrapper.input-empty {
      padding: 6px 10px;
      min-height: 40px;
    }
  }

  .input-wrapper:focus-within {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .chat-input-icons {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-right: 8px;
  }

  .chat-icon-button {
    background: none;
    border: 1.5px solid var(--text-primary);
    color: var(--text-primary);
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    opacity: 0.7;
  }

  .chat-icon-button:hover:not(:disabled) {
    opacity: 1;
    transform: scale(1.1);
    background-color: var(--hover-bg);
  }

  .chat-icon-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .chat-icon-button svg {
    width: 18px;
    height: 18px;
  }

  .web-search-button {
    border-radius: 20px;
    padding: 0 12px;
    width: auto;
    min-width: 100px;
    gap: 6px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }

  .web-search-button span {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .web-search-button.active {
    background-color: var(--accent-blue);
    border-color: var(--accent-blue);
    color: white;
    opacity: 1;
  }

  .web-search-button.active svg {
    color: white;
  }

  .web-search-button.active span {
    color: white;
  }
  
  /* Menu mobile per azioni */
  .mobile-actions-wrapper {
    position: relative;
  }
  
  .mobile-menu-button {
    min-width: 44px;
    min-height: 44px;
    touch-action: manipulation;
  }
  
  .mobile-actions-menu {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    min-width: 200px;
    animation: menuSlideUp 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .mobile-action-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s;
    min-height: 48px;
    touch-action: manipulation;
    text-align: left;
    width: 100%;
  }
  
  .mobile-action-item:hover:not(:disabled) {
    background-color: var(--hover-bg);
  }
  
  .mobile-action-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .mobile-action-item svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
  
  @keyframes menuSlideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @media (max-width: 768px) {
    .chat-input-icons {
      gap: 6px;
      margin-right: 6px;
    }
    
    .chat-icon-button {
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
    }
    
    .chat-icon-button svg {
      width: 20px;
      height: 20px;
    }
    
    .web-search-button {
      min-width: 40px;
      padding: 0 10px;
    }
    
    .web-search-button span {
      display: none;
    }
    
    .mobile-actions-menu {
      min-width: 180px;
    }
    
    .input-wrapper {
      gap: 6px;
    }
    
    .message-input {
      flex: 1;
      min-width: 0;
    }
    
    .send-button,
    .stop-button {
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      padding: 8px;
    }
    
    .send-button svg,
    .stop-button svg {
      width: 20px;
      height: 20px;
    }
  }
  
  @media (max-width: 480px) {
    .chat-input-icons {
      gap: 4px;
      margin-right: 4px;
    }
    
    .chat-icon-button {
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
    }
    
    .web-search-button {
      min-width: 36px;
      padding: 0 8px;
    }
  }

    .attach-menu {
      position: absolute;
      bottom: 100%;
      left: 0;
      margin-bottom: 8px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      min-width: 240px;
      animation: menuSlideUp 0.2s ease;
    }
    
    @media (max-width: 768px) {
      .attach-menu {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        top: auto;
        margin: 0;
        border-radius: 16px 16px 0 0;
        max-height: 70vh;
        overflow-y: auto;
        min-width: auto;
        width: 100%;
      }
      
      .menu-item {
        min-height: 48px;
        padding: 12px 16px;
        font-size: 15px;
      }
      
      .menu-item svg {
        width: 20px;
        height: 20px;
      }
      
      .more-options-menu {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        top: auto;
        margin: 0;
        border-radius: 16px 16px 0 0;
        max-height: 60vh;
        overflow-y: auto;
        min-width: auto;
        width: 100%;
        animation: menuSlideUp 0.3s ease;
      }
    }

  @keyframes menuSlideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .menu-item-wrapper {
    position: relative;
  }

  .menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.2s ease;
    font-size: 14px;
    text-align: left;
  }

  .menu-item:hover {
    background-color: var(--hover-bg);
  }

  .menu-item svg {
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .menu-item:hover svg {
    color: var(--text-primary);
  }

  .menu-divider {
    height: 1px;
    background-color: var(--border-color);
    margin: 4px 0;
  }

  .arrow-icon {
    margin-left: auto;
  }

  .more-options-menu {
    position: absolute;
    left: 100%;
    top: 0;
    margin-left: 8px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 1001;
    min-width: 220px;
    animation: menuSlideRight 0.2s ease;
  }

  @media (max-width: 768px) {
    .side-menu {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      top: auto;
      margin: 0;
      border-radius: 16px 16px 0 0;
      max-height: 70vh;
      overflow-y: auto;
      min-width: auto;
      width: 100%;
      animation: menuSlideUp 0.3s ease;
    }

    .more-options-menu {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      top: auto;
      margin: 0;
      border-radius: 16px 16px 0 0;
      max-height: 60vh;
      overflow-y: auto;
      min-width: auto;
      width: 100%;
      animation: menuSlideUp 0.3s ease;
    }
  }

  @keyframes menuSlideRight {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .message-input {
    flex: 1;
    background: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 24px;
    color: var(--text-primary);
    font-size: 15px;
    outline: none;
    padding: 12px 20px;
    resize: none;
    min-height: 48px;
    max-height: 200px;
    overflow-y: auto;
    font-family: inherit;
    line-height: 1.5;
    transition: all 0.2s ease;
    box-sizing: border-box;
    width: 100%;
  }
  
  .message-input:focus {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
  
  .message-input.textarea-input {
    padding: 12px 20px;
  }

  .input-wrapper.input-empty .message-input {
    min-height: 48px;
    font-size: 15px;
    height: 48px;
    padding: 12px 20px;
  }

  @media (max-width: 768px) {
    .message-input {
      font-size: 16px; /* Previene zoom su iOS */
      padding: 10px 16px;
      min-height: 24px;
    }

    .input-wrapper.input-empty .message-input {
      font-size: 16px;
      padding: 10px 16px;
      min-height: 24px;
      height: auto;
    }
  }

  .message-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .message-input::placeholder {
    color: var(--text-secondary);
  }
  
  .edit-mode {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  .edit-label {
    flex: 1;
  }
  
  .edit-cancel {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    transition: background-color 0.2s;
  }
  
  .edit-cancel:hover {
    background-color: var(--hover-bg);
  }

  .deep-research-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background-color: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 8px;
    animation: fadeInUp 0.3s ease;
  }

  .deep-research-indicator svg {
    flex-shrink: 0;
  }

  .web-search-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, rgba(79, 172, 254, 0.15) 0%, rgba(0, 242, 254, 0.15) 100%);
    color: #4facfe;
    border: 1px solid rgba(79, 172, 254, 0.3);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 8px;
    animation: fadeInUp 0.3s ease;
  }

  .web-search-indicator svg {
    flex-shrink: 0;
  }

  .deep-research-badge {
    margin-left: auto;
    padding: 2px 6px;
    background-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .stop-button {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 4px;
    transform: scale(1);
    min-width: 40px;
    min-height: 40px;
    touch-action: manipulation;
  }
  
  .stop-button:hover {
    background-color: rgba(239, 68, 68, 0.1);
    transform: scale(1.1);
  }
  
  .scroll-to-top {
    position: fixed;
    bottom: 120px;
    right: 40px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 50%;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
    z-index: 100;
    animation: fadeInUp 0.3s ease;
  }
  
  .scroll-to-top:hover {
    background-color: var(--hover-bg);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
  
  @media (max-width: 768px) {
    .scroll-to-top {
      bottom: 100px;
      right: 16px;
      width: 40px;
      height: 40px;
    }
  }

  /* Loading skeleton styles */
  .loading-messages {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 40px;
    animation: fadeIn 0.3s ease-out;
  }

  .message-skeleton-wrapper {
    display: flex;
    max-width: 80%;
  }

  .message-skeleton-wrapper.user {
    align-self: flex-end;
  }

  .message-skeleton-wrapper:not(.user) {
    align-self: flex-start;
  }

  /* Generation progress indicator */
  .generation-progress {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--md-sys-color-surface-container-high);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: var(--md-sys-elevation-level3);
    z-index: 1000;
    min-width: 200px;
    animation: slideUp 0.3s ease-out;
  }

  .progress-bar {
    width: 120px;
    height: 4px;
    background: var(--md-sys-color-surface-container);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--md-sys-color-primary), var(--md-sys-color-secondary));
    border-radius: 2px;
    animation: progressAnimation 2s ease-in-out infinite;
    width: 60%;
  }

  .progress-text {
    font-size: var(--md-sys-typescale-body-small-size);
    color: var(--md-sys-color-on-surface-variant);
    white-space: nowrap;
  }

  @keyframes progressAnimation {
    0%, 100% {
      transform: translateX(-100%);
      opacity: 0.5;
    }
    50% {
      transform: translateX(0%);
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @media (max-width: 768px) {
    .generation-progress {
      bottom: 70px;
      padding: 10px 16px;
      min-width: 180px;
    }

    .progress-bar {
      width: 80px;
    }

    .progress-text {
      font-size: 12px;
    }

    .loading-messages {
      padding: 20px 16px;
      gap: 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .progress-fill {
      animation: none;
      width: 100%;
    }

    .generation-progress {
      animation: none;
    }
  }
  
  /* Stili per markdown */
  .message-content :global(h1),
  .message-content :global(h2),
  .message-content :global(h3),
  .message-content :global(h4),
  .message-content :global(h5),
  .message-content :global(h6) {
    margin-top: 16px;
    margin-bottom: 8px;
    font-weight: 600;
    line-height: 1.3;
  }
  
  .message-content :global(h1) { font-size: 1.5em; }
  .message-content :global(h2) { font-size: 1.3em; }
  .message-content :global(h3) { font-size: 1.1em; }
  
  .message-content :global(p) {
    margin: 4px 0;
    line-height: 1.6;
  }
  
  /* Riduci ulteriormente lo spazio tra paragrafi consecutivi */
  .message-content :global(p + p) {
    margin-top: 2px;
  }
  
  .message-content :global(ul),
  .message-content :global(ol) {
    margin: 8px 0;
    padding-left: 24px;
  }
  
  .message-content :global(li) {
    margin: 4px 0;
  }
  
  .message-content :global(code) {
    background-color: rgba(0, 0, 0, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  .message-content :global(pre) {
    background-color: rgba(0, 0, 0, 0.3);
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 12px 0;
  }
  
  .message-content :global(pre code) {
    background: none;
    padding: 0;
  }
  
  /* Stili per i blocchi di codice con pulsante copia */
  .message-content :global(.code-block-wrapper) {
    position: relative;
    margin: 12px 0;
    border-radius: 8px;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 0.3);
  }
  
  .message-content :global(.code-block-wrapper pre) {
    margin: 0;
    border-radius: 0;
  }
  
  .message-content :global(.code-copy-button) {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background-color: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10;
    opacity: 0;
    pointer-events: none;
  }
  
  .message-content :global(.code-block-wrapper:hover .code-copy-button) {
    opacity: 1;
    pointer-events: all;
  }
  
  .message-content :global(.code-copy-button:hover) {
    background-color: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 1);
    transform: translateY(-1px);
  }
  
  .message-content :global(.code-copy-button:active) {
    transform: translateY(0);
  }
  
  .message-content :global(.code-copy-button.copied) {
    background-color: rgba(76, 175, 80, 0.3);
    border-color: rgba(76, 175, 80, 0.6);
    color: #4caf50;
    opacity: 1;
  }
  
  .message-content :global(.code-copy-button svg) {
    width: 14px;
    height: 14px;
    stroke-width: 2;
    flex-shrink: 0;
  }
  
  .message-content :global(.code-copy-button .copy-text) {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .message-content :global(blockquote) {
    border-left: 3px solid var(--accent-blue);
    padding-left: 12px;
    margin: 8px 0;
    color: var(--text-secondary);
    font-style: italic;
  }
  
  .message-content :global(a) {
    color: var(--accent-blue);
    text-decoration: underline;
  }
  
  .message-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
  }
  
  .message-content :global(th),
  .message-content :global(td) {
    border: 1px solid var(--border-color);
    padding: 8px;
    text-align: left;
  }
  
  .message-content :global(th) {
    background-color: rgba(0, 0, 0, 0.2);
    font-weight: 600;
  }

  /* Toast di notifica per copia codice */
  :global(.copy-toast) {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background-color: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  :global(.copy-toast.show) {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events: all;
  }

  :global(.copy-toast::before) {
    content: '✓';
    font-size: 18px;
    color: #4caf50;
    font-weight: bold;
  }

  .input-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .send-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 50%;
    transform: scale(1);
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    flex-shrink: 0;
    touch-action: manipulation;
  }
  
  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .send-button:active:not(:disabled) {
    transform: scale(0.95);
  }
  
  .send-button:not(:disabled) {
    background: linear-gradient(135deg, var(--accent-blue) 0%, #8b5cf6 100%);
    color: white;
  }
  
  .send-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }


  .disclaimer {
    padding: 12px 24px;
    text-align: center;
    font-size: 11px;
    color: var(--text-secondary);
    border-top: 1px solid var(--border-color);
  }



</style>
