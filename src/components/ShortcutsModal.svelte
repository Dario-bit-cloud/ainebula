<script>
  import { isShortcutsModalOpen, isMobile } from '../stores/app.js';
  import { onMount } from 'svelte';
  import { t } from '../stores/language.js';
  
  function closeModal() {
    isShortcutsModalOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  const shortcuts = [
    {
      category: 'Tasti di scelta rapida',
      items: [
        { action: 'Cerca chat', keys: ['Ctrl', 'K'] },
        { action: 'Apri nuova chat', keys: ['Ctrl', 'Shift', 'O'] },
        { action: 'Attiva barra laterale', keys: ['Ctrl', 'Shift', 'S'] },
        { action: 'Apri impostazioni', keys: ['Ctrl', ','] }
      ]
    },
    {
      category: 'Chat',
      items: [
        { action: 'Copia ultimo blocco di codice', keys: ['Ctrl', 'Shift', ';'] },
        { action: 'Elimina chat', keys: ['Ctrl', 'Shift', 'Backspace'] },
        { action: 'Focus sull\'input della chat', keys: ['Shift', 'Esc'] },
        { action: 'Aggiungi foto e file', keys: ['Ctrl', 'U'] },
        { action: 'Invia messaggio', keys: ['Enter'] },
        { action: 'Nuova riga', keys: ['Shift', 'Enter'] }
      ]
    },
    {
      category: 'Impostazioni',
      items: [
        { action: 'Mostra scorciatoie', keys: ['Ctrl', '/'] },
        { action: 'Imposta istruzioni personalizzate', keys: ['Ctrl', 'Shift', 'I'] }
      ]
    }
  ];
  
  function formatKey(key) {
    const keyMap = {
      'Ctrl': 'Ctrl',
      'Shift': 'Shift',
      'Alt': 'Alt',
      'Enter': 'Enter',
      'Backspace': '⌫',
      'Esc': 'Esc',
      '/': '/',
      ',': ',',
      ';': ';',
      'O': 'O',
      'S': 'S',
      'K': 'K',
      'U': 'U',
      'I': 'I'
    };
    return keyMap[key] || key;
  }
  
  onMount(() => {
    // Chiudi con Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape' && $isShortcutsModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  });
</script>

{#if $isShortcutsModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal-content" class:mobile={$isMobile}>
      <div class="modal-header">
        <h2 class="modal-title">Tasti di scelta rapida</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        {#if $isMobile}
          <!-- Mobile: mostra messaggio informativo invece delle shortcuts -->
          <div class="mobile-message">
            <div class="mobile-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </div>
            <h3 class="mobile-title">Stai usando un dispositivo mobile</h3>
            <p class="mobile-description">
              Le scorciatoie da tastiera non sono disponibili su dispositivi mobili. 
              Puoi usare i pulsanti e i gesti touch per navigare nell'app.
            </p>
            <div class="mobile-tips">
              <h4>Suggerimenti:</h4>
              <ul>
                <li>Tocca il menu hamburger per aprire la sidebar</li>
                <li>Scorri verso il basso per vedere la cronologia</li>
                <li>Tieni premuto un messaggio per copiarlo</li>
                <li>Usa il pulsante + per allegare file</li>
              </ul>
            </div>
          </div>
        {:else}
          <!-- Desktop: mostra le shortcuts normali -->
          {#each shortcuts as category}
            <div class="shortcut-category">
              <h3 class="category-title">{category.category}</h3>
              <div class="shortcut-list">
                {#each category.items as item}
                  <div class="shortcut-item">
                    <span class="shortcut-action">{item.action}</span>
                    <div class="shortcut-keys">
                      {#each item.keys as key, index}
                        <kbd class="key">{formatKey(key)}</kbd>
                        {#if index < item.keys.length - 1}
                          <span class="key-separator">+</span>
                        {/if}
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        {/if}
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
    align-items: flex-end;
    justify-content: flex-end;
    z-index: 1000;
    padding: 20px;
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
    background-color: #2d2d2d;
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes modalSlideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #3a3a3a;
  }

  .modal-title {
    font-size: 17px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    color: #ffffff;
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

  .modal-body {
    padding: 16px 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .shortcut-category {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .category-title {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .shortcut-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    background-color: #3a3a3a;
    border-radius: 8px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .shortcut-item:hover {
    background-color: #454545;
    transform: translateX(-4px);
  }

  .shortcut-action {
    font-size: 14px;
    color: #ffffff;
    flex: 1;
  }

  .shortcut-keys {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .key {
    padding: 4px 8px;
    background-color: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-width: 24px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .key-separator {
    color: #a0a0a0;
    font-size: 12px;
    margin: 0 2px;
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      align-items: flex-end;
      justify-content: center;
      padding: 0;
    }

    .modal-content {
      max-width: 100%;
      width: 100%;
      max-height: 70vh;
      border-radius: 16px 16px 0 0;
    }

    .modal-body {
      padding: 20px 16px;
    }
  }
  
  /* Stili per il messaggio mobile */
  .mobile-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px;
    gap: 16px;
  }
  
  .mobile-icon {
    color: var(--md-sys-color-primary, #667eea);
    opacity: 0.8;
  }
  
  .mobile-title {
    font-size: 18px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
  }
  
  .mobile-description {
    font-size: 14px;
    color: #a0a0a0;
    line-height: 1.6;
    margin: 0;
    max-width: 300px;
  }
  
  .mobile-tips {
    width: 100%;
    text-align: left;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    margin-top: 8px;
  }
  
  .mobile-tips h4 {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    margin: 0 0 12px 0;
  }
  
  .mobile-tips ul {
    margin: 0;
    padding: 0 0 0 20px;
    font-size: 13px;
    color: #a0a0a0;
    line-height: 1.8;
  }
  
  .mobile-tips li {
    margin-bottom: 4px;
  }
  
  .modal-content.mobile {
    max-height: 80vh;
  }
</style>

