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
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="terms-modal-title">
    <div class="modal-content">
      <button class="close-button" on:click={closeModal} aria-label="Chiudi">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      
      <div class="modal-body">
        <div class="terms-header">
          <h1 id="terms-modal-title" class="terms-title">Termini di Servizio</h1>
          <p class="terms-intro">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div class="terms-content">
          <section class="terms-section">
            <h2 class="section-title">1. Accettazione dei Termini</h2>
            <p class="section-text">
              Utilizzando Nebula AI, accetti di rispettare questi Termini di Servizio. 
              Se non accetti questi termini, ti preghiamo di non utilizzare il servizio.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">2. Descrizione del Servizio</h2>
            <p class="section-text">
              Nebula AI è una piattaforma di assistenza all'intelligenza artificiale che fornisce 
              strumenti di chat e assistenza AI. Il servizio è fornito "così com'è" e può essere 
              modificato o interrotto in qualsiasi momento.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">3. Account e Registrazione</h2>
            <p class="section-text">
              Per utilizzare alcune funzionalità di Nebula AI, potrebbe essere necessario creare un account. 
              Sei responsabile di mantenere la riservatezza delle tue credenziali e di tutte le attività 
              che si verificano sotto il tuo account.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">4. Privacy e Dati</h2>
            <p class="section-text">
              La privacy è fondamentale per noi. Le tue conversazioni sono crittografate e salvate in modo sicuro. 
              Non condividiamo i tuoi dati con terze parti senza il tuo consenso esplicito. 
              Per maggiori informazioni, consulta la nostra <a href="#" class="link">Informativa sulla Privacy</a>.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">5. Uso Accettabile</h2>
            <p class="section-text">
              Ti impegni a utilizzare Nebula AI solo per scopi legali e in modo che non violi i diritti di terzi. 
              Non puoi utilizzare il servizio per:
            </p>
            <ul class="section-list">
              <li>Attività illegali o fraudolente</li>
              <li>Violare diritti di proprietà intellettuale</li>
              <li>Trasmettere contenuti dannosi o offensivi</li>
              <li>Interferire con il funzionamento del servizio</li>
            </ul>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">6. Proprietà Intellettuale</h2>
            <p class="section-text">
              Tutti i contenuti, funzionalità e software di Nebula AI sono di proprietà di Nebula AI 
              o dei suoi licenzianti e sono protetti da leggi sul copyright e altre leggi sulla proprietà intellettuale.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">7. Limitazione di Responsabilità</h2>
            <p class="section-text">
              Nebula AI è fornito "così com'è" senza garanzie di alcun tipo. Non ci assumiamo responsabilità 
              per eventuali danni diretti, indiretti, incidentali o consequenziali derivanti dall'uso del servizio.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">8. Modifiche ai Termini</h2>
            <p class="section-text">
              Ci riserviamo il diritto di modificare questi Termini di Servizio in qualsiasi momento. 
              Le modifiche entreranno in vigore immediatamente dopo la pubblicazione. 
              L'uso continuato del servizio dopo le modifiche costituisce accettazione dei nuovi termini.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">9. Contatti</h2>
            <p class="section-text">
              Per domande su questi Termini di Servizio, puoi contattarci all'indirizzo: 
              <a href="mailto:legal@nebula-ai.com" class="link">legal@nebula-ai.com</a>
            </p>
          </section>
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

  .terms-header {
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border-color);
  }

  .terms-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px 0;
    line-height: 1.2;
  }

  .terms-intro {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  .terms-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .terms-section {
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
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
  }

  .section-text {
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-secondary);
    margin: 0 0 12px 0;
  }

  .section-list {
    margin: 12px 0 0 20px;
    padding: 0;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.8;
  }

  .section-list li {
    margin-bottom: 8px;
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

    .terms-title {
      font-size: 24px;
    }
  }
</style>












