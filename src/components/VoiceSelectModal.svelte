<script>
  import { isVoiceSelectionModalOpen, isMobile, sidebarView } from '../stores/app.js';
  import { createEventDispatcher } from 'svelte';
  import { createNewChat } from '../stores/chat.js';
  
  const dispatch = createEventDispatcher();
  
  const availableVoices = [
    { id: 'juniper', name: 'Juniper', description: 'Aperta e ottimista' },
    { id: 'spruce', name: 'Spruce', description: 'Calma e assertiva' },
    { id: 'arbor', name: 'Arbor', description: 'Disinvolta e versatile' },
    { id: 'vale', name: 'Vale', description: 'Brillante e curiosa' },
    { id: 'ember', name: 'Ember', description: 'Sicura e ottimista' },
    { id: 'cove', name: 'Cove', description: 'Composta e diretta' }
  ];
  
  let selectedVoice = availableVoices[0].id;
  let currentIndex = 0;
  
  $: {
    currentIndex = availableVoices.findIndex(v => v.id === selectedVoice);
    if (currentIndex === -1) currentIndex = 0;
  }
  
  function closeModal() {
    isVoiceSelectionModalOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function selectVoice(voiceId) {
    selectedVoice = voiceId;
  }
  
  function previousVoice() {
    currentIndex = currentIndex > 0 ? currentIndex - 1 : availableVoices.length - 1;
    selectVoice(availableVoices[currentIndex].id);
  }
  
  function nextVoice() {
    currentIndex = currentIndex < availableVoices.length - 1 ? currentIndex + 1 : 0;
    selectVoice(availableVoices[currentIndex].id);
  }
  
  function startNewChat() {
    const selectedVoiceObj = availableVoices.find(v => v.id === selectedVoice);
    dispatch('voiceSelected', selectedVoiceObj);
    createNewChat();
    sidebarView.set('chat');
    closeModal();
  }
  
  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') {
      previousVoice();
    } else if (event.key === 'ArrowRight') {
      nextVoice();
    } else if (event.key === 'Escape') {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if $isVoiceSelectionModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content" class:modal-mobile={$isMobile}>
      <div class="modal-header">
        <h2>Scegli una voce</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="voice-indicator">
          <div class="voice-wave">
            <span class="wave-bar"></span>
            <span class="wave-bar"></span>
            <span class="wave-bar"></span>
            <span class="wave-bar"></span>
          </div>
        </div>
        
        <div class="voice-selector">
          <button class="nav-arrow left" on:click={previousVoice}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          
          <div class="voice-carousel">
            {#each availableVoices as voice, index}
              <div 
                class="voice-option" 
                class:active={voice.id === selectedVoice}
                class:prev={index === currentIndex - 1 || (currentIndex === 0 && index === availableVoices.length - 1)}
                class:next={index === currentIndex + 1 || (currentIndex === availableVoices.length - 1 && index === 0)}
              >
                <h3 class="voice-name">{voice.name}</h3>
                <p class="voice-description">{voice.description}</p>
              </div>
            {/each}
          </div>
          
          <button class="nav-arrow right" on:click={nextVoice}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="primary-button" on:click={startNewChat}>
          Avvia nuova chat
        </button>
        <button class="cancel-button" on:click={closeModal}>
          Annulla
        </button>
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
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: backdropFadeIn 0.3s ease;
  }

  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.4s ease;
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
    padding: 24px 24px 16px 24px;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
    border-radius: 4px;
  }

  .close-button:hover {
    color: var(--text-primary);
    background-color: var(--hover-bg);
  }

  .modal-body {
    padding: 32px 24px;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
  }

  .voice-indicator {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }

  .voice-wave {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 40px;
  }

  .wave-bar {
    width: 4px;
    height: 40px;
    background-color: var(--text-secondary);
    border-radius: 2px;
    animation: waveAnimation 1.2s ease-in-out infinite;
  }

  .wave-bar:nth-child(1) {
    animation-delay: 0s;
  }

  .wave-bar:nth-child(2) {
    animation-delay: 0.2s;
  }

  .wave-bar:nth-child(3) {
    animation-delay: 0.4s;
  }

  .wave-bar:nth-child(4) {
    animation-delay: 0.6s;
  }

  @keyframes waveAnimation {
    0%, 100% {
      height: 20px;
      opacity: 0.5;
    }
    50% {
      height: 40px;
      opacity: 1;
    }
  }

  .voice-selector {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    width: 100%;
    position: relative;
  }

  .nav-arrow {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-primary);
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .nav-arrow:hover {
    background-color: var(--hover-bg);
    border-color: var(--accent-blue);
  }

  .nav-arrow.right {
    background: white;
    color: var(--bg-primary);
    border-color: white;
  }

  .voice-carousel {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    height: 120px;
    overflow: hidden;
  }

  .voice-option {
    position: absolute;
    text-align: center;
    transition: all 0.3s ease;
    opacity: 0.4;
    transform: scale(0.8);
    pointer-events: none;
  }

  .voice-option.active {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
    z-index: 2;
  }

  .voice-option.prev {
    transform: translateX(-100px) scale(0.8);
    opacity: 0.6;
  }

  .voice-option.next {
    transform: translateX(100px) scale(0.8);
    opacity: 0.6;
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

  .modal-footer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 24px 24px 24px;
    border-top: 1px solid var(--border-color);
  }

  .primary-button {
    width: 100%;
    padding: 14px 24px;
    background-color: white;
    color: var(--bg-primary);
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .primary-button:hover {
    background-color: #f5f5f5;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .cancel-button {
    width: 100%;
    padding: 12px 24px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 14px;
    cursor: pointer;
    transition: color 0.2s;
  }

  .cancel-button:hover {
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    .modal-content.modal-mobile {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
      height: 100vh;
    }
    
    .modal-header, .modal-footer {
      padding: 16px;
    }
    
    .modal-body {
      padding: 24px 16px;
    }
    
    .voice-selector {
      gap: 8px;
    }
    
    .nav-arrow {
      width: 36px;
      height: 36px;
    }
  }
</style>

