<script>
  import { onMount, tick, afterUpdate } from 'svelte';
  import { get } from 'svelte/store';
  import { chats, currentChatId, currentChat, isGenerating, addMessage, createNewChat, updateMessage, deleteMessage, createTemporaryChat, saveChatsToStorage } from '../stores/chat.js';
  import { selectedModel } from '../stores/models.js';
  import { hasActiveSubscription } from '../stores/user.js';
  import { generateResponseStream, generateResponse } from '../services/aiService.js';
  import { initVoiceRecognition, startListening, stopListening, isVoiceAvailable } from '../services/voiceService.js';
  import { isPremiumModalOpen, isVoiceSelectionModalOpen, selectedPrompt, isMobile } from '../stores/app.js';
  import { currentAbortController, setAbortController, abortCurrentRequest } from '../stores/abortController.js';
  import { renderMarkdown, initCodeCopyButtons } from '../utils/markdown.js';
  import MessageActions from './MessageActions.svelte';
  import { estimateChatTokens, estimateMessageTokens } from '../utils/tokenCounter.js';
  
  let inputValue = '';
  let inputRef;
  let textareaRef;
  let isRecording = false;
  let voiceAvailable = false;
  let fileInput;
  let attachedImages = [];
  let messagesContainer;
  let currentStreamingMessageId = null;
  let editingMessageIndex = null;
  let searchQuery = '';
  let showScrollToTop = false;
  let showSearchBar = false;
  let showTokenCounter = true;
  let highlightedMessageIndex = null;
  let showAttachMenu = false;
  let attachMenuRef;
  let showMoreOptions = false;
  let showImageStyles = false;
  let selectedImageIndex = null;
  let imageDescription = '';
  
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
  let isTemporaryChat = false;
  let currentChatTokens = 0;
  let maxTokens = 4000;
  let tokenUsagePercentage = 0;
  let tokenWarning = false;
  let showError = false;
  let errorMessage = '';
  
  // Usa textarea invece di input
  $: isTextarea = true;
  
  // Ottieni i messaggi dalla chat corrente
  $: {
    try {
      messages = $currentChat?.messages || [];
      isTemporaryChat = $currentChat?.isTemporary || false;
    } catch (error) {
      console.error('Error accessing currentChat:', error);
      messages = [];
      isTemporaryChat = false;
    }
  }
  
  // Filtra i messaggi nascosti per la visualizzazione
  $: visibleMessages = messages.filter(msg => !msg.hidden);
  
  // Calcola token per la chat corrente (escludendo messaggi nascosti)
  $: {
    try {
      // Filtra i messaggi nascosti dal conteggio token
      const visibleMessagesForTokens = messages.filter(msg => !msg.hidden);
      currentChatTokens = visibleMessagesForTokens.length > 0 ? estimateChatTokens(visibleMessagesForTokens) : 0;
      
      // Calcola maxTokens: illimitati per modelli premium con abbonamento attivo
      const isPremiumModel = $selectedModel === 'nebula-premium-pro' || $selectedModel === 'nebula-premium-max';
      const hasPremium = isPremiumModel && hasActiveSubscription();
      const isAdvancedModel = $selectedModel === 'nebula-pro' || $selectedModel === 'nebula-coder' || isPremiumModel;
      
      if (hasPremium) {
        maxTokens = Infinity; // Token illimitati
        tokenUsagePercentage = 0; // Non mostrare percentuale per token illimitati
        tokenWarning = false;
      } else if (isAdvancedModel) {
        maxTokens = 50000;
        tokenUsagePercentage = (currentChatTokens / maxTokens) * 100;
        tokenWarning = tokenUsagePercentage > 80;
      } else {
        maxTokens = 4000;
        tokenUsagePercentage = (currentChatTokens / maxTokens) * 100;
        tokenWarning = tokenUsagePercentage > 80;
      }
    } catch (error) {
      console.error('Error calculating tokens:', error);
      currentChatTokens = 0;
      const isPremiumModel = $selectedModel === 'nebula-premium-pro' || $selectedModel === 'nebula-premium-max';
      const hasPremium = isPremiumModel && hasActiveSubscription();
      const isAdvancedModel = $selectedModel === 'nebula-pro' || $selectedModel === 'nebula-coder' || isPremiumModel;
      
      if (hasPremium) {
        maxTokens = Infinity;
      } else if (isAdvancedModel) {
        maxTokens = 50000;
      } else {
        maxTokens = 4000;
      }
      tokenUsagePercentage = 0;
      tokenWarning = false;
    }
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
  
  onMount(() => {
    voiceAvailable = isVoiceAvailable();
    
    // Inizializza riconoscimento vocale per input testo
    if (voiceAvailable) {
      initVoiceRecognition(
        (transcript) => {
          // Aggiungi il testo riconosciuto all'input (append se c'è già testo)
          if (inputValue.trim()) {
            inputValue = inputValue + ' ' + transcript;
          } else {
            inputValue = transcript;
          }
          stopListening();
          isRecording = false;
          // Focus sul textarea e resize
          if (textareaRef) {
            textareaRef.focus();
            resizeTextarea();
          }
        },
        (error) => {
          console.error('Voice recognition error:', error);
          isRecording = false;
          stopListening();
          // Mostra errore all'utente solo se non è un'interruzione volontaria
          if (error !== 'no-speech' && error !== 'aborted') {
            showError = true;
            errorMessage = 'Errore nel riconoscimento vocale. Riprova.';
            setTimeout(() => {
              showError = false;
            }, 3000);
          }
        }
      );
    }
    
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
              console.error('Error processing pasted image:', error);
            }
          }
        }
      }
    };
    
    // Aggiungi listener globale per l'incolla
    window.addEventListener('paste', handlePaste);
    
    // Scroll automatico quando arrivano nuovi messaggi
    const unsubscribe = currentChat.subscribe(async (chat) => {
      if (chat) {
        await tick();
        if (messagesContainer) {
          scrollToBottom();
        }
      }
    });
    
    // Inizializza i pulsanti di copia dopo ogni aggiornamento (event delegation, quindi basta una volta)
    afterUpdate(() => {
      if (messagesContainer) {
        initCodeCopyButtons(messagesContainer);
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
    
    // Aggiungi listener per chiudere il menu quando si clicca fuori
    document.addEventListener('click', handleClickOutside);
    
    // Inizializza i pulsanti di copia codice
    tick().then(() => {
      if (messagesContainer) {
        initCodeCopyButtons(messagesContainer);
      }
    });
    
    // Cleanup
    return () => {
      window.removeEventListener('paste', handlePaste);
      if (messagesContainer) {
        messagesContainer.removeEventListener('scroll', handleScroll);
        // Rimuovi listener per copia codice
        if (messagesContainer._copyButtonHandler) {
          messagesContainer.removeEventListener('click', messagesContainer._copyButtonHandler);
          delete messagesContainer._copyButtonHandler;
        }
      }
      document.removeEventListener('click', handleClickOutside);
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
  
  function scrollToTop() {
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }
  
  async function handleSubmit() {
    if (editingMessageIndex !== null) {
      handleEditSave();
      return;
    }
    
    const hasText = inputValue.trim().length > 0;
    const hasImages = attachedImages.length > 0;
    
    // Se ci sono immagini, mostra il modal premium invece di inviare
    if (hasImages) {
      isPremiumModalOpen.set(true);
      return;
    }
    
    if (hasText && !$isGenerating) {
      const chatId = $currentChatId || createNewChat();
      
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
      
      // Crea messaggio AI vuoto per lo streaming
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
        
        // Usa streaming per aggiornare in tempo reale
        const currentChatData = get(currentChat);
        if (!currentChatData) {
          throw new Error('Chat corrente non disponibile');
        }
        
        const chatHistory = currentChatData.messages.slice(0, -1); // Escludi il messaggio corrente
        const messageIndex = currentChatData.messages.length - 1;
        
        for await (const chunk of generateResponseStream(
          messageText, 
          $selectedModel, 
          chatHistory,
          [],
          abortController
        )) {
          fullResponse += chunk;
          // Aggiorna il messaggio in tempo reale
          updateMessage(chatId, messageIndex, { content: fullResponse });
          await tick();
          scrollToBottom(false); // Scroll continuo ma non smooth per performance
        }
        
        // Salva la risposta finale
        updateMessage(chatId, messageIndex, { content: fullResponse });
        currentStreamingMessageId = null;
        
      } catch (error) {
        console.error('Error generating response:', error);
        
        // Rimuovi il messaggio vuoto se è stato interrotto
        const currentChatData = get(currentChat);
        if (currentStreamingMessageId && error.message && error.message.includes('interrotta')) {
          if (currentChatData && currentChatData.messages.length > 0) {
            deleteMessage(chatId, currentChatData.messages.length - 1);
          }
        } else {
          const errorMsg = error?.message || 'Si è verificato un errore sconosciuto.';
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
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    // Auto-resize textarea dopo il keypress
    setTimeout(() => resizeTextarea(), 0);
  }
  
  function handleInputResize() {
    resizeTextarea();
  }
  
  // Resize automatico quando cambia inputValue
  $: if (inputValue !== undefined && textareaRef) {
    tick().then(() => resizeTextarea());
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
        
        for await (const chunk of generateResponseStream(
          userMessage.content,
          $selectedModel,
          styleModifier ? modifiedHistory.slice(0, -1) : chatHistory.slice(0, -1),
          [],
          abortController
        )) {
          fullResponse += chunk;
          const currentChatData = get(currentChat);
          if (currentChatData && currentChatData.messages.length > 0) {
            updateMessage(chatId, currentChatData.messages.length - 1, { content: fullResponse });
          }
          await tick();
          scrollToBottom(false);
        }
        
        const currentChatData = get(currentChat);
        if (currentChatData && currentChatData.messages.length > 0) {
          updateMessage(chatId, currentChatData.messages.length - 1, { content: fullResponse });
        }
        currentStreamingMessageId = null;
        
      } catch (error) {
        console.error('Error regenerating response:', error);
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
        alert('La sintesi vocale non è disponibile nel tuo browser.');
      }
    }
  }
  
  function handleReportMessage(messageIndex) {
    const message = messages[messageIndex];
    if (message && message.type === 'ai') {
      const reason = prompt('Perché vuoi segnalare questo messaggio?\n\n1. Contenuto inappropriato\n2. Informazioni errate\n3. Altro\n\nInserisci il motivo:');
      if (reason) {
        // Qui potresti inviare la segnalazione a un server
        console.log('Messaggio segnalato:', {
          messageIndex,
          messageId: message.id,
          content: message.content,
          reason: reason
        });
        alert('Grazie per la segnalazione. Il messaggio è stato segnalato.');
      }
    }
  }
  
  function handleMessageFeedback(messageIndex, type) {
    // Qui puoi implementare il salvataggio del feedback
    console.log('Feedback:', { messageIndex, type });
  }
  
  function handleVoiceClick() {
    if (!voiceAvailable) {
      alert('Il riconoscimento vocale non è disponibile nel tuo browser.');
      return;
    }
    
    // Avvia/ferma il riconoscimento vocale per inserire testo
    if (!isRecording) {
      startListening();
      isRecording = true;
      // Focus sul textarea per vedere il testo inserito
      if (textareaRef) {
        textareaRef.focus();
      }
    } else {
      stopListening();
      isRecording = false;
    }
  }
  
  function handleVoiceSelected(event) {
    // Questa funzione è per la modalità vocale (quando l'AI parla)
    // Non per l'input vocale
    const selectedVoice = event.detail;
    console.log('Voce selezionata per modalità vocale:', selectedVoice);
  }
  
  function handleAttachClick(event) {
    event.stopPropagation();
    showAttachMenu = !showAttachMenu;
  }
  
  function handleAttachFile() {
    fileInput?.click();
    showAttachMenu = false;
  }
  
  function handleAttachOption(option) {
    switch(option) {
      case 'file':
        handleAttachFile();
        showAttachMenu = false;
        break;
      case 'business-info':
        alert('Informazioni aziendali - Funzionalità in arrivo');
        showAttachMenu = false;
        break;
      case 'deep-research':
        alert('Deep Research - Funzionalità in arrivo');
        showAttachMenu = false;
        break;
      case 'agent-mode':
        alert('Modalità agente - Funzionalità in arrivo');
        showAttachMenu = false;
        break;
      case 'create-image':
        alert('Crea immagine - Funzionalità in arrivo');
        showAttachMenu = false;
        break;
      case 'more-options':
        showMoreOptions = !showMoreOptions;
        break;
      case 'voice-mode':
        isVoiceSelectionModalOpen.set(true);
        showAttachMenu = false;
        break;
      case 'web-search':
        alert('Ricerca sul web - Funzionalità in arrivo');
        showAttachMenu = false;
        showMoreOptions = false;
        break;
      case 'canvas':
        alert('Canvas - Funzionalità in arrivo');
        showAttachMenu = false;
        showMoreOptions = false;
        break;
      case 'study-learn':
        alert('Studia e impara - Funzionalità in arrivo');
        showAttachMenu = false;
        showMoreOptions = false;
        break;
    }
  }
  
  function handleMoreOptionsMouseEnter() {
    showMoreOptions = true;
  }
  
  function handleMoreOptionsMouseLeave() {
    // Delay per permettere il movimento al sottomenu
    setTimeout(() => {
      if (!attachMenuRef?.querySelector('.more-options-menu:hover')) {
        showMoreOptions = false;
      }
    }, 200);
  }
  
  // Chiudi menu quando si clicca fuori
  function handleClickOutside(event) {
    if (attachMenuRef && !attachMenuRef.contains(event.target)) {
      showAttachMenu = false;
    }
  }
  
  async function handleFileSelect(event) {
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
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Questo codice non verrà mai eseguito se ci sono immagini, ma lo lascio per sicurezza
    for (const file of imageFiles) {
      const preview = await readFileAsDataURL(file);
      attachedImages = [...attachedImages, { file, preview }];
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
        console.log('Creating image with style:', {
          image: image.preview,
          style: image.style,
          description: image.description || imageDescription
        });
        alert(`Immagine modificata con stile: ${imageStyles.find(s => s.id === image.style)?.name}`);
      } else {
        alert('Seleziona uno stile prima di creare');
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
  function exportChat(format = 'txt') {
    const chat = $currentChat;
    if (!chat || messages.length === 0) return;
    
    let content = `Nebula AI Chat Export\n`;
    content += `Title: ${chat.title}\n`;
    content += `Date: ${new Date(chat.createdAt).toLocaleString()}\n`;
    content += `${'='.repeat(50)}\n\n`;
    
    if (format === 'markdown') {
      messages.forEach(msg => {
        const role = msg.type === 'user' ? '**User**' : '**AI**';
        content += `${role}\n\n${msg.content}\n\n---\n\n`;
      });
    } else {
      messages.forEach(msg => {
        const role = msg.type === 'user' ? 'User' : 'AI';
        content += `[${role}]\n${msg.content}\n\n`;
      });
    }
    
    const blob = new Blob([content], { type: format === 'markdown' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title || 'chat'}-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
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
  
  function convertToPermanent() {
    const chatId = $currentChatId;
    if (!chatId) return;
    
    chats.update(allChats => {
      return allChats.map(chat => {
        if (chat.id === chatId && chat.isTemporary) {
          return {
            ...chat,
            isTemporary: false,
            id: Date.now().toString() // Nuovo ID per la chat permanente
          };
        }
        return chat;
      });
    });
    
    // Aggiorna currentChatId con il nuovo ID
    chats.subscribe(allChats => {
      const updatedChat = allChats.find(c => c.id !== chatId && !c.isTemporary && c.title === 'Chat temporanea');
      if (updatedChat) {
        currentChatId.set(updatedChat.id);
      }
    })();
    
    saveChatsToStorage();
  }
</script>

<main class="main-area">
  {#if showError}
    <div class="error-banner">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{errorMessage}</span>
      <button class="error-close" on:click={() => showError = false}>×</button>
    </div>
  {/if}
  
  {#if showSearchBar}
    <div class="search-bar">
      <input
        type="text"
        class="chat-search-input"
        placeholder="Cerca nella chat corrente..."
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
          Token: {currentChatTokens.toLocaleString()} / {maxTokens === Infinity ? 'Illimitati' : maxTokens.toLocaleString()}
        </span>
        {#if maxTokens !== Infinity}
          <div class="token-bar">
            <div class="token-bar-fill" style="width: {Math.min(tokenUsagePercentage, 100)}%"></div>
          </div>
        {/if}
      </div>
      <button class="token-counter-toggle" on:click={() => showTokenCounter = false} title="Nascondi">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  {:else if visibleMessages.length > 0}
    <button class="token-counter-show" on:click={() => showTokenCounter = true} title="Mostra token counter">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </button>
  {/if}
  
  <div class="messages-container" bind:this={messagesContainer}>
    {#if visibleMessages.length === 0}
      <div class="welcome-message">
        {#if !$currentChatId}
          <button class="temporary-chat-button" on:click={() => createTemporaryChat()}>
            <div class="temporary-chat-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <h1 class="welcome-text">Attiva chat temporanea</h1>
          </button>
        {:else}
          <h1 class="welcome-text">In cosa posso essere utile?</h1>
        {/if}
      </div>
    {/if}
    
    {#if isTemporaryChat}
      <div class="temporary-chat-banner">
        <div class="temporary-chat-indicator">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span>Chat temporanea - Non verrà salvata</span>
        </div>
        <button class="convert-to-permanent" on:click={() => convertToPermanent()}>
          Salva chat
        </button>
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
            {:else}
              {message.content}
            {/if}
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
    <button class="scroll-to-top" on:click={scrollToTop} title="Torna all'inizio">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 15l-6-6-6 6"/>
      </svg>
    </button>
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
      <button 
        class="toolbar-button" 
        on:click={() => exportChat('markdown')}
        title="Esporta chat"
        disabled={messages.length === 0}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
    </div>
  {/if}
  <div class="input-container">
    {#if !$isMobile}
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
        <button 
          class="toolbar-button" 
          on:click={() => exportChat('markdown')}
          title="Esporta chat"
          disabled={messages.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    {/if}
      {#if attachedImages.length > 0}
        <div class="attached-images">
          {#each attachedImages as imageItem, index}
            <div class="image-preview" class:selected={selectedImageIndex === index}>
              <img src={imageItem.preview} alt={imageItem.file.name} />
              <div class="image-overlay">
                <button class="image-edit" on:click={() => openImageStyles(index)} title="Modifica immagine">
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
                placeholder="Descrivi un'immagine"
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
    <div class="input-wrapper" class:input-empty={!inputValue.trim()}>
      <div class="attach-button-wrapper" bind:this={attachMenuRef}>
        <button class="attach-button" class:active={showAttachMenu} on:click={handleAttachClick} title="Allega file">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        
        {#if showAttachMenu}
          <div class="attach-menu">
            <button class="menu-item" on:click={() => handleAttachOption('file')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
              <span>Aggiungi foto e file</span>
            </button>
            
            <button class="menu-item" on:click={() => handleAttachOption('business-info')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              <span>Informazioni aziendali</span>
            </button>
            
            <button class="menu-item" on:click={() => handleAttachOption('deep-research')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <span>Deep Research</span>
            </button>
            
            <button class="menu-item" on:click={() => handleAttachOption('agent-mode')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
              </svg>
              <span>Modalità agente</span>
            </button>
            
            <button class="menu-item" on:click={() => handleAttachOption('create-image')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span>Crea immagine</span>
            </button>
            
            <button class="menu-item" on:click={() => handleAttachOption('voice-mode')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              <span>Modalità vocale</span>
            </button>
            
            <div class="menu-divider"></div>
            
            <div 
              class="menu-item-wrapper"
              on:mouseenter={handleMoreOptionsMouseEnter}
              on:mouseleave={handleMoreOptionsMouseLeave}
            >
              <button class="menu-item" on:click={() => handleAttachOption('more-options')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="19" cy="12" r="1"/>
                  <circle cx="5" cy="12" r="1"/>
                </svg>
                <span>Altre opzioni</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              
              {#if showMoreOptions}
                <div class="more-options-menu">
                  <button class="menu-item" on:click={() => handleAttachOption('web-search')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                    </svg>
                    <span>Ricerca sul web</span>
                  </button>
                  
                  <button class="menu-item" on:click={() => handleAttachOption('canvas')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    <span>Canvas</span>
                  </button>
                  
                  <button class="menu-item" on:click={() => handleAttachOption('study-learn')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                      <line x1="8" y1="7" x2="16" y2="7"/>
                      <line x1="8" y1="11" x2="16" y2="11"/>
                      <line x1="8" y1="15" x2="12" y2="15"/>
                    </svg>
                    <span>Studia e impara</span>
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      <input 
        type="file"
        bind:this={fileInput}
        on:change={handleFileSelect}
        accept="image/*"
        multiple
        style="display: none;"
      />
      {#if editingMessageIndex !== null}
        <div class="edit-mode">
          <span class="edit-label">Modifica messaggio</span>
          <button class="edit-cancel" on:click={handleEditCancel}>Annulla</button>
        </div>
      {/if}
      <textarea
        class="message-input"
        class:textarea-input={isTextarea}
        placeholder={editingMessageIndex !== null ? "Modifica il messaggio..." : ($isMobile ? "" : "Fai una domanda (Shift+Enter per nuova riga)")}
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
        <button 
          class="voice-button" 
          class:recording={isRecording}
          title={isRecording ? "Ferma registrazione" : (voiceAvailable ? "Input vocale - Parla per inserire testo" : "Riconoscimento vocale non disponibile")}
          on:click={handleVoiceClick}
          disabled={!voiceAvailable || $isGenerating || editingMessageIndex !== null}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <button 
          class="waveform-button" 
          title="Modalità vocale - Presto in arrivo"
          on:click={() => alert('Modalità vocale - Funzionalità in arrivo')}
          disabled={$isGenerating || editingMessageIndex !== null}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="10" width="3" height="4" rx="1"/>
            <rect x="7" y="8" width="3" height="8" rx="1"/>
            <rect x="12" y="6" width="3" height="12" rx="1"/>
            <rect x="17" y="9" width="3" height="6" rx="1"/>
          </svg>
        </button>
        {#if $isGenerating && editingMessageIndex === null}
          <button 
            class="stop-button" 
            title="Ferma generazione"
            on:click={handleStop}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
        {:else}
          <button 
            class="send-button" 
            title={editingMessageIndex !== null ? "Salva modifica" : "Invia messaggio"}
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
    Nebula AI può commettere errori. I dati dell'area di lavoro non vengono utilizzati per addestrare i modelli.
  </div>
</main>

<style>
  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-primary);
    position: relative;
    overflow: hidden;
    min-height: 0;
  }
  
  .search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    animation: slideDown 0.3s ease;
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

  .welcome-message {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    width: 100%;
  }

  .welcome-text {
    font-size: 32px;
    font-weight: 400;
    color: var(--text-primary);
    text-align: center;
    animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    margin: 0;
  }

  @media (max-width: 768px) {
    .welcome-text {
      font-size: 22px;
      padding: 0 12px;
    }

    .welcome-message {
      min-height: 50vh;
    }

    .messages-container {
      padding: 16px 12px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom));
      gap: 16px;
    }

    .message {
      max-width: 85%;
      padding: 10px 14px;
      font-size: 14px;
      line-height: 1.5;
    }

    .input-container {
      padding: 10px 12px;
      padding-bottom: calc(10px + env(safe-area-inset-bottom));
    }

    .input-wrapper {
      padding: 10px 12px;
      gap: 6px;
    }

    .message-image {
      max-width: 100%;
      max-height: 200px;
      border-radius: 8px;
    }

    .attached-images {
      gap: 6px;
      margin-bottom: 6px;
    }

    .image-preview {
      width: 80px;
      height: 80px;
    }

    .disclaimer {
      font-size: 11px;
      padding: 8px 12px;
      text-align: center;
      line-height: 1.4;
    }

    .message-input {
      font-size: 16px; /* Previene zoom su iOS */
    }

    .voice-button,
    .waveform-button,
    .send-button,
    .attach-button {
      padding: 6px;
      min-width: 36px;
      min-height: 36px;
    }

    .voice-button svg,
    .waveform-button svg,
    .send-button svg,
    .attach-button svg {
      width: 16px;
      height: 16px;
    }
  }

  @media (max-width: 480px) {
    .welcome-text {
      font-size: 20px;
    }

    .messages-container {
      padding: 12px 8px;
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
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
    }

    .input-wrapper {
      padding: 8px 10px;
    }

    .message-image {
      max-height: 180px;
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
    padding: 16px 20px;
    border-radius: 12px;
    animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
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
  }

  .message-images {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }

  .message-image {
    max-width: 300px;
    max-height: 300px;
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
    gap: 4px;
    align-items: center;
  }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--text-secondary);
    animation: typing 1.4s infinite;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.5;
    }
    30% {
      transform: translateY(-10px);
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
    background-color: var(--bg-primary);
    border-top: 1px solid var(--border-color);
    position: relative;
  }

  .attached-images {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
    padding: 0 4px;
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

  .attach-button-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .attach-button {
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
    transform: scale(1) rotate(0deg);
    width: 36px;
    height: 36px;
  }

  .attach-button:hover,
  .attach-button.active {
    color: var(--text-primary);
    background-color: var(--hover-bg);
    transform: scale(1.1);
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
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 15px;
    outline: none;
    padding: 4px 0;
    resize: none;
    min-height: 24px;
    max-height: 200px;
    overflow-y: auto;
    font-family: inherit;
    line-height: 1.5;
    transition: height 0.1s ease-out;
    box-sizing: border-box;
    width: 100%;
  }
  
  .message-input.textarea-input {
    padding: 8px 0;
  }

  .input-wrapper.input-empty .message-input {
    min-height: 20px;
    font-size: 14px;
    height: 20px;
  }

  @media (max-width: 768px) {
    .message-input {
      font-size: 14px;
      min-height: 22px;
    }

    .input-wrapper.input-empty .message-input {
      min-height: 18px;
      font-size: 13px;
      height: 18px;
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
    margin: 8px 0;
    line-height: 1.6;
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

  .voice-button,
  .waveform-button,
  .send-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 4px;
    transform: scale(1);
  }

  .voice-button:disabled,
  .waveform-button:disabled,
  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .voice-button:hover:not(:disabled),
  .waveform-button:hover:not(:disabled),
  .send-button:hover:not(:disabled) {
    color: var(--text-primary);
    background-color: var(--hover-bg);
    transform: scale(1.1);
  }

  .voice-button:active:not(:disabled),
  .waveform-button:active:not(:disabled),
  .send-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  .send-button:not(:disabled) {
    color: var(--accent-blue);
  }

  .send-button:hover:not(:disabled) {
    background-color: rgba(59, 130, 246, 0.1);
    color: var(--accent-blue);
  }

  .voice-button.recording {
    color: #ef4444;
    animation: pulse 1.5s infinite, recordingScale 0.3s ease;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes recordingScale {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
    }
  }

  .disclaimer {
    padding: 12px 24px;
    text-align: center;
    font-size: 11px;
    color: var(--text-secondary);
    border-top: 1px solid var(--border-color);
  }

  .temporary-chat-button {
    background: none;
    border: 2px solid white;
    border-radius: 12px;
    padding: 24px 32px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    transition: all 0.3s ease;
    color: var(--text-primary);
  }

  .temporary-chat-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .temporary-chat-icon {
    color: var(--text-primary);
  }

  .temporary-chat-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 16px;
    animation: slideDown 0.3s ease;
  }

  .temporary-chat-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .temporary-chat-indicator svg {
    color: var(--text-secondary);
  }

  .convert-to-permanent {
    padding: 6px 12px;
    background-color: var(--accent-blue);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .convert-to-permanent:hover {
    background-color: #2563eb;
    transform: translateY(-1px);
  }
</style>
