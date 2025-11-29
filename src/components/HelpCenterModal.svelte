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
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
    <div class="modal-content">
      <button class="close-button" on:click={closeModal} aria-label="Chiudi">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      
      <div class="modal-body">
        <div class="help-header">
          <h1 id="help-modal-title" class="help-title">Centro Assistenza</h1>
          <p class="help-intro">
            Benvenuto nel centro assistenza di Nebula AI. Qui troverai risposte alle domande più frequenti 
            e guide per utilizzare al meglio tutte le funzionalità dell'applicazione.
          </p>
        </div>
        
        <div class="help-sections">
          <div class="help-section">
            <h2 class="section-title">Domande Frequenti</h2>
            
            <div class="faq-item">
              <h3 class="faq-question">Come posso iniziare a usare Nebula AI?</h3>
              <p class="faq-answer">
                Dopo aver creato un account, puoi iniziare subito a chattare con Nebula AI. 
                Basta digitare la tua domanda nell'area di input e premere Invio. 
                Nebula AI è pronto a rispondere a qualsiasi tua domanda!
              </p>
            </div>
            
            <div class="faq-item">
              <h3 class="faq-question">Le mie conversazioni sono private?</h3>
              <p class="faq-answer">
                Sì, assolutamente! Nebula AI rispetta la tua privacy. Le tue conversazioni sono crittografate 
                e salvate solo sul tuo dispositivo. Non condividiamo i tuoi dati con terze parti e non utilizziamo 
                le tue chat per addestrare i modelli AI senza il tuo consenso esplicito.
              </p>
            </div>
            
            <div class="faq-item">
              <h3 class="faq-question">Come posso salvare le mie chat?</h3>
              <p class="faq-answer">
                Le chat vengono salvate automaticamente quando crei un account. Se non hai un account, 
                le chat vengono salvate localmente sul tuo dispositivo. Per salvare le chat nel cloud 
                e accedervi da qualsiasi dispositivo, crea un account gratuito.
              </p>
            </div>
            
            <div class="faq-item">
              <h3 class="faq-question">Posso usare Nebula AI senza account?</h3>
              <p class="faq-answer">
                Sì, puoi usare Nebula AI anche senza creare un account. Le tue chat verranno salvate 
                localmente sul tuo dispositivo. Tuttavia, creando un account gratuito avrai accesso a 
                funzionalità aggiuntive come la sincronizzazione tra dispositivi e il backup nel cloud.
              </p>
            </div>
            
            <div class="faq-item">
              <h3 class="faq-question">Come funzionano i progetti?</h3>
              <p class="faq-answer">
                I progetti ti permettono di organizzare le tue chat in cartelle tematiche. 
                Puoi creare un progetto, assegnargli un nome, un colore e un'icona, e poi associare 
                le tue chat a quel progetto. Questo ti aiuta a mantenere organizzate le tue conversazioni.
              </p>
            </div>
          </div>
          
          <div class="help-section">
            <h2 class="section-title">Guide Rapide</h2>
            
            <div class="guide-card">
              <h3 class="guide-title">Primi Passi</h3>
              <ul class="guide-list">
                <li>Crea un account per salvare le tue chat nel cloud</li>
                <li>Inizia una nuova chat per fare la tua prima domanda</li>
                <li>Esplora le impostazioni per personalizzare l'esperienza</li>
                <li>Scopri le scorciatoie da tastiera per navigare più velocemente</li>
              </ul>
            </div>
            
            <div class="guide-card">
              <h3 class="guide-title">Funzionalità Avanzate</h3>
              <ul class="guide-list">
                <li>Usa i progetti per organizzare le tue chat</li>
                <li>Condividi link pubblici delle tue conversazioni</li>
                <li>Personalizza il sistema di prompt per l'AI</li>
                <li>Esporta i tuoi dati in qualsiasi momento</li>
              </ul>
            </div>
          </div>
          
          <div class="help-section">
            <h2 class="section-title">Contatti</h2>
            <p class="contact-text">
              Non hai trovato quello che cercavi? Contattaci per ricevere assistenza personalizzata.
            </p>
            <div class="contact-info">
              <p><strong>Email:</strong> support@nebula-ai.com</p>
              <p><strong>Risposta entro:</strong> 24-48 ore</p>
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

  .help-header {
    margin-bottom: 32px;
  }

  .help-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 14px 0;
    line-height: 1.2;
  }

  .help-intro {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
  }

  .help-sections {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .help-section {
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

  .section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 16px 0;
  }

  .faq-item {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    transition: all 0.2s;
  }

  .faq-item:hover {
    border-color: var(--accent-blue);
  }

  .faq-question {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
  }

  .faq-answer {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
  }

  .guide-card {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .guide-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
  }

  .guide-list {
    margin: 0;
    padding-left: 20px;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.8;
  }

  .guide-list li {
    margin-bottom: 8px;
  }

  .contact-text {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
  }

  .contact-info {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
  }

  .contact-info p {
    margin: 8px 0;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .contact-info strong {
    color: var(--text-primary);
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

    .help-title {
      font-size: 24px;
    }
  }
</style>







