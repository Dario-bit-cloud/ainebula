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
              Nebula AI rispetta la tua privacy e si impegna a proteggere i tuoi dati personali. Questa Informativa sulla Privacy spiega come raccogliamo, utilizziamo, condividiamo e proteggiamo le tue informazioni personali quando utilizzi il nostro servizio.
            </p>
            <p class="section-text">
              Questa informativa è conforme al Regolamento Generale sulla Protezione dei Dati (GDPR) dell'Unione Europea e alle leggi italiane sulla protezione dei dati personali.
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
            <h2 class="section-title">3. Dati Personali Raccolti</h2>
            <p class="section-text">
              <strong>3.1 Dati Forniti Direttamente dall'Utente:</strong>
            </p>
            <ul class="section-list">
              <li>Informazioni di registrazione (username, email, password crittografata)</li>
              <li>Informazioni di profilo e preferenze</li>
              <li>Contenuti utente (messaggi, chat, file caricati)</li>
              <li>Informazioni di pagamento (per piani a pagamento)</li>
            </ul>
            <p class="section-text">
              <strong>3.2 Dati Raccolti Automaticamente:</strong>
            </p>
            <ul class="section-list">
              <li>Dati tecnici (indirizzo IP, tipo di browser, sistema operativo)</li>
              <li>Dati di utilizzo (pagine visitate, funzionalità utilizzate)</li>
              <li>Dati di sessione (token di autenticazione, timestamp)</li>
              <li>Dati di dispositivo</li>
            </ul>
            <p class="section-text">
              <strong>3.3 Dati da Terze Parti:</strong>
            </p>
            <p class="section-text">
              Potremmo ricevere informazioni da fornitori di autenticazione, pagamento o servizi AI.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">4. Base Giuridica del Trattamento</h2>
            <p class="section-text">
              Trattiamo i tuoi dati personali sulla base di:
            </p>
            <ul class="section-list">
              <li><strong>Consenso:</strong> Quando hai fornito il consenso esplicito</li>
              <li><strong>Esecuzione del Contratto:</strong> Per fornire il Servizio</li>
              <li><strong>Interesse Legittimo:</strong> Per migliorare il Servizio e garantire la sicurezza</li>
              <li><strong>Obbligo Legale:</strong> Per adempiere a obblighi legali</li>
            </ul>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">5. Finalità del Trattamento</h2>
            <p class="section-text">
              Utilizziamo i tuoi dati personali per:
            </p>
            <ul class="section-list">
              <li>Fornire e gestire il Servizio</li>
              <li>Migliorare funzionalità e prestazioni</li>
              <li>Comunicare con te riguardo al Servizio</li>
              <li>Proteggere il Servizio da accessi non autorizzati</li>
              <li>Adempiere a obblighi legali</li>
            </ul>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">6. Condivisione dei Dati</h2>
            <p class="section-text">
              <strong>Non vendiamo i tuoi dati personali.</strong> Condividiamo i tuoi dati solo nelle seguenti circostanze:
            </p>
            <ul class="section-list">
              <li><strong>Fornitori di Servizi:</strong> Con fornitori che ci assistono nell'erogazione del Servizio (hosting, servizi AI, pagamenti), tutti vincolati da accordi di riservatezza</li>
              <li><strong>Obblighi Legali:</strong> Se richiesto dalla legge o da autorità competenti</li>
              <li><strong>Trasferimenti Aziendali:</strong> In caso di fusione o acquisizione</li>
              <li><strong>Con il Tuo Consenso:</strong> Quando hai fornito il consenso esplicito</li>
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
              Conserviamo i tuoi dati solo per il tempo necessario:
            </p>
            <ul class="section-list">
              <li><strong>Dati dell'Account:</strong> Fino a quando il tuo account è attivo o fino a cancellazione</li>
              <li><strong>Dati delle Chat:</strong> Fino a quando non elimini le chat o il tuo account</li>
              <li><strong>Dati di Sessione:</strong> Massimo 7 giorni dopo la scadenza</li>
              <li><strong>Dati di Log:</strong> Massimo 12 mesi</li>
            </ul>
            <p class="section-text">
              Dopo il periodo di conservazione, i dati vengono eliminati in modo sicuro o anonimizzati.
            </p>
          </section>
          
          <section class="privacy-section">
            <h2 class="section-title">9. Sicurezza dei Dati</h2>
            <p class="section-text">
              Implementiamo misure tecniche e organizzative appropriate per proteggere i tuoi dati:
            </p>
            <ul class="section-list">
              <li>Crittografia end-to-end per i messaggi (quando abilitata)</li>
              <li>Crittografia in transito (HTTPS/TLS)</li>
              <li>Crittografia a riposo nel database</li>
              <li>Controlli di accesso limitati</li>
              <li>Autenticazione forte (passkeys, 2FA)</li>
              <li>Monitoraggio continuo della sicurezza</li>
            </ul>
            <p class="section-text">
              Nonostante queste misure, nessun sistema è completamente sicuro. Ti incoraggiamo a utilizzare password forti.
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




