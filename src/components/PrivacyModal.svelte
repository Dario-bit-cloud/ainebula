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
          <h1 id="privacy-modal-title" class="privacy-title">Informativa sulla Privacy</h1>
          <p class="privacy-intro">
            Ultimo aggiornamento: 27 Gennaio 2025
          </p>
        </div>
        
        <div class="privacy-content">
          <section class="privacy-section">
            <h2 class="section-title">1. Introduzione</h2>
            <p class="section-text">
              Nebula AI rispetta la tua privacy e si impegna a proteggere la tua privacy nel modo più assoluto. <strong>Nebula AI non raccoglie, non memorizza e non tratta dati personali degli utenti.</strong>
            </p>
            <p class="section-text">
              Questa informativa è conforme al Regolamento Generale sulla Protezione dei Dati (GDPR) dell'Unione Europea e alle leggi italiane sulla protezione dei dati personali (D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018).
            </p>
            <p class="section-text small-note">
              <strong>Nota importante:</strong> Per fornire le funzionalità di intelligenza artificiale, Nebula AI utilizza API di terze parti (come OpenAI, Anthropic, Google, ecc.). Queste API potrebbero raccogliere dati tecnici durante l'elaborazione delle richieste. Tuttavia, Nebula AI implementa un sistema di filtraggio e anonimizzazione avanzato che rimuove tutti gli identificatori personali prima di inviare le richieste alle API di terze parti, garantendo che anche gli utenti registrati risultino completamente anonimi durante l'elaborazione delle chat.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">2. Titolare del Trattamento</h2>
            <p class="section-text">
              Il titolare del trattamento dei dati personali è Nebula AI.
            </p>
            <p class="section-text">
              <strong>Email:</strong> <a href="mailto:privacy@nebula-ai.com" class="link">privacy@nebula-ai.com</a>
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">3. Raccolta e Trattamento dei Dati</h2>
            <p class="section-text">
              <strong>Nebula AI non raccoglie dati personali.</strong> Il nostro servizio è progettato con un'architettura privacy-first che minimizza la raccolta di informazioni personali.
            </p>
            
            <p class="section-text">
              <strong>3.1 Dati di Autenticazione (Solo per Utenti Registrati):</strong>
            </p>
            <p class="section-text">
              Per gli utenti che scelgono di registrarsi, raccogliamo esclusivamente:
            </p>
            <ul class="section-list">
              <li>Username (pseudonimo, non necessariamente identificativo)</li>
              <li>Indirizzo email (utilizzato solo per autenticazione e comunicazioni essenziali)</li>
              <li>Password (crittografata con hash irreversibile, non accessibile nemmeno da Nebula AI)</li>
            </ul>
            
            <p class="section-text">
              <strong>3.2 Chat e Contenuti - Crittografia End-to-End:</strong>
            </p>
            <p class="section-text">
              Le tue chat e conversazioni sono archiviate su Nebula AI con crittografia end-to-end. Questo significa che:
            </p>
            <ul class="section-list">
              <li>Le chat sono crittografate prima di essere salvate nel database</li>
              <li>Solo tu possiedi la chiave di decrittazione (derivata dalla tua password)</li>
              <li><strong>Nebula AI non può vedere, leggere o accedere al contenuto delle tue chat</strong></li>
              <li>Le chat vengono salvate esclusivamente per permetterti di mantenere la tua cronologia personale</li>
              <li>Anche in caso di richieste legali, Nebula AI non può fornire il contenuto delle chat perché non è in grado di decrittarle</li>
            </ul>
            
            <p class="section-text">
              <strong>3.3 Dati Tecnici Minimi:</strong>
            </p>
            <p class="section-text">
              Per garantire il funzionamento del servizio, vengono registrati solo dati tecnici essenziali e anonimi:
            </p>
            <ul class="section-list">
              <li>Token di autenticazione (per mantenere la sessione attiva)</li>
              <li>Timestamp delle attività (per funzionalità di sincronizzazione)</li>
              <li>Dati aggregati e anonimi per statistiche di utilizzo (senza identificatori personali)</li>
            </ul>
            
            <p class="section-text small-note">
              <strong>Nota sulle API di Terze Parti:</strong> Quando invii una richiesta tramite Nebula AI, il sistema rimuove automaticamente tutti gli identificatori personali (username, email, ID utente) prima di inviare la richiesta alle API di terze parti. Le richieste vengono anonimizzate e non contengono informazioni che possano identificarti, anche se sei un utente registrato. Nebula AI funge da intermediario che protegge la tua identità.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">4. Base Giuridica del Trattamento</h2>
            <p class="section-text">
              Poiché Nebula AI non raccoglie dati personali oltre a quelli strettamente necessari per l'autenticazione, la base giuridica del trattamento è limitata a:
            </p>
            <ul class="section-list">
              <li><strong>Esecuzione del Contratto:</strong> Per fornire il Servizio e permetterti di accedere alle funzionalità</li>
              <li><strong>Consenso Esplicito:</strong> Per qualsiasi trattamento opzionale (es. newsletter, comunicazioni promozionali)</li>
              <li><strong>Obbligo Legale:</strong> Solo quando strettamente richiesto dalla legge (es. richieste delle autorità competenti per dati di autenticazione)</li>
            </ul>
            <p class="section-text">
              <strong>Importante:</strong> Nebula AI non utilizza "interesse legittimo" come base giuridica per il trattamento di dati personali, in quanto non raccoglie dati per finalità di marketing, profilazione o analisi comportamentale.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">5. Finalità del Trattamento</h2>
            <p class="section-text">
              I dati minimi raccolti da Nebula AI sono utilizzati esclusivamente per:
            </p>
            <ul class="section-list">
              <li><strong>Autenticazione e Accesso:</strong> Permetterti di accedere al tuo account e mantenere la sessione attiva</li>
              <li><strong>Archiviazione Sicura delle Chat:</strong> Conservare le tue chat in forma crittografata per la tua cronologia personale (senza possibilità di accesso da parte di Nebula AI)</li>
              <li><strong>Sicurezza del Servizio:</strong> Proteggere il servizio da accessi non autorizzati e abusi</li>
              <li><strong>Comunicazioni Essenziali:</strong> Inviare notifiche tecniche essenziali relative al servizio (es. modifiche ai termini, problemi di sicurezza)</li>
            </ul>
            <p class="section-text">
              <strong>Nebula AI non utilizza i tuoi dati per:</strong>
            </p>
            <ul class="section-list">
              <li>Profilazione o analisi comportamentale</li>
              <li>Marketing diretto o pubblicità mirata</li>
              <li>Vendita o condivisione con terze parti per scopi commerciali</li>
              <li>Training di modelli AI con i tuoi contenuti</li>
            </ul>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">6. Condivisione dei Dati</h2>
            <p class="section-text">
              <strong>Nebula AI non vende, non affitta e non condivide i tuoi dati personali con terze parti per scopi commerciali.</strong>
            </p>
            <p class="section-text">
              <strong>6.1 Fornitori di Servizi Tecnici:</strong>
            </p>
            <p class="section-text">
              Nebula AI utilizza fornitori di servizi tecnici per l'infrastruttura (hosting, database). Questi fornitori:
            </p>
            <ul class="section-list">
              <li>Hanno accesso solo ai dati tecnici necessari per il funzionamento del servizio</li>
              <li>Non hanno accesso al contenuto delle chat (crittografate end-to-end)</li>
              <li>Sono vincolati da accordi di riservatezza e conformità GDPR</li>
              <li>Non possono utilizzare i dati per altri scopi</li>
            </ul>
            
            <p class="section-text">
              <strong>6.2 API di Servizi AI (Terze Parti):</strong>
            </p>
            <p class="section-text">
              Quando utilizzi le funzionalità AI, Nebula AI invia richieste anonimizzate alle API di terze parti (OpenAI, Anthropic, Google, ecc.):
            </p>
            <ul class="section-list">
              <li>Le richieste vengono anonimizzate prima dell'invio (rimozione di identificatori personali)</li>
              <li>Nebula AI funge da intermediario che protegge la tua identità</li>
              <li>Le API di terze parti non ricevono informazioni che possano identificarti</li>
              <li>Le politiche sulla privacy delle API di terze parti si applicano ai dati anonimizzati che ricevono</li>
            </ul>
            <p class="section-text small-note">
              <strong>Nota:</strong> Ti consigliamo di consultare le informative sulla privacy dei fornitori di API AI che utilizzi tramite Nebula AI per comprendere come trattano i dati anonimizzati che ricevono.
            </p>
            
            <p class="section-text">
              <strong>6.3 Obblighi Legali:</strong>
            </p>
            <p class="section-text">
              Nebula AI può divulgare dati solo se richiesto dalla legge o da autorità competenti. Tuttavia:
            </p>
            <ul class="section-list">
              <li>Le chat crittografate end-to-end non possono essere decrittate da Nebula AI</li>
              <li>In caso di richiesta legale, Nebula AI può fornire solo dati di autenticazione (username, email) e metadati tecnici</li>
              <li>Il contenuto delle chat rimane inaccessibile anche a Nebula AI</li>
            </ul>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">7. Trasferimento Dati Oltre l'UE</h2>
            <p class="section-text">
              I tuoi dati possono essere trasferiti in paesi al di fuori dell'UE. In tali casi, adottiamo misure appropriate per garantire un livello adeguato di protezione, inclusi clausole contrattuali standard approvate dalla Commissione Europea.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">8. Conservazione dei Dati</h2>
            <p class="section-text">
              Nebula AI conserva i dati solo per il tempo strettamente necessario:
            </p>
            <ul class="section-list">
              <li><strong>Dati di Autenticazione:</strong> Fino a quando il tuo account è attivo o fino a quando richiedi la cancellazione. Dopo la cancellazione, i dati vengono eliminati entro 30 giorni.</li>
              <li><strong>Chat Crittografate:</strong> Fino a quando non elimini manualmente le chat o il tuo account. Le chat vengono conservate esclusivamente per permetterti di mantenere la tua cronologia personale. Puoi eliminarle in qualsiasi momento.</li>
              <li><strong>Dati di Sessione:</strong> Massimo 7 giorni dopo la scadenza della sessione</li>
              <li><strong>Dati di Log Tecnici:</strong> Massimo 90 giorni, solo per finalità di sicurezza e troubleshooting</li>
              <li><strong>Dati Aggregati e Anonimi:</strong> Conservati indefinitamente ma senza possibilità di identificazione personale</li>
            </ul>
            <p class="section-text">
              Dopo il periodo di conservazione, i dati vengono eliminati in modo sicuro utilizzando metodi di cancellazione definitiva che rendono impossibile il recupero. Le chat crittografate vengono eliminate insieme alle chiavi di crittografia associate.
            </p>
            <p class="section-text">
              <strong>Diritto alla Cancellazione:</strong> Puoi richiedere la cancellazione completa del tuo account e di tutti i dati associati in qualsiasi momento. La cancellazione è definitiva e irreversibile.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">9. Sicurezza dei Dati</h2>
            <p class="section-text">
              Nebula AI implementa misure di sicurezza avanzate per proteggere i tuoi dati:
            </p>
            <ul class="section-list">
              <li><strong>Crittografia End-to-End Obbligatoria:</strong> Tutte le chat sono crittografate end-to-end utilizzando algoritmi crittografici moderni (AES-256). La crittografia avviene lato client prima dell'invio al server.</li>
              <li><strong>Zero-Knowledge Architecture:</strong> Nebula AI non può accedere, leggere o decrittare il contenuto delle tue chat. Solo tu possiedi la chiave di decrittazione.</li>
              <li><strong>Crittografia in Transito:</strong> Tutte le comunicazioni utilizzano protocolli sicuri (HTTPS/TLS 1.3) con certificati SSL validati</li>
              <li><strong>Crittografia a Riposo:</strong> I dati nel database sono crittografati a riposo con crittografia a livello di database</li>
              <li><strong>Derivazione delle Chiavi:</strong> Le chiavi di crittografia sono derivate dalla tua password utilizzando algoritmi PBKDF2 o Argon2, rendendo impossibile il recupero senza la password</li>
              <li><strong>Autenticazione Forte:</strong> Supporto per passkeys (WebAuthn), autenticazione a due fattori (2FA) e password forti</li>
              <li><strong>Controlli di Accesso:</strong> Accesso limitato ai dati solo al personale autorizzato, con logging di tutte le attività</li>
              <li><strong>Monitoraggio della Sicurezza:</strong> Monitoraggio continuo per rilevare e prevenire violazioni, intrusioni e accessi non autorizzati</li>
              <li><strong>Backup Sicuri:</strong> Backup regolari crittografati con chiavi separate</li>
              <li><strong>Valutazioni Periodiche:</strong> Audit di sicurezza regolari e valutazioni della conformità</li>
            </ul>
            <p class="section-text">
              <strong>Limitazione di Responsabilità:</strong> Nonostante implementiamo le migliori pratiche di sicurezza, nessun sistema è completamente sicuro. Ti incoraggiamo a utilizzare password forti e uniche, abilitare l'autenticazione a due fattori e mantenere riservate le tue credenziali. Nebula AI non può essere ritenuta responsabile per violazioni di sicurezza causate da negligenza dell'utente o da attacchi informatici sofisticati.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">10. I Tuoi Diritti</h2>
            <p class="section-text">
              In conformità con il GDPR, hai i seguenti diritti:
            </p>
            <ul class="section-list">
              <li><strong>Diritto di Accesso:</strong> Ottenere una copia dei tuoi dati personali</li>
              <li><strong>Diritto di Rettifica:</strong> Correggere dati inesatti o incompleti</li>
              <li><strong>Diritto alla Cancellazione:</strong> Richiedere la cancellazione dei tuoi dati</li>
              <li><strong>Diritto di Limitazione:</strong> Limitare il trattamento in determinate circostanze</li>
              <li><strong>Diritto alla Portabilità:</strong> Ricevere i tuoi dati in formato strutturato</li>
              <li><strong>Diritto di Opposizione:</strong> Opporti al trattamento per motivi legittimi</li>
              <li><strong>Diritto di Revoca del Consenso:</strong> Revocare il consenso in qualsiasi momento</li>
              <li><strong>Diritto di Reclamo:</strong> Presentare un reclamo all'autorità di controllo</li>
            </ul>
            <p class="section-text">
              Per esercitare i tuoi diritti, contattaci a: <a href="mailto:privacy@nebula-ai.com" class="link">privacy@nebula-ai.com</a>
            </p>
            <p class="section-text">
              Risponderemo entro un mese (può essere esteso di due mesi per richieste complesse).
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">11. Cookie e Tecnologie Simili</h2>
            <p class="section-text">
              Utilizziamo cookie essenziali per il funzionamento del Servizio, cookie di autenticazione per mantenere la sessione attiva e cookie di preferenze per ricordare le tue impostazioni.
            </p>
            <p class="section-text">
              Puoi gestire le preferenze dei cookie attraverso le impostazioni del tuo browser.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">12. Minori</h2>
            <p class="section-text">
              Il Servizio non è destinato a minori di 13 anni. Non raccogliamo consapevolmente dati personali da minori senza il consenso del genitore o tutore legale. Se veniamo a conoscenza di aver raccolto dati da un minore senza consenso appropriato, elimineremo tali dati immediatamente.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">13. Modifiche a Questa Informativa</h2>
            <p class="section-text">
              Possiamo aggiornare questa Informativa periodicamente. Ti notificheremo le modifiche sostanziali tramite notifica sul Servizio o email. Ti incoraggiamo a rivedere periodicamente questa informativa.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">14. Contatti</h2>
            <p class="section-text">
              Per domande, richieste o reclami riguardo a questa Informativa sulla Privacy, puoi contattarci:
            </p>
            <p class="section-text">
              <strong>Email:</strong> <a href="mailto:privacy@nebula-ai.com" class="link">privacy@nebula-ai.com</a>
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">15. Autorità di Controllo</h2>
            <p class="section-text">
              Hai il diritto di presentare un reclamo all'autorità di controllo competente:
            </p>
            <p class="section-text">
              <strong>Garante per la Protezione dei Dati Personali</strong><br>
              Piazza di Monte Citorio, 121 - 00186 Roma<br>
              <strong>Sito web:</strong> <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" class="link">www.garanteprivacy.it</a><br>
              <strong>Email:</strong> garante@gpdp.it
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

  .privacy-header {
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border-color);
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
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  .privacy-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .privacy-section {
    animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
    line-height: 1.3;
  }

  .section-text {
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-secondary);
    margin: 0 0 12px 0;
  }

  .small-note {
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-tertiary, rgba(255, 255, 255, 0.5));
    font-style: italic;
    padding: 12px;
    background-color: var(--bg-tertiary, rgba(255, 255, 255, 0.03));
    border-left: 3px solid var(--accent-blue);
    border-radius: 4px;
    margin-top: 8px;
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


  /* Responsive Design */

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

    .privacy-title {
      font-size: 24px;
    }
  }

</style>




