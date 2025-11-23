<script>
  let inputValue = '';
  let messages = [];
  
  function handleSubmit() {
    if (inputValue.trim()) {
      messages = [...messages, { type: 'user', content: inputValue }];
      inputValue = '';
      // Simulazione risposta AI
      setTimeout(() => {
        messages = [...messages, { type: 'ai', content: 'Grazie per il tuo messaggio. Sono Nebula AI e sono qui per aiutarti!' }];
      }, 1000);
    }
  }
  
  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }
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
          <div class="message-content">
            {message.content}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <div class="input-container">
    <div class="input-wrapper">
      <button class="attach-button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <input 
        type="text" 
        class="message-input" 
        placeholder="Fai una domanda"
        bind:value={inputValue}
        on:keypress={handleKeyPress}
      />
      <div class="input-actions">
        <button class="voice-button" title="Input vocale">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <button class="waveform-button" title="Waveform">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="10" width="3" height="4" rx="1"/>
            <rect x="7" y="8" width="3" height="8" rx="1"/>
            <rect x="12" y="6" width="3" height="12" rx="1"/>
            <rect x="17" y="9" width="3" height="6" rx="1"/>
          </svg>
        </button>
      </div>
    </div>
    <button class="company-info-button">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
      <span>Informazioni aziendali</span>
    </button>
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
    animation: fadeIn 0.3s ease-in;
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

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .input-container {
    padding: 16px 24px;
    background-color: var(--bg-primary);
    border-top: 1px solid var(--border-color);
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
    transition: color 0.2s;
    flex-shrink: 0;
  }

  .attach-button:hover {
    color: var(--text-primary);
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
  .waveform-button {
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

  .voice-button:hover,
  .waveform-button:hover {
    color: var(--text-primary);
  }

  .company-info-button {
    margin-top: 12px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .company-info-button:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
    border-color: var(--border-color);
  }

  .disclaimer {
    padding: 12px 24px;
    text-align: center;
    font-size: 11px;
    color: var(--text-secondary);
    border-top: 1px solid var(--border-color);
  }
</style>

