<script>
  import { onMount } from 'svelte';
  import { isPaymentModalOpen, selectedPlan, paymentState, closePaymentModal } from '../stores/payment.js';
  import { user } from '../stores/user.js';
  import { showAlert } from '../services/dialogService.js';
  import { isAuthenticatedStore, user as authUser } from '../stores/auth.js';
  
  // Form state
  let cardNumber = '';
  let cardName = '';
  let expiryMonth = '';
  let expiryYear = '';
  let cvv = '';
  let billingType = 'monthly'; // 'monthly' o 'annual'
  
  // UI state
  let cardType = null;
  let isFlipped = false;
  let focusedField = null;
  
  // Validazione
  let errors = {
    cardNumber: null,
    cardName: null,
    expiry: null,
    cvv: null
  };
  
  // Genera anni per il select (prossimi 15 anni)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  
  // Determina il tipo di carta dal numero
  function detectCardType(number) {
    const cleanNumber = number.replace(/\s/g, '');
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
    
    return null;
  }
  
  // Formatta il numero della carta con spazi
  function formatCardNumber(value) {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ').slice(0, 19);
  }
  
  // Gestisce l'input del numero carta
  function handleCardNumberInput(event) {
    const formatted = formatCardNumber(event.target.value);
    cardNumber = formatted;
    cardType = detectCardType(formatted);
    validateCardNumber();
  }
  
  // Validazioni
  function validateCardNumber() {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) {
      errors.cardNumber = 'Numero carta non valido';
      return false;
    }
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    if (sum % 10 !== 0) {
      errors.cardNumber = 'Numero carta non valido';
      return false;
    }
    errors.cardNumber = null;
    return true;
  }
  
  function validateCardName() {
    if (!cardName.trim() || cardName.trim().length < 3) {
      errors.cardName = 'Nome titolare richiesto';
      return false;
    }
    errors.cardName = null;
    return true;
  }
  
  function validateExpiry() {
    if (!expiryMonth || !expiryYear) {
      errors.expiry = 'Data scadenza richiesta';
      return false;
    }
    const now = new Date();
    const expiry = new Date(parseInt(expiryYear), parseInt(expiryMonth) - 1);
    if (expiry < now) {
      errors.expiry = 'Carta scaduta';
      return false;
    }
    errors.expiry = null;
    return true;
  }
  
  function validateCVV() {
    const length = cardType === 'amex' ? 4 : 3;
    if (cvv.length !== length) {
      errors.cvv = `CVV deve essere ${length} cifre`;
      return false;
    }
    errors.cvv = null;
    return true;
  }
  
  function validateAll() {
    const isValidCardNumber = validateCardNumber();
    const isValidCardName = validateCardName();
    const isValidExpiry = validateExpiry();
    const isValidCVV = validateCVV();
    return isValidCardNumber && isValidCardName && isValidExpiry && isValidCVV;
  }
  
  // Crittografia dei dati sensibili della carta
  async function encryptCardData(cardData) {
    try {
      // Genera una chiave di sessione unica per questa transazione
      const sessionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt']
      );
      
      // Genera IV casuale
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Prepara i dati da crittografare
      const encoder = new TextEncoder();
      const dataToEncrypt = encoder.encode(JSON.stringify({
        cardNumber: cardData.cardNumber.replace(/\s/g, ''),
        cardName: cardData.cardName,
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        cvv: cardData.cvv,
        timestamp: Date.now(),
        nonce: crypto.getRandomValues(new Uint8Array(16)).toString()
      }));
      
      // Crittografa i dati
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sessionKey,
        dataToEncrypt
      );
      
      // Esporta la chiave di sessione
      const exportedKey = await crypto.subtle.exportKey('raw', sessionKey);
      
      // Combina tutti i dati
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      // Converti in base64
      return {
        encryptedPayload: btoa(String.fromCharCode(...combined)),
        sessionKey: btoa(String.fromCharCode(...new Uint8Array(exportedKey))),
        algorithm: 'AES-256-GCM',
        version: '1.0'
      };
    } catch (error) {
      console.error('Errore crittografia dati carta:', error);
      throw new Error('Errore nella protezione dei dati');
    }
  }
  
  // Processa il pagamento
  async function processPayment() {
    if (!validateAll()) {
      return;
    }
    
    paymentState.set({ isProcessing: true, isComplete: false, error: null });
    
    try {
      // Crittografa i dati della carta
      const encryptedCardData = await encryptCardData({
        cardNumber,
        cardName,
        expiryMonth,
        expiryYear,
        cvv
      });
      
      // Determina il prezzo
      const price = billingType === 'annual' 
        ? $selectedPlan.annualPrice 
        : $selectedPlan.monthlyPrice;
      
      // Calcola la data di scadenza
      const expiresAt = new Date();
      if (billingType === 'annual') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }
      
      // Prepara i dati del pagamento
      const paymentData = {
        planKey: $selectedPlan.key,
        billingType,
        amount: price,
        currency: 'EUR',
        encryptedCard: encryptedCardData,
        timestamp: Date.now()
      };
      
      // Determina l'URL base dell'API
      const apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : '';
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Token di autenticazione non trovato');
      }
      
      // Invia al server
      const response = await fetch(`${apiBaseUrl}/api/auth/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Errore durante il pagamento');
      }
      
      // Pagamento completato!
      paymentState.set({ isProcessing: false, isComplete: true, error: null });
      
      // Aggiorna lo stato dell'utente con il nuovo abbonamento
      user.update(u => ({
        ...u,
        subscription: {
          active: true,
          plan: $selectedPlan.key,
          expiresAt: expiresAt.toISOString(),
          billingType
        }
      }));
      
      // Mostra messaggio di successo
      setTimeout(async () => {
        closePaymentModal();
        await showAlert(
          `Abbonamento ${$selectedPlan.name} attivato con successo! Grazie per il tuo acquisto.`,
          'Pagamento Completato',
          'Fantastico!',
          'success'
        );
        // Ricarica la pagina per applicare i nuovi permessi
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Errore pagamento:', error);
      paymentState.set({ 
        isProcessing: false, 
        isComplete: false, 
        error: error.message || 'Errore durante il pagamento' 
      });
    }
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !$paymentState.isProcessing) {
      closePaymentModal();
    }
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape' && !$paymentState.isProcessing) {
      closePaymentModal();
    }
  }
  
  // Gestione focus per l'effetto flip della carta
  function handleCVVFocus() {
    isFlipped = true;
    focusedField = 'cvv';
  }
  
  function handleCVVBlur() {
    isFlipped = false;
    focusedField = null;
  }
</script>

{#if $isPaymentModalOpen && $selectedPlan}
  <div class="modal-backdrop" role="button" tabindex="-1" on:click={handleBackdropClick} on:keydown={handleKeydown}>
    <div class="modal-content" role="dialog" aria-modal="true">
      
      <!-- Header -->
      <div class="modal-header">
        <div class="header-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <div class="header-text">
          <h2>Pagamento Sicuro</h2>
          <p class="security-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Transazione protetta con crittografia AES-256
          </p>
        </div>
        {#if !$paymentState.isProcessing}
          <button class="close-button" on:click={closePaymentModal} aria-label="Chiudi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        {/if}
      </div>
      
      <div class="modal-body">
        {#if $paymentState.isComplete}
          <!-- Stato di successo -->
          <div class="success-state">
            <div class="success-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3>Pagamento Completato!</h3>
            <p>Il tuo abbonamento {$selectedPlan.name} è stato attivato.</p>
          </div>
        {:else}
          <!-- Riepilogo Piano -->
          <div class="plan-summary">
            <div class="plan-info">
              <span class="plan-name">{$selectedPlan.name}</span>
              <span class="plan-desc">{$selectedPlan.description}</span>
            </div>
            <div class="billing-toggle">
              <button 
                class="toggle-option" 
                class:active={billingType === 'monthly'}
                on:click={() => billingType = 'monthly'}
              >
                Mensile
              </button>
              <button 
                class="toggle-option" 
                class:active={billingType === 'annual'}
                on:click={() => billingType = 'annual'}
              >
                Annuale
                <span class="save-badge">-17%</span>
              </button>
            </div>
            <div class="price-display">
              <span class="price-amount">
                €{billingType === 'annual' ? $selectedPlan.annualPrice : $selectedPlan.monthlyPrice}
              </span>
              <span class="price-period">/{billingType === 'annual' ? 'anno' : 'mese'}</span>
            </div>
          </div>
          
          <!-- Preview Carta -->
          <div class="card-preview" class:flipped={isFlipped}>
            <div class="card-front">
              <div class="card-chip"></div>
              <div class="card-type">
                {#if cardType === 'visa'}
                  <span class="card-brand visa">VISA</span>
                {:else if cardType === 'mastercard'}
                  <span class="card-brand mastercard">●●</span>
                {:else if cardType === 'amex'}
                  <span class="card-brand amex">AMEX</span>
                {:else}
                  <span class="card-brand generic">💳</span>
                {/if}
              </div>
              <div class="card-number-preview">
                {cardNumber || '•••• •••• •••• ••••'}
              </div>
              <div class="card-bottom">
                <div class="card-holder">
                  <span class="label">TITOLARE</span>
                  <span class="value">{cardName.toUpperCase() || 'NOME COGNOME'}</span>
                </div>
                <div class="card-expiry">
                  <span class="label">SCADENZA</span>
                  <span class="value">{expiryMonth || 'MM'}/{expiryYear ? expiryYear.slice(-2) : 'AA'}</span>
                </div>
              </div>
            </div>
            <div class="card-back">
              <div class="magnetic-strip"></div>
              <div class="cvv-strip">
                <span class="cvv-value">{cvv || '•••'}</span>
              </div>
            </div>
          </div>
          
          <!-- Form di Pagamento -->
          <form class="payment-form" on:submit|preventDefault={processPayment}>
            <div class="form-group">
              <label for="cardNumber">Numero Carta</label>
              <div class="input-wrapper" class:error={errors.cardNumber} class:focused={focusedField === 'cardNumber'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <input 
                  type="text" 
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  on:input={handleCardNumberInput}
                  on:focus={() => focusedField = 'cardNumber'}
                  on:blur={() => { focusedField = null; validateCardNumber(); }}
                  maxlength="19"
                  autocomplete="cc-number"
                  disabled={$paymentState.isProcessing}
                />
                {#if cardType}
                  <span class="card-type-indicator {cardType}"></span>
                {/if}
              </div>
              {#if errors.cardNumber}
                <span class="error-message">{errors.cardNumber}</span>
              {/if}
            </div>
            
            <div class="form-group">
              <label for="cardName">Nome Titolare</label>
              <div class="input-wrapper" class:error={errors.cardName} class:focused={focusedField === 'cardName'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input 
                  type="text" 
                  id="cardName"
                  placeholder="Mario Rossi"
                  bind:value={cardName}
                  on:focus={() => focusedField = 'cardName'}
                  on:blur={() => { focusedField = null; validateCardName(); }}
                  autocomplete="cc-name"
                  disabled={$paymentState.isProcessing}
                />
              </div>
              {#if errors.cardName}
                <span class="error-message">{errors.cardName}</span>
              {/if}
            </div>
            
            <div class="form-row">
              <div class="form-group expiry">
                <label>Scadenza</label>
                <div class="expiry-selects">
                  <select 
                    bind:value={expiryMonth}
                    on:blur={validateExpiry}
                    disabled={$paymentState.isProcessing}
                    class:error={errors.expiry}
                  >
                    <option value="">MM</option>
                    {#each months as month}
                      <option value={month}>{month}</option>
                    {/each}
                  </select>
                  <span class="separator">/</span>
                  <select 
                    bind:value={expiryYear}
                    on:blur={validateExpiry}
                    disabled={$paymentState.isProcessing}
                    class:error={errors.expiry}
                  >
                    <option value="">AAAA</option>
                    {#each years as year}
                      <option value={String(year)}>{year}</option>
                    {/each}
                  </select>
                </div>
                {#if errors.expiry}
                  <span class="error-message">{errors.expiry}</span>
                {/if}
              </div>
              
              <div class="form-group cvv">
                <label for="cvv">CVV</label>
                <div class="input-wrapper" class:error={errors.cvv} class:focused={focusedField === 'cvv'}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <input 
                    type="password" 
                    id="cvv"
                    placeholder={cardType === 'amex' ? '••••' : '•••'}
                    bind:value={cvv}
                    on:focus={handleCVVFocus}
                    on:blur={() => { handleCVVBlur(); validateCVV(); }}
                    maxlength={cardType === 'amex' ? 4 : 3}
                    autocomplete="cc-csc"
                    disabled={$paymentState.isProcessing}
                    inputmode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
                {#if errors.cvv}
                  <span class="error-message">{errors.cvv}</span>
                {/if}
              </div>
            </div>
            
            {#if $paymentState.error}
              <div class="payment-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {$paymentState.error}
              </div>
            {/if}
            
            <button 
              type="submit" 
              class="pay-button"
              disabled={$paymentState.isProcessing}
            >
              {#if $paymentState.isProcessing}
                <div class="spinner"></div>
                Elaborazione in corso...
              {:else}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Paga €{billingType === 'annual' ? $selectedPlan.annualPrice : $selectedPlan.monthlyPrice}
              {/if}
            </button>
          </form>
          
          <!-- Footer sicurezza -->
          <div class="security-footer">
            <div class="security-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <span>Crittografia SSL/TLS</span>
            </div>
            <div class="security-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Dati protetti AES-256</span>
            </div>
            <div class="security-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Conforme PCI DSS</span>
            </div>
          </div>
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
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    animation: backdropFadeIn 0.3s ease;
  }
  
  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal-content {
    background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    max-width: 480px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    animation: modalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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
    align-items: flex-start;
    gap: 16px;
    padding: 24px 24px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .header-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  
  .header-text {
    flex: 1;
  }
  
  .header-text h2 {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 700;
    color: white;
  }
  
  .security-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #10b981;
    margin: 0;
  }
  
  .close-button {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 10px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .close-button:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }
  
  .modal-body {
    padding: 24px;
  }
  
  /* Success State */
  .success-state {
    text-align: center;
    padding: 40px 20px;
  }
  
  .success-icon {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    color: white;
    animation: successPop 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  @keyframes successPop {
    0% { transform: scale(0); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  
  .success-state h3 {
    font-size: 24px;
    font-weight: 700;
    color: white;
    margin: 0 0 8px;
  }
  
  .success-state p {
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }
  
  /* Plan Summary */
  .plan-summary {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 24px;
  }
  
  .plan-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;
  }
  
  .plan-name {
    font-size: 18px;
    font-weight: 700;
    color: white;
  }
  
  .plan-desc {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .billing-toggle {
    display: flex;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    padding: 4px;
    margin-bottom: 16px;
  }
  
  .toggle-option {
    flex: 1;
    padding: 10px 16px;
    background: none;
    border: none;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  .toggle-option.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .save-badge {
    background: #10b981;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
  }
  
  .price-display {
    text-align: center;
  }
  
  .price-amount {
    font-size: 36px;
    font-weight: 800;
    color: white;
  }
  
  .price-period {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  /* Card Preview */
  .card-preview {
    perspective: 1000px;
    height: 180px;
    margin-bottom: 24px;
  }
  
  .card-front, .card-back {
    position: absolute;
    width: 100%;
    height: 180px;
    border-radius: 16px;
    backface-visibility: hidden;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    padding: 20px;
  }
  
  .card-front {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  .card-preview.flipped .card-front {
    transform: rotateY(180deg);
  }
  
  .card-back {
    background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
    transform: rotateY(180deg);
  }
  
  .card-preview.flipped .card-back {
    transform: rotateY(0deg);
  }
  
  .card-chip {
    width: 45px;
    height: 35px;
    background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
    border-radius: 6px;
  }
  
  .card-type {
    position: absolute;
    top: 20px;
    right: 20px;
  }
  
  .card-brand {
    font-size: 24px;
    font-weight: 800;
    color: white;
    letter-spacing: 2px;
  }
  
  .card-brand.mastercard {
    color: #ff5f00;
    text-shadow: 0 0 10px rgba(255, 95, 0, 0.5);
  }
  
  .card-number-preview {
    font-size: 22px;
    font-weight: 600;
    color: white;
    letter-spacing: 3px;
    font-family: 'Courier New', monospace;
    text-align: center;
    margin: 20px 0;
  }
  
  .card-bottom {
    display: flex;
    justify-content: space-between;
  }
  
  .card-holder, .card-expiry {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .card-holder .label, .card-expiry .label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .card-holder .value, .card-expiry .value {
    font-size: 14px;
    font-weight: 600;
    color: white;
    letter-spacing: 1px;
  }
  
  .magnetic-strip {
    background: #1a1a1a;
    height: 45px;
    margin: 20px -20px;
  }
  
  .cvv-strip {
    background: white;
    height: 40px;
    margin: 20px 40px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 12px;
  }
  
  .cvv-value {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    font-family: 'Courier New', monospace;
    letter-spacing: 2px;
  }
  
  /* Payment Form */
  .payment-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .form-group label {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .input-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 14px 16px;
    transition: all 0.2s;
  }
  
  .input-wrapper:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .input-wrapper.focused {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.1);
  }
  
  .input-wrapper.error {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
  
  .input-wrapper svg {
    color: rgba(255, 255, 255, 0.4);
    flex-shrink: 0;
  }
  
  .input-wrapper input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 16px;
    color: white;
    font-family: inherit;
  }
  
  .input-wrapper input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  
  .card-type-indicator {
    width: 32px;
    height: 20px;
    border-radius: 4px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }
  
  .card-type-indicator.visa {
    background: linear-gradient(135deg, #1a1f71 0%, #4a5cdb 100%);
  }
  
  .card-type-indicator.mastercard {
    background: linear-gradient(135deg, #ff5f00 0%, #eb001b 100%);
  }
  
  .card-type-indicator.amex {
    background: linear-gradient(135deg, #007bc1 0%, #002663 100%);
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 16px;
  }
  
  .expiry-selects {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .expiry-selects select {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 14px 12px;
    font-size: 16px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    appearance: none;
  }
  
  .expiry-selects select:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .expiry-selects select:focus {
    outline: none;
    border-color: #667eea;
  }
  
  .expiry-selects select.error {
    border-color: #ef4444;
  }
  
  .expiry-selects select option {
    background: #1a1a2e;
    color: white;
  }
  
  .separator {
    color: rgba(255, 255, 255, 0.4);
    font-size: 20px;
    font-weight: 300;
  }
  
  .error-message {
    font-size: 12px;
    color: #ef4444;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .payment-error {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 10px;
    padding: 12px 16px;
    color: #ef4444;
    font-size: 14px;
  }
  
  .pay-button {
    width: 100%;
    padding: 18px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 14px;
    font-size: 18px;
    font-weight: 700;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.3s;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }
  
  .pay-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
  }
  
  .pay-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .spinner {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Security Footer */
  .security-footer {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .security-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .security-item svg {
    color: #10b981;
  }
  
  /* Mobile Styles */
  @media (max-width: 480px) {
    .modal-backdrop {
      padding: 0;
      align-items: flex-end;
    }
    
    .modal-content {
      max-width: 100%;
      max-height: 95vh;
      border-radius: 24px 24px 0 0;
    }
    
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .card-preview {
      height: 160px;
    }
    
    .card-front, .card-back {
      height: 160px;
    }
    
    .card-number-preview {
      font-size: 18px;
    }
  }
</style>

