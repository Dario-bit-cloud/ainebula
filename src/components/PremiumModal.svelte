<script>
  import { isPremiumModalOpen } from '../stores/app.js';
  
  function closeModal() {
    isPremiumModalOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function handleUpgrade() {
    // Qui puoi aggiungere la logica per aprire la pagina di upgrade
    alert('Funzionalità Premium - Upgrade in arrivo!');
    closeModal();
  }
</script>

{#if $isPremiumModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="premium-modal-title">
      <div class="modal-header">
        <div class="premium-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h2 id="premium-modal-title">Funzionalità Premium</h2>
        <button class="close-button" on:click={closeModal} aria-label="Chiudi">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="premium-message">
          <p class="main-message">L'analisi delle immagini richiede un abbonamento Premium.</p>
          <p class="sub-message">Passa a Premium per sbloccare questa e altre funzionalità avanzate.</p>
        </div>
        
        <div class="premium-features">
          <div class="feature-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Analisi di immagini e foto</span>
          </div>
          <div class="feature-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Modelli AI più avanzati</span>
          </div>
          <div class="feature-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Chat illimitate</span>
          </div>
          <div class="feature-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Supporto prioritario</span>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-button" on:click={closeModal}>
          Annulla
        </button>
        <button class="upgrade-button" on:click={handleUpgrade}>
          Passa a Premium
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
    background-color: rgba(0, 0, 0, 0);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    padding: 20px;
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes backdropFadeIn {
    to {
      background-color: rgba(0, 0, 0, 0.7);
    }
  }

  .modal-content {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    max-width: 480px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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
    gap: 12px;
    padding: 24px;
    border-bottom: 1px solid var(--border-color);
    position: relative;
  }

  .premium-icon {
    color: #fbbf24;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-header h2 {
    font-size: 22px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    flex: 1;
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
    padding: 24px;
    flex: 1;
    overflow-y: auto;
  }

  .premium-message {
    text-align: center;
    margin-bottom: 24px;
  }

  .main-message {
    font-size: 18px;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0 0 8px 0;
  }

  .sub-message {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  .premium-features {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 24px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background-color: var(--bg-tertiary);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    transition: background-color 0.2s;
  }

  .feature-item:hover {
    background-color: var(--hover-bg);
  }

  .feature-item svg {
    color: #fbbf24;
    flex-shrink: 0;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid var(--border-color);
  }

  .cancel-button,
  .upgrade-button {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .cancel-button {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .cancel-button:hover {
    background-color: var(--hover-bg);
  }

  .upgrade-button {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: #000;
    font-weight: 600;
  }

  .upgrade-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
  }

  .upgrade-button:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 0;
    }

    .modal-content {
      max-width: 100%;
      max-height: 100vh;
      height: 100vh;
      border-radius: 0;
      margin: 0;
    }

    .modal-header {
      padding: 20px 16px;
    }

    .modal-header h2 {
      font-size: 20px;
    }

    .modal-body {
      padding: 20px 16px;
    }

    .main-message {
      font-size: 16px;
    }

    .feature-item {
      padding: 10px;
      font-size: 13px;
    }

    .modal-footer {
      padding: 16px;
      flex-direction: column-reverse;
    }

    .cancel-button,
    .upgrade-button {
      width: 100%;
      padding: 12px;
    }
  }
</style>

