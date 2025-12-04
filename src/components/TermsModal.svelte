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
          <h1 id="terms-modal-title" class="terms-title">Termini di Utilizzo</h1>
          <p class="terms-intro">
            Ultimo aggiornamento: 27 Gennaio 2025
          </p>
        </div>
        
        <div class="terms-content">
          <section class="terms-section">
            <h2 class="section-title">1. Accettazione dei Termini</h2>
            <p class="section-text">
              Accedendo e utilizzando Nebula AI (di seguito "il Servizio" o "Nebula AI"), accetti di essere vincolato da questi Termini di Utilizzo (di seguito "Termini"). Se non accetti questi Termini, ti preghiamo di non utilizzare il Servizio.
            </p>
            <p class="section-text">
              Il Servizio è fornito da Nebula AI (di seguito "noi", "nostro", "ci").
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">2. Descrizione del Servizio</h2>
            <p class="section-text">
              Nebula AI è una piattaforma di assistenza all'intelligenza artificiale che fornisce strumenti di chat, generazione di contenuti, analisi e altre funzionalità basate su intelligenza artificiale. Il Servizio consente agli utenti di interagire con modelli di intelligenza artificiale per vari scopi.
            </p>
            <p class="section-text">
              Il Servizio è fornito "così com'è" e può essere modificato, sospeso o interrotto in qualsiasi momento senza preavviso.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">3. Età Minima e Capacità Giuridica</h2>
            <p class="section-text">
              Per utilizzare il Servizio, devi:
            </p>
            <ul class="section-list">
              <li>Avere almeno 13 anni di età (o l'età minima richiesta nella tua giurisdizione)</li>
              <li>Avere la capacità giuridica di accettare questi Termini</li>
              <li>Non essere stato precedentemente sospeso o rimosso dal Servizio</li>
            </ul>
            <p class="section-text">
              Se hai meno di 18 anni, dichiari di aver ottenuto il consenso del tuo genitore o tutore legale.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">4. Registrazione e Account</h2>
            <p class="section-text">
              <strong>4.1 Creazione Account</strong><br>
              Per utilizzare alcune funzionalità del Servizio, potrebbe essere necessario creare un account. Durante la registrazione, ti impegni a fornire informazioni accurate, aggiornate e complete e a mantenere la sicurezza della tua password.
            </p>
            <p class="section-text">
              <strong>4.2 Responsabilità dell'Account</strong><br>
              Sei l'unico responsabile di tutte le attività che si verificano sotto il tuo account, della sicurezza del tuo account e di tutti i contenuti che pubblichi o condividi attraverso il Servizio.
            </p>
            <p class="section-text">
              <strong>4.3 Sospensione e Cancellazione</strong><br>
              Ci riserviamo il diritto di sospendere o cancellare il tuo account in qualsiasi momento, con o senza preavviso, per violazione di questi Termini o per qualsiasi altro motivo legittimo.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">5. Uso Accettabile</h2>
            <p class="section-text">
              Accetti di utilizzare il Servizio solo per scopi legali e in conformità con questi Termini e tutte le leggi applicabili.
            </p>
            <p class="section-text">
              È vietato utilizzare il Servizio per:
            </p>
            <ul class="section-list">
              <li>Attività illegali o non autorizzate (frode, furto, riciclaggio, terrorismo)</li>
              <li>Violare diritti di proprietà intellettuale, privacy o altri diritti legali di terzi</li>
              <li>Creare, trasmettere o condividere contenuti diffamatori, offensivi, discriminatori o incitanti alla violenza</li>
              <li>Interferire con o interrompere il funzionamento del Servizio</li>
              <li>Tentare accessi non autorizzati a sistemi o account di altri utenti</li>
              <li>Inviare spam, email di phishing o altre comunicazioni non autorizzate</li>
              <li>Impersonare qualsiasi persona o entità</li>
              <li>Utilizzare il Servizio per scopi commerciali non autorizzati</li>
            </ul>
            <p class="section-text">
              <strong>Contenuti Generati dall'AI:</strong> Riconosci che i contenuti generati dall'AI potrebbero contenere errori o imprecisioni. Non costituiscono consulenza legale, medica, finanziaria o professionale. Sei responsabile di verificare l'accuratezza prima di utilizzarli.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">6. Proprietà Intellettuale</h2>
            <p class="section-text">
              Tutti i contenuti, funzionalità, software, design, loghi e marchi presenti sul Servizio sono di proprietà di Nebula AI o dei suoi licenzianti e sono protetti da leggi sul copyright e altre leggi sulla proprietà intellettuale.
            </p>
            <p class="section-text">
              Ti concediamo una licenza limitata, non esclusiva, non trasferibile e revocabile per accedere e utilizzare il Servizio esclusivamente per i tuoi scopi personali e non commerciali.
            </p>
            <p class="section-text">
              I contenuti generati dall'AI attraverso il Servizio sono di tua proprietà, a condizione che non violino questi Termini o le leggi applicabili.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">7. Privacy e Protezione dei Dati</h2>
            <p class="section-text">
              Il trattamento dei tuoi dati personali è disciplinato dalla nostra Informativa sulla Privacy, che forma parte integrante di questi Termini. Utilizzando il Servizio, accetti anche la nostra Informativa sulla Privacy.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">8. Abbonamenti e Pagamenti</h2>
            <p class="section-text">
              Il Servizio può offrire diversi piani di abbonamento. Se scegli un piano a pagamento, accetti di pagare tutti i costi associati. I pagamenti sono non rimborsabili, salvo quanto previsto dalla legge applicabile. Gli abbonamenti possono rinnovarsi automaticamente a meno che non vengano disattivati.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">9. Limitazione di Responsabilità</h2>
            <p class="section-text">
              <strong>Disclaimer:</strong> IL SERVIZIO È FORNITO "COSÌ COM'È" E "COME DISPONIBILE", SENZA GARANZIE DI ALCUN TIPO, ESPLICITE O IMPLICITE.
            </p>
            <p class="section-text">
              NELLA MASSIMA MISURA CONSENTITA DALLA LEGGE, NEBULA AI NON SARÀ RESPONSABILE PER DANNI DIRETTI, INDIRETTI, INCIDENTALI, SPECIALI O CONSEQUENZIALI, inclusi errori, bug o contenuti generati dall'AI imprecisi.
            </p>
            <p class="section-text">
              La responsabilità totale di Nebula AI per qualsiasi reclamo non supererà l'importo che hai pagato nei 12 mesi precedenti.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">10. Risarcimento</h2>
            <p class="section-text">
              Accetti di risarcire, difendere e tenere indenne Nebula AI da qualsiasi reclamo, danno o responsabilità derivanti dal tuo utilizzo del Servizio, dalla violazione di questi Termini o dalla violazione di qualsiasi legge o diritto di terzi.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">11. Modifiche ai Termini</h2>
            <p class="section-text">
              Ci riserviamo il diritto di modificare questi Termini in qualsiasi momento. Le modifiche entreranno in vigore immediatamente dopo la pubblicazione. Ti notificheremo le modifiche sostanziali tramite notifica sul Servizio o email.
            </p>
            <p class="section-text">
              Se non accetti le modifiche, devi interrompere l'utilizzo del Servizio e cancellare il tuo account.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">12. Risoluzione</h2>
            <p class="section-text">
              Puoi risolvere questi Termini in qualsiasi momento interrompendo l'utilizzo del Servizio e cancellando il tuo account.
            </p>
            <p class="section-text">
              Ci riserviamo il diritto di sospendere o risolvere il tuo accesso al Servizio immediatamente, senza preavviso, per violazione di questi Termini o per qualsiasi altro motivo legittimo.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">13. Legge Applicabile e Foro Competente</h2>
            <p class="section-text">
              Questi Termini sono disciplinati e interpretati in conformità con le leggi italiane. Per qualsiasi controversia, le parti accettano di sottoporre la controversia alla giurisdizione esclusiva dei tribunali competenti italiani.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">14. Disposizioni Generali</h2>
            <p class="section-text">
              Questi Termini, insieme alla nostra Informativa sulla Privacy, costituiscono l'intero accordo tra te e Nebula AI. Se qualsiasi disposizione è ritenuta non valida, le restanti disposizioni continueranno ad essere in pieno vigore.
            </p>
          </section>
          
          <section class="terms-section">
            <h2 class="section-title">15. Contatti</h2>
            <p class="section-text">
              Per domande, reclami o richieste riguardo a questi Termini di Utilizzo, puoi contattarci:
            </p>
            <p class="section-text">
              <strong>Email:</strong> <a href="mailto:legal@nebula-ai.com" class="link">legal@nebula-ai.com</a>
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















