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
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="privacy-modal-title">
    <div class="modal-content">
      <button class="close-button" on:click={closeModal} aria-label="Chiudi">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      
      <div class="modal-body">
        <div class="privacy-header">
          <h1 id="privacy-modal-title" class="privacy-title">L'AI che rispetta la tua privacy</h1>
          <p class="privacy-intro">
            Un assistente AI dovrebbe renderti più efficiente, non sfruttarti per i tuoi dati. 
            Ecco perché abbiamo creato Nebula AI: per offrirti tutti i vantaggi dell'intelligenza artificiale, 
            senza compromettere la tua privacy e la sicurezza dei dati.
          </p>
        </div>
        
        <div class="privacy-section">
          <h2 class="section-title">Creato dal team che conosce la privacy</h2>
          <p class="section-description">
            I modelli AI delle Big Tech sono basati sulla raccolta dei tuoi dati. Ma Nebula AI è diverso. 
            È stato sviluppato con un focus prioritario sulla privacy e sulla sicurezza dei dati degli utenti. 
            La nostra missione è promuovere un'AI etica e rispettosa della privacy, senza mai lucrare sui dati degli utenti.
          </p>
        </div>
        
        <div class="privacy-section">
          <h2 class="section-title">Come fa Nebula AI a mantenere riservate le nostre conversazioni?</h2>
          
          <div class="privacy-features-grid">
            <div class="privacy-feature-card">
              <div class="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <circle cx="9" cy="10" r="1" fill="currentColor"/>
                  <circle cx="15" cy="10" r="1" fill="currentColor"/>
                  <circle cx="12" cy="10" r="1" fill="currentColor"/>
                </svg>
              </div>
              <h3 class="feature-title">Le tue chat sono solo tue</h3>
              <p class="feature-description">
                Non conserviamo registri di ciò che chiedi o di ciò che Nebula AI risponde. 
                Le tue chat non possono essere viste, condivise o utilizzate per profilarti. 
                Nebula AI non salva nulla sui nostri server senza il tuo consenso esplicito.
              </p>
            </div>
            
            <div class="privacy-feature-card">
              <div class="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  <circle cx="12" cy="16" r="1" fill="currentColor"/>
                </svg>
              </div>
              <h3 class="feature-title">Solo tu hai accesso</h3>
              <p class="feature-description">
                Grazie alla crittografia end-to-end, le tue conversazioni salvate possono essere decodificate 
                e lette solo sul tuo dispositivo. Né il nostro team né terze parti possono accedervi.
              </p>
            </div>
            
            <div class="privacy-feature-card">
              <div class="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                  <circle cx="12" cy="12" r="1" fill="currentColor"/>
                </svg>
              </div>
              <h3 class="feature-title">Tecnologia di cui ti puoi fidare</h3>
              <p class="feature-description">
                Il codice di Nebula AI è progettato con standard di sicurezza elevati, 
                garantendo che sia privato e sicuro. Non utilizziamo mai i tuoi dati per addestrare i modelli 
                senza il tuo consenso esplicito e informato.
              </p>
            </div>
            
            <div class="privacy-feature-card">
              <div class="feature-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  <path d="M12 16v4"/>
                  <path d="M8 20h8"/>
                </svg>
              </div>
              <h3 class="feature-title">Hai il controllo</h3>
              <p class="feature-description">
                I tuoi dati non vengono condivisi con inserzionisti, governi o chiunque altro. 
                Nebula AI rispetta il GDPR e le normative sulla privacy, quindi puoi eliminare 
                i tuoi dati in qualsiasi momento.
              </p>
            </div>
          </div>
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
    max-width: 1000px;
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

  .privacy-header {
    margin-bottom: 32px;
    animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
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

  .privacy-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 14px 0;
    line-height: 1.2;
    letter-spacing: -0.5px;
  }

  .privacy-intro {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
    max-width: 800px;
  }

  .privacy-section {
    margin-bottom: 32px;
    animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    animation-fill-mode: both;
  }

  .privacy-section:nth-child(2) {
    animation-delay: 0.1s;
  }

  .privacy-section:nth-child(3) {
    animation-delay: 0.2s;
  }

  .section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
    line-height: 1.3;
  }

  .section-description {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
    max-width: 900px;
  }

  .privacy-features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-top: 20px;
  }

  .privacy-feature-card {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: cardFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    animation-fill-mode: both;
  }

  .privacy-feature-card:nth-child(1) {
    animation-delay: 0.1s;
  }

  .privacy-feature-card:nth-child(2) {
    animation-delay: 0.2s;
  }

  .privacy-feature-card:nth-child(3) {
    animation-delay: 0.3s;
  }

  .privacy-feature-card:nth-child(4) {
    animation-delay: 0.4s;
  }

  @keyframes cardFadeIn {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .privacy-feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border-color: var(--accent-blue);
  }

  .feature-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff6b35;
    margin-bottom: 12px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .privacy-feature-card:hover .feature-icon {
    transform: scale(1.1);
  }

  .feature-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
    line-height: 1.3;
  }

  .feature-description {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .modal-body {
      padding: 40px 32px;
    }

    .privacy-title {
      font-size: 32px;
    }

    .privacy-intro {
      font-size: 17px;
    }

    .privacy-features-grid {
      gap: 20px;
    }
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
      padding: 32px 24px;
    }

    .close-button {
      top: 16px;
      right: 16px;
      padding: 6px;
    }

    .privacy-header {
      margin-bottom: 32px;
    }

    .privacy-title {
      font-size: 28px;
      margin-bottom: 16px;
    }

    .privacy-intro {
      font-size: 16px;
    }

    .privacy-section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 20px;
      margin-bottom: 12px;
    }

    .section-description {
      font-size: 15px;
    }

    .privacy-features-grid {
      grid-template-columns: 1fr;
      gap: 16px;
      margin-top: 24px;
    }

    .privacy-feature-card {
      padding: 20px;
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
    }

    .feature-title {
      font-size: 18px;
      margin-bottom: 10px;
    }

    .feature-description {
      font-size: 14px;
    }
  }

  @media (max-width: 480px) {
    .modal-body {
      padding: 24px 20px;
    }

    .privacy-title {
      font-size: 24px;
    }

    .privacy-intro {
      font-size: 15px;
    }

    .section-title {
      font-size: 18px;
    }

    .privacy-feature-card {
      padding: 16px;
    }
  }
</style>




