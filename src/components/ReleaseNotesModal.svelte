<script>
  export let isOpen = false;
  
  function closeModal() {
    isOpen = false;
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape' && isOpen) {
      closeModal();
    }
  }
  
  const releases = [
    {
      version: '1.0.0',
      date: new Date().toISOString().split('T')[0], // Data corrente
      type: 'major',
      features: [
        '🚀 Lancio stabile di Nebula AI',
        '💬 Sistema di chat avanzato con supporto multi-modello AI',
        '🔐 Autenticazione sicura con JWT e passkeys (WebAuthn)',
        '📁 Gestione progetti e organizzazione chat',
        '🔒 Sistema di crittografia end-to-end per i messaggi',
        '🎨 Interfaccia personalizzabile con temi e personalizzazione',
        '🌍 Supporto multi-lingua (Italiano, Inglese, Spagnolo, Francese, Tedesco)',
        '📤 Sistema di condivisione link per le chat',
        '💾 Esportazione dati e backup automatici',
        '🎨 Generazione immagini AI integrata',
        '📚 Prompt library personalizzabile',
        '🔬 Modalità "Deep Research" per analisi approfondite',
        '🖼️ Supporto per immagini nelle chat (visione AI)',
        '⚙️ Impostazioni AI avanzate (temperature, max tokens, ecc.)',
        '🔗 Supporto per multiple API providers',
        '🛡️ Sicurezza migliorata con CORS configurato e cookie sicuri',
        '📊 Monitoraggio e logging avanzati',
        '🚀 Ottimizzazioni performance e caching intelligente'
      ]
    }
  ];
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="release-modal-title">
    <div class="modal-content">
      <button class="close-button" on:click={closeModal} aria-label="Chiudi">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      
      <div class="modal-body">
        <div class="release-header">
          <h1 id="release-modal-title" class="release-title">Note sulla Versione</h1>
          <p class="release-intro">
            Scopri tutte le novità, miglioramenti e correzioni di bug nelle ultime versioni di Nebula AI.
          </p>
        </div>
        
        <div class="releases-list">
          {#each releases as release}
            <div class="release-card" class:major={release.type === 'major'}>
              <div class="release-header-card">
                <div class="release-version">
                  <span class="version-label">v{release.version}</span>
                  {#if release.type === 'major'}
                    <span class="version-badge major">Major</span>
                  {:else if release.type === 'minor'}
                    <span class="version-badge minor">Minor</span>
                  {:else}
                    <span class="version-badge patch">Patch</span>
                  {/if}
                </div>
                <div class="release-date">{new Date(release.date).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
              
              <div class="release-features">
                <h3 class="features-title">Nuove Funzionalità</h3>
                <ul class="features-list">
                  {#each release.features as feature}
                    <li>{feature}</li>
                  {/each}
                </ul>
              </div>
            </div>
          {/each}
        </div>
        
        <div class="release-footer">
          <p>Resta aggiornato! Controlla regolarmente questa pagina per le ultime novità.</p>
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
    background-color: rgba(0, 0, 0, 0);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    overflow-y: auto;
  }

  @keyframes backdropFadeIn {
    to {
      background-color: rgba(0, 0, 0, 0.75);
    }
  }

  .modal-content {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    margin: auto;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(30px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .close-button {
    position: absolute;
    top: 20px;
    right: 20px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 8px;
    z-index: 10;
  }

  .close-button:hover {
    color: var(--text-primary);
    background-color: var(--hover-bg);
    transform: rotate(90deg);
  }

  .modal-body {
    padding: 32px 28px;
    overflow-y: auto;
    flex: 1;
  }

  .release-header {
    margin-bottom: 32px;
  }

  .release-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 14px 0;
    line-height: 1.2;
  }

  .release-intro {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
  }

  .releases-list {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .release-card {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s;
  }

  .release-card.major {
    border-color: var(--accent-blue);
  }

  .release-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .release-header-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .release-version {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .version-label {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .version-badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .version-badge.major {
    background-color: var(--accent-blue);
    color: white;
  }

  .version-badge.minor {
    background-color: #10b981;
    color: white;
  }

  .version-badge.patch {
    background-color: #f59e0b;
    color: white;
  }

  .release-date {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .release-features {
    margin-top: 16px;
  }

  .features-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
  }

  .features-list {
    margin: 0;
    padding-left: 20px;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.8;
  }

  .features-list li {
    margin-bottom: 8px;
  }

  .release-footer {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--border-color);
    text-align: center;
  }

  .release-footer p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 12px;
      align-items: flex-start;
    }

    .modal-content {
      max-height: 95vh;
      border-radius: 12px;
      margin-top: 20px;
    }

    .modal-body {
      padding: 24px 20px;
    }

    .release-title {
      font-size: 24px;
    }

    .release-header-card {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
</style>

