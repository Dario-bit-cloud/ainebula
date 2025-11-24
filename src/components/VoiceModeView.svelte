<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { isVoiceModeActive, selectedVoice, availableVoices } from '../stores/voiceSettings.js';
  import { isMobile } from '../stores/app.js';
  import { 
    initVoiceRecognition, 
    startListening, 
    stopListening, 
    isVoiceAvailable, 
    requestMicrophonePermission, 
    checkMicrophonePermission,
    speakText,
    stopSpeaking,
    isSpeaking,
    isListeningActive
  } from '../services/voiceService.js';
  import { 
    chats, 
    currentChatId, 
    currentChat, 
    isGenerating, 
    addMessage, 
    createNewChat, 
    updateMessage 
  } from '../stores/chat.js';
  import { selectedModel } from '../stores/models.js';
  import { generateResponseStream } from '../services/aiService.js';
  import { currentAbortController, setAbortController } from '../stores/abortController.js';
  
  let isMicrophoneEnabled = false;
  let showMicrophonePrompt = true;
  let recognition = null;
  let currentTranscript = '';
  let interimTranscript = '';
  let isProcessing = false;
  let listeningState = 'idle'; // 'idle', 'listening', 'processing', 'speaking'
  let errorMessage = '';
  let showError = false;
  
  $: currentVoice = availableVoices.find(v => v.id === $selectedVoice) || availableVoices[0];
  
  onMount(async () => {
    // Verifica disponibilità microfono
    if (!isVoiceAvailable()) {
      showError = true;
      errorMessage = 'Il riconoscimento vocale non è supportato nel tuo browser';
      return;
    }
    
    // Controlla permessi microfono
    const permissionCheck = await checkMicrophonePermission();
    if (!permissionCheck.available) {
      showMicrophonePrompt = true;
      if (permissionCheck.error === 'permission-denied') {
        errorMessage = 'Permesso microfono negato. Abilitalo nelle impostazioni del browser.';
      } else if (permissionCheck.error === 'no-device') {
        errorMessage = 'Nessun microfono rilevato.';
      } else {
        errorMessage = 'Errore nel controllo del microfono.';
      }
    } else {
      isMicrophoneEnabled = true;
      showMicrophonePrompt = false;
      initializeVoiceRecognition();
    }
  });
  
  onDestroy(() => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
    }
    stopListening();
    stopSpeaking();
  });
  
  let silenceTimer = null;
  
  function initializeVoiceRecognition() {
    recognition = initVoiceRecognition(
      (transcript) => {
        // Risultato finale - invia il messaggio
        if (transcript.trim() && !isProcessing) {
          // Cancella il timer di silenzio se presente
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
          handleVoiceMessage(transcript.trim());
        }
      },
      (error) => {
        console.error('Voice recognition error:', error);
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
        listeningState = 'idle';
        if (error === 'not-allowed' || error === 'no-speech') {
          showError = true;
          errorMessage = 'Errore nel riconoscimento vocale. Riprova.';
        }
      },
      (interim) => {
        // Risultato intermedio - mostra feedback visivo
        interimTranscript = interim;
        
        // Reset timer silenzio quando c'è attività vocale
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        
        // Se c'è testo intermedio, imposta un timer per rilevare fine frase
        // NON inviare immediatamente - aspetta un silenzio più lungo
        // Il timeout è gestito nel servizio vocale stesso
      }
    );
  }
  
  async function handleMicrophoneClick() {
    if (!isMicrophoneEnabled) {
      // Richiedi permesso
      const result = await requestMicrophonePermission();
      if (result.success) {
        isMicrophoneEnabled = true;
        showMicrophonePrompt = false;
        showError = false;
        initializeVoiceRecognition();
        startVoiceListening();
      } else {
        showError = true;
        if (result.error === 'permission-denied') {
          errorMessage = 'Permesso microfono negato. Abilitalo nelle impostazioni del browser.';
        } else {
          errorMessage = 'Errore nell\'accesso al microfono.';
        }
      }
    } else {
      if (listeningState === 'listening') {
        stopVoiceListening();
      } else if (listeningState === 'idle' || listeningState === 'speaking') {
        startVoiceListening();
      }
    }
  }
  
  function startVoiceListening() {
    if (!recognition && isMicrophoneEnabled) {
      initializeVoiceRecognition();
    }
    if (recognition && !isListeningActive()) {
      currentTranscript = '';
      interimTranscript = '';
      listeningState = 'listening';
      stopSpeaking(); // Ferma eventuale TTS in corso
      startListening();
    }
  }
  
  function stopVoiceListening() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    stopListening();
    listeningState = 'idle';
    currentTranscript = '';
    interimTranscript = '';
  }
  
  async function handleVoiceMessage(messageText) {
    if (isProcessing || !messageText.trim()) return;
    
    isProcessing = true;
    listeningState = 'processing';
    currentTranscript = messageText;
    interimTranscript = '';
    stopListening();
    
    try {
      // Crea o usa chat corrente
      const chatId = $currentChatId || createNewChat();
      
      // Aggiungi messaggio utente
      const userMessage = {
        type: 'user',
        content: messageText,
        timestamp: new Date().toISOString()
      };
      addMessage(chatId, userMessage);
      
      await tick();
      
      isGenerating.set(true);
      
      // Crea AbortController
      const abortController = new AbortController();
      setAbortController(abortController);
      
      // Crea messaggio AI vuoto per lo streaming
      const aiMessageId = Date.now().toString();
      const aiMessage = {
        id: aiMessageId,
        type: 'ai',
        content: '',
        timestamp: new Date().toISOString()
      };
      addMessage(chatId, aiMessage);
      
      // Ottieni cronologia chat
      const currentChatData = get(currentChat);
      if (!currentChatData) {
        throw new Error('Chat corrente non disponibile');
      }
      
      const chatHistory = currentChatData.messages.slice(0, -1);
      const messageIndex = currentChatData.messages.length - 1;
      
      let fullResponse = '';
      
      // Genera risposta con streaming
      for await (const chunk of generateResponseStream(
        messageText,
        $selectedModel,
        chatHistory,
        [],
        abortController
      )) {
        fullResponse += chunk;
        updateMessage(chatId, messageIndex, { content: fullResponse });
        await tick();
      }
      
      // Salva risposta finale
      updateMessage(chatId, messageIndex, { content: fullResponse });
      
      // Leggi la risposta ad alta voce
      if (fullResponse.trim()) {
        listeningState = 'speaking';
        // Pulisci il testo da markdown per una lettura migliore
        const cleanText = cleanTextForTTS(fullResponse);
        speakText(cleanText, $selectedVoice, () => {
          // Quando finisce la lettura, riprendi l'ascolto
          listeningState = 'idle';
          isProcessing = false;
          // Riavvia l'ascolto automaticamente
          setTimeout(() => {
            if ($isVoiceModeActive && isMicrophoneEnabled) {
              startVoiceListening();
            }
          }, 500);
        });
      } else {
        listeningState = 'idle';
        isProcessing = false;
        setTimeout(() => {
          if ($isVoiceModeActive && isMicrophoneEnabled) {
            startVoiceListening();
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('Error in voice mode:', error);
      listeningState = 'idle';
      isProcessing = false;
      showError = true;
      errorMessage = 'Errore nell\'invio del messaggio. Riprova.';
      
      // Riavvia l'ascolto dopo un errore
      setTimeout(() => {
        if ($isVoiceModeActive && isMicrophoneEnabled) {
          startVoiceListening();
        }
      }, 2000);
    } finally {
      isGenerating.set(false);
      setAbortController(null);
    }
  }
  
  function cleanTextForTTS(text) {
    // Rimuovi markdown e formattazione per una lettura migliore
    return text
      .replace(/```[\s\S]*?```/g, '') // Rimuovi blocchi di codice
      .replace(/`([^`]+)`/g, '$1') // Rimuovi codice inline
      .replace(/#{1,6}\s+/g, '') // Rimuovi header markdown
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Rimuovi grassetto
      .replace(/\*([^*]+)\*/g, '$1') // Rimuovi corsivo
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Rimuovi link
      .replace(/\n{2,}/g, '. ') // Sostituisci doppie newline con punto
      .replace(/\n/g, ' ') // Sostituisci newline con spazio
      .trim();
  }
  
  function handleClose() {
    stopVoiceListening();
    stopSpeaking();
    isVoiceModeActive.set(false);
  }
  
  function handleToggleView() {
    // Toggle tra modalità vocale e chat normale
    handleClose();
  }
  
  // Auto-start quando la modalità vocale viene attivata
  $: {
    if ($isVoiceModeActive && isMicrophoneEnabled && listeningState === 'idle' && !isProcessing) {
      tick().then(() => {
        startVoiceListening();
      });
    }
  }
</script>

{#if $isVoiceModeActive}
  <div class="voice-mode-view" class:mobile={$isMobile}>
    <button class="toggle-view-button" on:click={handleToggleView} title="Esci dalla modalità vocale">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
    </button>
    
    <div class="voice-content">
      <div class="avatar-container">
        <div 
          class="avatar-circle" 
          class:listening={listeningState === 'listening'}
          class:processing={listeningState === 'processing'}
          class:speaking={listeningState === 'speaking'}
        >
          {#if listeningState === 'listening'}
            <div class="pulse-ring"></div>
            <div class="pulse-ring delay-1"></div>
            <div class="pulse-ring delay-2"></div>
          {/if}
          {#if listeningState === 'processing'}
            <div class="processing-spinner"></div>
          {/if}
          {#if listeningState === 'speaking'}
            <div class="speaking-waves">
              <div class="wave"></div>
              <div class="wave"></div>
              <div class="wave"></div>
            </div>
          {/if}
        </div>
      </div>
      
      {#if showError}
        <div class="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>{errorMessage}</span>
        </div>
      {/if}
      
      {#if showMicrophonePrompt && !isMicrophoneEnabled}
        <div class="microphone-prompt">
          <p>Abilita l'accesso al microfono per utilizzare la modalità vocale</p>
          <button class="enable-button" on:click={handleMicrophoneClick}>
            Abilita microfono
          </button>
        </div>
      {/if}
      
      {#if listeningState === 'listening'}
        <div class="status-message listening">
          <p class="status-text">In ascolto...</p>
          {#if interimTranscript}
            <p class="transcript-preview">{interimTranscript}</p>
          {/if}
        </div>
      {:else if listeningState === 'processing'}
        <div class="status-message processing">
          <p class="status-text">Elaborazione in corso...</p>
          {#if currentTranscript}
            <p class="transcript-preview">{currentTranscript}</p>
          {/if}
        </div>
      {:else if listeningState === 'speaking'}
        <div class="status-message speaking">
          <p class="status-text">Lettura risposta...</p>
        </div>
      {:else if isMicrophoneEnabled}
        <div class="status-message idle">
          <p class="status-text">Pronto ad ascoltare</p>
          <p class="status-hint">Clicca il microfono per iniziare</p>
        </div>
      {/if}
      
      <div class="voice-info">
        <p class="voice-name">{currentVoice.name}</p>
        <p class="voice-description">{currentVoice.description}</p>
      </div>
    </div>
    
    <div class="voice-controls">
      <button 
        class="control-button microphone" 
        class:active={listeningState === 'listening'}
        class:disabled={!isMicrophoneEnabled || isProcessing}
        on:click={handleMicrophoneClick}
        disabled={!isMicrophoneEnabled || isProcessing}
        title={listeningState === 'listening' ? "Ferma ascolto" : "Inizia ascolto"}
      >
        {#if listeningState === 'listening'}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        {:else if listeningState === 'processing' || listeningState === 'speaking'}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        {:else}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        {/if}
      </button>
      
      <button 
        class="control-button close" 
        on:click={handleClose}
        title="Chiudi modalità vocale"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .voice-mode-view {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
    z-index: 999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .toggle-view-button {
    position: absolute;
    top: 24px;
    right: 24px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-view-button:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  .voice-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 32px;
    width: 100%;
    max-width: 600px;
  }

  .avatar-container {
    position: relative;
    width: 200px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .avatar-circle {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
  }

  .avatar-circle.listening {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    box-shadow: 0 10px 40px rgba(245, 87, 108, 0.4);
    animation: pulse 2s ease-in-out infinite;
  }

  .avatar-circle.processing {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    box-shadow: 0 10px 40px rgba(79, 172, 254, 0.4);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .avatar-circle.speaking {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    box-shadow: 0 10px 40px rgba(67, 233, 123, 0.4);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  .pulse-ring {
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.6);
    animation: ripple 2s ease-out infinite;
  }

  .pulse-ring.delay-1 {
    animation-delay: 0.5s;
  }

  .pulse-ring.delay-2 {
    animation-delay: 1s;
  }

  @keyframes ripple {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }

  .processing-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .speaking-waves {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .wave {
    width: 8px;
    height: 40px;
    background: white;
    border-radius: 4px;
    animation: wave 1s ease-in-out infinite;
  }

  .wave:nth-child(2) {
    animation-delay: 0.2s;
  }

  .wave:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes wave {
    0%, 100% {
      transform: scaleY(0.5);
    }
    50% {
      transform: scaleY(1);
    }
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    font-size: 14px;
    max-width: 400px;
    text-align: center;
  }

  .microphone-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: var(--text-primary);
    font-size: 14px;
    text-align: center;
  }

  .enable-button {
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .enable-button:hover {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .status-message {
    text-align: center;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .status-text {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .status-hint {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  .transcript-preview {
    font-size: 16px;
    color: var(--text-secondary);
    font-style: italic;
    margin: 0;
    padding: 12px 20px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    max-width: 500px;
    word-break: break-word;
  }

  .voice-info {
    text-align: center;
  }

  .voice-name {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
  }

  .voice-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  .voice-controls {
    display: flex;
    gap: 16px;
    justify-content: center;
    width: 100%;
    padding-bottom: 24px;
  }

  .control-button {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
    color: white;
    position: relative;
  }

  .control-button.microphone {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
  }

  .control-button.microphone.active {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
    animation: pulse-button 2s ease-in-out infinite;
  }

  .control-button.microphone:hover:not(.disabled) {
    transform: scale(1.1);
    box-shadow: 0 6px 30px rgba(239, 68, 68, 0.5);
  }

  .control-button.microphone.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @keyframes pulse-button {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  .control-button.close {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
  }

  .control-button.close:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    .voice-mode-view.mobile {
      padding: 16px;
    }
    
    .toggle-view-button {
      top: 16px;
      right: 16px;
    }
    
    .avatar-container {
      width: 150px;
      height: 150px;
    }

    .avatar-circle {
      width: 150px;
      height: 150px;
    }

    .pulse-ring {
      width: 150px;
      height: 150px;
    }
    
    .control-button {
      width: 56px;
      height: 56px;
    }

    .status-text {
      font-size: 18px;
    }

    .voice-name {
      font-size: 20px;
    }
  }
</style>
