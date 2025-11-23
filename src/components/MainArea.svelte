<script>
  import { onMount } from 'svelte';
  import { chats, currentChatId, currentChat, isGenerating, addMessage, createNewChat } from '../stores/chat.js';
  import { selectedModel } from '../stores/models.js';
  import { generateResponse } from '../services/aiService.js';
  import { initVoiceRecognition, startListening, stopListening, isVoiceAvailable } from '../services/voiceService.js';
  import { isPremiumModalOpen } from '../stores/app.js';
  
  let inputValue = '';
  let inputRef;
  let isRecording = false;
  let voiceAvailable = false;
  let fileInput;
  let attachedImages = [];
  
  onMount(() => {
    voiceAvailable = isVoiceAvailable();
    
    // Inizializza riconoscimento vocale
    if (voiceAvailable) {
      initVoiceRecognition(
        (transcript) => {
          inputValue = transcript;
          stopListening();
          isRecording = false;
        },
        (error) => {
          console.error('Voice recognition error:', error);
          isRecording = false;
          stopListening();
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
    
    // Cleanup
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  });
  
  async function handleSubmit() {
    console.log('handleSubmit chiamato');
    const hasText = inputValue.trim().length > 0;
    const hasImages = attachedImages.length > 0;
    
    console.log('Stato:', { hasText, hasImages, isGenerating: $isGenerating, inputValue });
    
    // Se ci sono immagini, mostra il modal premium invece di inviare
    if (hasImages) {
      isPremiumModalOpen.set(true);
      return;
    }
    
    if (hasText && !$isGenerating) {
      console.log('Invio messaggio...');
      const chatId = $currentChatId || createNewChat();
      
      const userMessage = { 
        type: 'user', 
        content: inputValue.trim() || '',
        timestamp: new Date().toISOString() 
      };
      
      console.log('Aggiungo messaggio utente:', userMessage);
      addMessage(chatId, userMessage);
      const messageText = inputValue.trim();
      
      inputValue = '';
      attachedImages = [];
      
      isGenerating.set(true);
      
      try {
        console.log('Chiamata API con:', { messageText, model: $selectedModel, chatId });
        const response = await generateResponse(messageText, $selectedModel, $currentChat?.messages || [], []);
        console.log('Risposta ricevuta:', response);
        const aiMessage = { type: 'ai', content: response, timestamp: new Date().toISOString() };
        addMessage(chatId, aiMessage);
      } catch (error) {
        console.error('Error generating response:', error);
        const errorMessage = error.message || 'Si è verificato un errore sconosciuto.';
        addMessage(chatId, { 
          type: 'ai', 
          content: `❌ Errore: ${errorMessage}`, 
          timestamp: new Date().toISOString() 
        });
      } finally {
        isGenerating.set(false);
      }
    } else {
      console.log('Messaggio non inviato:', { hasText, hasImages, isGenerating: $isGenerating });
    }
  }
  
  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }
  
  function handleVoiceClick() {
    if (!voiceAvailable) {
      alert('Il riconoscimento vocale non è disponibile nel tuo browser.');
      return;
    }
    
    if (isRecording) {
      stopListening();
      isRecording = false;
    } else {
      startListening();
      isRecording = true;
    }
  }
  
  function handleAttachClick() {
    fileInput?.click();
  }
  
  async function handleFileSelect(event) {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Se ci sono immagini, mostra il modal premium
    if (imageFiles.length > 0) {
      isPremiumModalOpen.set(true);
      // Reset input per permettere di selezionare di nuovo lo stesso file
      if (fileInput) {
        fileInput.value = '';
      }
      return;
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
  }
  
  $: messages = $currentChat?.messages || [];
</script>

<main class="main-area">
  {#if messages.length === 0}
    <div class="welcome-section">
      <h1 class="welcome-text">In cosa posso essere utile?</h1>
    </div>
  {:else}
    <div class="messages-container">
      {#each messages as message}
        <div class="message" class:user-message={message.type === 'user'} class:ai-message={message.type === 'ai'}>
              {#if message.images && message.images.length > 0}
            <div class="message-images">
              {#each message.images as image}
                <img src={image.url} alt={image.name} class="message-image" on:click={() => window.open(image.url, '_blank')} />
              {/each}
            </div>
          {/if}
          {#if message.content}
            <div class="message-content">
              {message.content}
            </div>
          {/if}
        </div>
      {/each}
      {#if $isGenerating}
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
  {/if}
  
  <div class="input-container">
      {#if attachedImages.length > 0}
        <div class="attached-images">
          {#each attachedImages as imageItem, index}
            <div class="image-preview">
              <img src={imageItem.preview} alt={imageItem.file.name} />
              <button class="image-remove" on:click={() => removeImage(index)} title="Rimuovi">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          {/each}
        </div>
      {/if}
    <div class="input-wrapper">
      <button class="attach-button" on:click={handleAttachClick} title="Allega file">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
        </svg>
      </button>
      <input 
        type="file"
        bind:this={fileInput}
        on:change={handleFileSelect}
        accept="image/*"
        multiple
        style="display: none;"
      />
      <input 
        type="text" 
        class="message-input" 
        placeholder="Fai una domanda"
        bind:value={inputValue}
        bind:this={inputRef}
        on:keydown={handleKeyPress}
        disabled={$isGenerating}
      />
      <div class="input-actions">
        <button 
          class="voice-button" 
          class:recording={isRecording}
          title={voiceAvailable ? "Input vocale" : "Riconoscimento vocale non disponibile"}
          on:click={handleVoiceClick}
          disabled={!voiceAvailable || $isGenerating}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <button class="waveform-button" title="Waveform" disabled={$isGenerating}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="10" width="3" height="4" rx="1"/>
            <rect x="7" y="8" width="3" height="8" rx="1"/>
            <rect x="12" y="6" width="3" height="12" rx="1"/>
            <rect x="17" y="9" width="3" height="6" rx="1"/>
          </svg>
        </button>
        <button 
          class="send-button" 
          title="Invia messaggio"
          on:click={handleSubmit}
          disabled={$isGenerating || (!inputValue.trim() && attachedImages.length === 0)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
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
  }

  .welcome-section {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .welcome-text {
    font-size: 32px;
    font-weight: 400;
    color: var(--text-primary);
    text-align: center;
    animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @media (max-width: 768px) {
    .welcome-text {
      font-size: 22px;
      padding: 0 12px;
    }

    .welcome-section {
      padding: 20px 12px;
    }

    .messages-container {
      padding: 16px 12px;
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
      gap: 12px;
    }

    .message {
      max-width: 90%;
      padding: 8px 12px;
      font-size: 13px;
    }

    .input-container {
      padding: 8px;
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
  }

  .message:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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

  .image-preview:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .input-container {
    padding: 16px 24px;
    background-color: var(--bg-primary);
    border-top: 1px solid var(--border-color);
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
  }

  .input-wrapper:focus-within {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
  }

  .attach-button:hover {
    color: var(--text-primary);
    background-color: var(--hover-bg);
    transform: scale(1.1) rotate(90deg);
  }

  .message-input {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 15px;
    outline: none;
    padding: 4px 0;
  }

  .message-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .message-input::placeholder {
    color: var(--text-secondary);
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
</style>
