<script>
  import { onMount } from 'svelte';
  import { markPWAInstallPromptAsShown } from '../utils/mobile.js';
  
  export let isOpen = false;
  
  let isInstalled = false;
  let installPrompt = null;
  
  onMount(() => {
    // Verifica se l'app è già installata
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled = true;
    }
    
    // Ascolta l'evento beforeinstallprompt per Chrome/Edge
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPrompt = e;
    });
  });
  
  function closeModal() {
    isOpen = false;
    // Segna che il prompt è stato mostrato quando l'utente chiude il modal
    markPWAInstallPromptAsShown();
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
  
  async function handleInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        isInstalled = true;
        installPrompt = null;
        // Segna che il prompt è stato mostrato e l'installazione è stata accettata
        markPWAInstallPromptAsShown();
      }
    }
  }
  
  function detectOS() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android/i.test(userAgent)) return 'android';
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return 'ios';
    if (/win/i.test(userAgent)) return 'windows';
    if (/mac/i.test(userAgent)) return 'macos';
    if (/linux/i.test(userAgent)) return 'linux';
    return 'unknown';
  }
  
  $: currentOS = detectOS();
  $: showInstallButton = installPrompt && !isInstalled && (currentOS === 'windows' || currentOS === 'android');
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
    <div class="modal-content">
      <button class="close-button" on:click={closeModal} aria-label="Chiudi">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      
      <div class="modal-body">
        <div class="download-header">
          <h1 id="download-modal-title" class="download-title">Installa Nebula AI</h1>
          <p class="download-intro">
            Installa Nebula AI sul tuo dispositivo per un accesso rapido e un'esperienza ottimizzata. 
            Crea un collegamento sul desktop o nella schermata home.
          </p>
        </div>
        
        {#if isInstalled}
          <div class="installed-banner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Nebula AI è già installato sul tuo dispositivo!</span>
          </div>
        {/if}
        
        {#if showInstallButton}
          <div class="install-section">
            <button class="install-button" on:click={handleInstall}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Installa Nebula AI
            </button>
            <p class="install-hint">Clicca il pulsante sopra per installare Nebula AI come app sul tuo dispositivo.</p>
          </div>
        {/if}
        
        <div class="instructions-section">
          <h2 class="section-title">Istruzioni per Piattaforma</h2>
          
          {#if currentOS === 'windows'}
            <div class="instruction-card">
              <h3 class="instruction-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                Windows (Chrome/Edge)
              </h3>
              <ol class="instruction-steps">
                <li>Apri Nebula AI nel browser Chrome o Microsoft Edge</li>
                <li>Clicca sull'icona <strong>Installa app</strong> nella barra degli indirizzi (o usa il menu ⋮ → Installa Nebula AI)</li>
                <li>Conferma l'installazione nella finestra popup</li>
                <li>L'app verrà aggiunta al menu Start e al desktop</li>
              </ol>
            </div>
            
            <div class="instruction-card">
              <h3 class="instruction-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                Windows (Altri Browser)
              </h3>
              <ol class="instruction-steps">
                <li>Apri Nebula AI nel tuo browser</li>
                <li>Premi <strong>Ctrl + Shift + D</strong> per aggiungere ai preferiti</li>
                <li>Vai alla cartella Preferiti e trova "Nebula AI"</li>
                <li>Trascina il collegamento sul desktop per creare un accesso rapido</li>
              </ol>
            </div>
          {:else if currentOS === 'android'}
            <div class="instruction-card">
              <h3 class="instruction-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                </svg>
                Android (Chrome)
              </h3>
              <ol class="instruction-steps">
                <li>Apri Nebula AI nel browser Chrome</li>
                <li>Tocca il menu <strong>⋮</strong> in alto a destra</li>
                <li>Seleziona <strong>"Aggiungi alla schermata Home"</strong> o <strong>"Installa app"</strong></li>
                <li>Conferma aggiungendo un nome (opzionale)</li>
                <li>L'icona di Nebula AI apparirà sulla schermata home</li>
              </ol>
            </div>
            
            <div class="instruction-card">
              <h3 class="instruction-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                </svg>
                Android (Altri Browser)
              </h3>
              <ol class="instruction-steps">
                <li>Apri Nebula AI nel tuo browser</li>
                <li>Tocca il menu del browser (solitamente ⋮ o ☰)</li>
                <li>Cerca l'opzione <strong>"Aggiungi alla schermata Home"</strong> o <strong>"Collegamento"</strong></li>
                <li>Conferma e l'icona verrà aggiunta alla schermata home</li>
              </ol>
            </div>
          {:else}
            <div class="instruction-card">
              <h3 class="instruction-title">Istruzioni Generali</h3>
              <ol class="instruction-steps">
                <li>Apri Nebula AI nel tuo browser</li>
                <li>Cerca l'opzione <strong>"Installa app"</strong> o <strong>"Aggiungi alla schermata Home"</strong> nel menu del browser</li>
                <li>Segui le istruzioni del browser per completare l'installazione</li>
                <li>L'app sarà accessibile dal desktop o dalla schermata home</li>
              </ol>
            </div>
          {/if}
        </div>
        
        <div class="download-features">
          <h2 class="features-title">Vantaggi dell'Installazione</h2>
          <div class="features-list">
            <div class="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Accesso rapido dal desktop o home screen</span>
            </div>
            <div class="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Esperienza app-like ottimizzata</span>
            </div>
            <div class="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Funziona come un'applicazione nativa</span>
            </div>
            <div class="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Nessun download aggiuntivo richiesto</span>
            </div>
          </div>
        </div>
        
        <div class="download-footer">
          <p>Hai bisogno di aiuto? Contatta il <a href="#" class="link" on:click|preventDefault={() => { closeModal(); import('../stores/app.js').then(m => m.isHelpCenterModalOpen.set(true)); }}>centro assistenza</a></p>
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
    max-width: 900px;
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

  .download-header {
    margin-bottom: 32px;
    text-align: center;
  }

  .download-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 14px 0;
    line-height: 1.2;
  }

  .download-intro {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .installed-banner {
    background-color: #10b981;
    color: white;
    padding: 16px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    font-weight: 500;
  }

  .installed-banner svg {
    flex-shrink: 0;
  }

  .install-section {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    margin-bottom: 32px;
  }

  .install-button {
    padding: 14px 28px;
    background-color: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.2s;
    margin-bottom: 12px;
  }

  .install-button:hover {
    background-color: #2563eb;
    transform: scale(1.02);
  }

  .install-hint {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }

  .instructions-section {
    margin-bottom: 32px;
  }

  .section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 20px 0;
  }

  .instruction-card {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
  }

  .instruction-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .instruction-title svg {
    color: var(--accent-blue);
    flex-shrink: 0;
  }

  .instruction-steps {
    margin: 0;
    padding-left: 24px;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.8;
  }

  .instruction-steps li {
    margin-bottom: 10px;
  }

  .instruction-steps strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .download-features {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .features-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 16px 0;
  }

  .features-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .feature-item svg {
    color: var(--accent-blue);
    flex-shrink: 0;
  }

  .download-footer {
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid var(--border-color);
  }

  .download-footer p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  .link {
    color: var(--accent-blue);
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .link:hover {
    opacity: 0.8;
    text-decoration: underline;
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

    .download-title {
      font-size: 24px;
    }

    .install-section {
      padding: 20px;
    }

    .instruction-card {
      padding: 16px;
    }

    .features-list {
      grid-template-columns: 1fr;
    }
  }
</style>

