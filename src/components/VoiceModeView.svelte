<script>
  import { isVoiceModeActive, selectedVoice, availableVoices } from '../stores/voiceSettings.js';
  import { isMobile } from '../stores/app.js';
  
  let isMicrophoneEnabled = false;
  let showMicrophonePrompt = true;
  
  $: currentVoice = availableVoices.find(v => v.id === $selectedVoice) || availableVoices[0];
  
  function handleMicrophoneClick() {
    // Qui andrà la logica per abilitare/disabilitare il microfono
    isMicrophoneEnabled = !isMicrophoneEnabled;
    showMicrophonePrompt = false;
  }
  
  function handleClose() {
    isVoiceModeActive.set(false);
  }
  
  function handleToggleView() {
    // Qui andrà la logica per toggle della vista
    console.log('Toggle view');
  }
</script>

{#if $isVoiceModeActive}
  <div class="voice-mode-view" class:mobile={$isMobile}>
    <button class="toggle-view-button" on:click={handleToggleView} title="Toggle view">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
    </button>
    
    <div class="voice-content">
      <div class="avatar-placeholder">
        <div class="avatar-circle"></div>
      </div>
      
      {#if showMicrophonePrompt && !isMicrophoneEnabled}
        <div class="microphone-prompt">
          <p>Abilita l'accesso al microfono nelle Impostazioni</p>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
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
        class:muted={!isMicrophoneEnabled}
        on:click={handleMicrophoneClick}
        title={isMicrophoneEnabled ? "Disabilita microfono" : "Abilita microfono"}
      >
        {#if isMicrophoneEnabled}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        {:else}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
            <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"/>
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
    background-color: var(--bg-primary);
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
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-view-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .voice-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    width: 100%;
    max-width: 600px;
  }

  .avatar-placeholder {
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
    background-color: #C4C4C4;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.8;
    }
    50% {
      opacity: 1;
    }
  }

  .microphone-prompt {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);
    font-size: 14px;
    margin-top: 16px;
  }

  .voice-info {
    text-align: center;
    margin-top: 24px;
  }

  .voice-name {
    font-size: 20px;
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
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    color: white;
  }

  .control-button.microphone {
    background-color: #ef4444;
  }

  .control-button.microphone.muted {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .control-button.microphone:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  .control-button.close {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .control-button.close:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
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
    
    .avatar-circle {
      width: 150px;
      height: 150px;
    }
    
    .control-button {
      width: 48px;
      height: 48px;
    }
  }
</style>

