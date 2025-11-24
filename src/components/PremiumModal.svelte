<script>
  import { isPremiumModalOpen } from '../stores/app.js';
  import { isMobile } from '../stores/app.js';
  import { user } from '../stores/user.js';
  
  let selectedPlan = 'monthly'; // 'monthly' o 'yearly'
  let showPaymentForm = false;
  let couponCode = '';
  let couponApplied = false;
  let couponDiscount = 0;
  let isProcessing = false;
  let isActivating = false;
  
  // Dati del form di pagamento
  let paymentData = {
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    billingAddress: '',
    city: '',
    postalCode: '',
    country: 'IT'
  };
  
  const plans = {
    monthly: {
      name: 'Pro',
      price: 30,
      period: 'mese',
      badge: 'Popolare',
      description: 'Accesso completo a Nebula AI Premium Pro e tutte le funzionalità avanzate.',
      features: [
        'Accesso a Nebula AI Premium Pro (modello premium avanzato)',
        'Accesso a tutti i modelli standard (Nebula AI 1.0, Pro, Coder)',
        'Token illimitati per chat',
        'Caricamenti illimitati di file e immagini',
        'Esportazione chat avanzata (Markdown, PDF, JSON)',
        'Supporto prioritario',
        'Aggiornamenti e nuove funzionalità in anteprima'
      ]
    },
    yearly: {
      name: 'Massimo',
      price: 300,
      period: 'mese',
      badge: null,
      description: 'Il piano completo con accesso a tutti i modelli premium e funzionalità esclusive.',
      features: [
        'Accesso a Nebula AI Premium Max (il modello più avanzato)',
        'Accesso a Nebula AI Premium Pro incluso',
        'Accesso a tutti i modelli standard (Nebula AI 1.0, Pro, Coder)',
        'Token illimitati per chat',
        'Caricamenti illimitati di file e immagini',
        'Esportazione chat avanzata (Markdown, PDF, JSON)',
        'Supporto prioritario dedicato',
        'Accesso anticipato a nuovi modelli e funzionalità',
        'Analisi avanzata di immagini e documenti',
        'API access incluso'
      ]
    }
  };
  
  function closeModal() {
    isPremiumModalOpen.set(false);
    showPaymentForm = false;
    selectedPlan = 'monthly';
    couponCode = '';
    couponApplied = false;
    couponDiscount = 0;
    isProcessing = false;
    isActivating = false;
    resetPaymentForm();
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function selectPlan(plan) {
    selectedPlan = plan;
    showPaymentForm = true;
  }
  
  function applyCoupon() {
    // Simula validazione coupon (in produzione collegheresti a un'API)
    const validCoupons = {
      'DEVTEST': 100, // Sconto 100% per sviluppo/test
      'WELCOME10': 10,
      'PREMIUM20': 20,
      'SAVE50': 50
    };
    
    const discount = validCoupons[couponCode.toUpperCase()];
    if (discount) {
      couponApplied = true;
      couponDiscount = discount;
    } else {
      alert('Codice coupon non valido');
      couponCode = '';
    }
  }
  
  $: isDevTestCoupon = couponApplied && couponCode.toUpperCase() === 'DEVTEST';
  $: requiresPaymentData = !isDevTestCoupon;
  
  function removeCoupon() {
    couponCode = '';
    couponApplied = false;
    couponDiscount = 0;
  }
  
  function formatCardNumber(value) {
    // Rimuovi spazi e caratteri non numerici
    const cleaned = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Aggiungi spazi ogni 4 cifre
    const matches = cleaned.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return cleaned;
    }
  }
  
  function handleCardNumberInput(event) {
    const formatted = formatCardNumber(event.target.value);
    paymentData.cardNumber = formatted;
    event.target.value = formatted;
  }
  
  function handleExpiryInput(event) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    const parts = value.split('/');
    paymentData.expiryMonth = parts[0] || '';
    paymentData.expiryYear = parts[1] || '';
    event.target.value = value;
  }
  
  function handleCvvInput(event) {
    paymentData.cvv = event.target.value.replace(/\D/g, '').substring(0, 4);
    event.target.value = paymentData.cvv;
  }
  
  function resetPaymentForm() {
    paymentData = {
      cardNumber: '',
      cardHolder: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      billingAddress: '',
      city: '',
      postalCode: '',
      country: 'IT'
    };
  }
  
  function calculateTotal() {
    const plan = plans[selectedPlan];
    let total = plan.price;
    if (couponApplied && couponDiscount > 0) {
      total = total - (total * couponDiscount / 100);
    }
    return Math.max(0, total).toFixed(2); // Non può essere negativo
  }
  
  $: finalPrice = parseFloat(calculateTotal());
  $: isFree = finalPrice === 0 || (couponApplied && couponDiscount === 100);
  
  async function handlePayment(event) {
    event.preventDefault();
    
    // Calcola se è gratuito (doppio controllo)
    const currentTotal = parseFloat(calculateTotal());
    const isCurrentlyFree = currentTotal === 0 || (couponApplied && couponDiscount === 100);
    
    // Validazione form solo se NON è gratuito
    if (!isCurrentlyFree && requiresPaymentData) {
      if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length < 16) {
        alert('Inserisci un numero di carta valido');
        return;
      }
      if (!paymentData.cardHolder || paymentData.cardHolder.trim().length < 3) {
        alert('Inserisci il nome del titolare della carta');
        return;
      }
      if (!paymentData.expiryMonth || !paymentData.expiryYear) {
        alert('Inserisci la data di scadenza');
        return;
      }
      if (!paymentData.cvv || paymentData.cvv.length < 3) {
        alert('Inserisci il CVV');
        return;
      }
    }
    
    isProcessing = true;
    
    // Simula processamento pagamento (solo se non è gratuito)
    if (!isCurrentlyFree) {
      console.log('Processing payment:', {
        plan: selectedPlan,
        amount: calculateTotal(),
        coupon: couponCode || null,
        paymentData: {
          ...paymentData,
          cvv: '***' // Non inviare il CVV reale nei log
        }
      });
      
      // Simula delay pagamento
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    isProcessing = false;
    isActivating = true;
    
    // Simula attivazione abbonamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Attiva abbonamento premium
    const planType = selectedPlan === 'monthly' ? 'pro' : 'max';
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (selectedPlan === 'monthly' ? 1 : 1)); // 1 mese per entrambi
    
    user.update(u => ({
      ...u,
      isLoggedIn: true,
      subscription: {
        active: true,
        plan: planType,
        expiresAt: expiresAt.toISOString()
      }
    }));
    
    isActivating = false;
    
    // Chiudi modal dopo conferma
    setTimeout(() => {
      closeModal();
      alert(`Abbonamento ${plans[selectedPlan].name} attivato con successo! Benvenuto in Premium!`);
    }, 500);
  }
  
  function goBack() {
    showPaymentForm = false;
  }
</script>

{#if $isPremiumModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content" class:modal-mobile={$isMobile} role="dialog" aria-modal="true" aria-labelledby="premium-modal-title">
      <div class="modal-header">
        <div class="premium-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h2 id="premium-modal-title">Abbonamento Premium</h2>
        <button class="close-button" on:click={closeModal} aria-label="Chiudi">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        {#if !showPaymentForm}
          <!-- Selezione Piano -->
          <div class="plans-selection">
            <p class="section-description">Scegli il piano che fa per te</p>
            
            <div class="plans-grid">
              <div class="plan-card" class:selected={selectedPlan === 'monthly'} on:click={() => selectPlan('monthly')}>
                {#if plans.monthly.badge}
                  <div class="plan-badge">{plans.monthly.badge}</div>
                {/if}
                <div class="plan-header">
                  <h3>{plans.monthly.name}</h3>
                  <div class="plan-price">
                    <span class="price-amount">€{plans.monthly.price.toFixed(2)}</span>
                    <span class="price-period">/{plans.monthly.period}</span>
                  </div>
                </div>
                <p class="plan-description">{plans.monthly.description}</p>
                <ul class="plan-features">
                  {#each plans.monthly.features as feature}
                    <li>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {feature}
                    </li>
                  {/each}
                </ul>
                <button class="select-plan-button">Ottieni Pro</button>
              </div>
              
              <div class="plan-card" class:selected={selectedPlan === 'yearly'} on:click={() => selectPlan('yearly')}>
                {#if plans.yearly.badge}
                  <div class="plan-badge">{plans.yearly.badge}</div>
                {/if}
                <div class="plan-header">
                  <h3>{plans.yearly.name}</h3>
                  <div class="plan-price">
                    <span class="price-amount">€{plans.yearly.price.toFixed(2)}</span>
                    <span class="price-period">/{plans.yearly.period}</span>
                  </div>
                </div>
                <p class="plan-description">{plans.yearly.description}</p>
                <ul class="plan-features">
                  {#each plans.yearly.features as feature}
                    <li>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {feature}
                    </li>
                  {/each}
                </ul>
                <button class="select-plan-button">Ottieni Massimo</button>
              </div>
            </div>
          </div>
        {:else}
          <!-- Form di Pagamento -->
          <form class="payment-form" on:submit={handlePayment} novalidate>
            <div class="form-section">
              <h3>Riepilogo Ordine</h3>
              <div class="order-summary">
                <div class="summary-row">
                  <span>Piano selezionato:</span>
                  <span>{plans[selectedPlan].name}</span>
                </div>
                <div class="summary-row">
                  <span>Prezzo:</span>
                  <span>€{plans[selectedPlan].price.toFixed(2)}</span>
                </div>
                {#if couponApplied}
                  <div class="summary-row discount">
                    <span>Sconto ({couponDiscount}%):</span>
                    <span>-€{(plans[selectedPlan].price * couponDiscount / 100).toFixed(2)}</span>
                  </div>
                {/if}
                <div class="summary-row total">
                  <span>Totale:</span>
                  <span>€{calculateTotal()}</span>
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h3>Codice Coupon</h3>
              <div class="coupon-section">
                {#if !couponApplied}
                  <div class="coupon-input-group">
                    <input
                      type="text"
                      class="form-input"
                      placeholder="Inserisci codice coupon"
                      bind:value={couponCode}
                      disabled={couponApplied}
                    />
                    <button type="button" class="apply-coupon-button" on:click={applyCoupon}>
                      Applica
                    </button>
                  </div>
                {:else}
                  <div class="coupon-applied">
                    <span>Coupon {couponCode} applicato (-{couponDiscount}%)</span>
                    <button type="button" class="remove-coupon-button" on:click={removeCoupon}>
                      Rimuovi
                    </button>
                  </div>
                {/if}
              </div>
            </div>
            
            {#if requiresPaymentData}
              <div class="form-section">
                <h3>Dati di Pagamento</h3>
                
                <div class="form-group">
                  <label for="cardNumber">Numero Carta</label>
                  <input
                    id="cardNumber"
                    type="text"
                    class="form-input"
                    placeholder="1234 5678 9012 3456"
                    maxlength="19"
                    on:input={handleCardNumberInput}
                    required={!isFree}
                  />
                </div>
                
                <div class="form-group">
                  <label for="cardHolder">Nome Titolare</label>
                  <input
                    id="cardHolder"
                    type="text"
                    class="form-input"
                    placeholder="Mario Rossi"
                    bind:value={paymentData.cardHolder}
                    required={!isFree}
                  />
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="expiry">Scadenza (MM/AA)</label>
                    <input
                      id="expiry"
                      type="text"
                      class="form-input"
                      placeholder="MM/AA"
                      maxlength="5"
                      on:input={handleExpiryInput}
                      required={!isFree}
                    />
                  </div>
                  
                  <div class="form-group">
                    <label for="cvv">CVV</label>
                    <input
                      id="cvv"
                      type="text"
                      class="form-input"
                      placeholder="123"
                      maxlength="4"
                      on:input={handleCvvInput}
                      required={!isFree}
                    />
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="billingAddress">Indirizzo di Fatturazione</label>
                  <input
                    id="billingAddress"
                    type="text"
                    class="form-input"
                    placeholder="Via Roma 123"
                    bind:value={paymentData.billingAddress}
                  />
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="city">Città</label>
                    <input
                      id="city"
                      type="text"
                      class="form-input"
                      placeholder="Roma"
                      bind:value={paymentData.city}
                    />
                  </div>
                  
                  <div class="form-group">
                    <label for="postalCode">CAP</label>
                    <input
                      id="postalCode"
                      type="text"
                      class="form-input"
                      placeholder="00100"
                      bind:value={paymentData.postalCode}
                      maxlength="10"
                    />
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="country">Paese</label>
                  <select id="country" class="form-input" bind:value={paymentData.country}>
                    <option value="IT">Italia</option>
                    <option value="US">Stati Uniti</option>
                    <option value="GB">Regno Unito</option>
                    <option value="DE">Germania</option>
                    <option value="FR">Francia</option>
                    <option value="ES">Spagna</option>
                  </select>
                </div>
              </div>
            {:else}
              <div class="form-section free-payment-notice">
                <div class="free-notice">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <p>Pagamento gratuito con coupon applicato. Nessun dato di pagamento richiesto.</p>
                </div>
              </div>
            {/if}
            
            <div class="form-footer">
              <button type="button" class="back-button" on:click={goBack} disabled={isProcessing || isActivating}>
                Indietro
              </button>
              <button type="submit" class="pay-button" disabled={isProcessing || isActivating}>
                {#if isProcessing}
                  <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Processamento...
                {:else if isActivating}
                  <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Attivazione...
                {:else if isFree}
                  Attiva Gratis
                {:else}
                  Paga €{calculateTotal()}
                {/if}
              </button>
            </div>
          </form>
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
    max-width: 600px;
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

  .section-description {
    text-align: center;
    color: var(--text-secondary);
    margin-bottom: 24px;
    font-size: 14px;
  }

  .plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  .plan-card {
    background-color: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .plan-card:hover {
    border-color: var(--accent-blue);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .plan-card.selected {
    border-color: #fbbf24;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
  }

  .plan-badge {
    position: absolute;
    top: -12px;
    right: 20px;
    background: #10b981;
    color: #fff;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    border: 1px solid #10b981;
  }

  .plan-header {
    margin-bottom: 20px;
  }

  .plan-header h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
  }

  .plan-price {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 12px;
  }

  .price-amount {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .price-period {
    font-size: 16px;
    color: var(--text-secondary);
  }

  .price-savings {
    font-size: 12px;
    color: #10b981;
    font-weight: 500;
    margin-top: 4px;
  }

  .plan-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 20px 0;
    line-height: 1.5;
  }

  .plan-features {
    list-style: none;
    padding: 0;
    margin: 0 0 20px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .plan-features li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: var(--text-primary);
  }

  .plan-features li svg {
    color: #10b981;
    flex-shrink: 0;
  }

  .select-plan-button {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    border: none;
    border-radius: 8px;
    color: #000;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .select-plan-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
  }

  .payment-form {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .form-section {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
  }

  .form-section h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 16px 0;
  }

  .order-summary {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: var(--text-primary);
  }

  .summary-row.discount {
    color: #10b981;
  }

  .summary-row.total {
    font-weight: 600;
    font-size: 18px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
    color: var(--text-primary);
  }

  .coupon-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .coupon-input-group {
    display: flex;
    gap: 8px;
  }

  .coupon-input-group .form-input {
    flex: 1;
  }

  .apply-coupon-button {
    padding: 10px 20px;
    background-color: var(--accent-blue);
    border: none;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    white-space: nowrap;
  }

  .apply-coupon-button:hover {
    background-color: #2563eb;
  }

  .coupon-applied {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background-color: rgba(16, 185, 129, 0.1);
    border: 1px solid #10b981;
    border-radius: 6px;
    color: #10b981;
    font-size: 14px;
  }

  .remove-coupon-button {
    background: none;
    border: none;
    color: #10b981;
    cursor: pointer;
    font-size: 12px;
    text-decoration: underline;
    padding: 4px;
  }

  .remove-coupon-button:hover {
    color: #059669;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .form-input {
    padding: 10px 12px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }

  .form-input:focus {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-input::placeholder {
    color: var(--text-secondary);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .form-footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
  }

  .back-button {
    padding: 12px 24px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .back-button:hover {
    background-color: var(--hover-bg);
  }

  .pay-button {
    flex: 1;
    padding: 12px 24px;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    border: none;
    border-radius: 8px;
    color: #000;
    font-weight: 600;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pay-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
  }

  .pay-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .pay-button .spinner {
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-right: 8px;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .free-payment-notice {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
    border-color: #10b981;
  }

  .free-notice {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #10b981;
    padding: 8px 0;
  }

  .free-notice svg {
    flex-shrink: 0;
  }

  .free-notice p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
  }

  .back-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 0;
    }

    .modal-content.modal-mobile {
      max-width: 100%;
      max-height: 100vh;
      height: 100vh;
      border-radius: 0;
      margin: 0;
    }

    .modal-header {
      padding: 20px 16px;
    }

    .modal-body {
      padding: 20px 16px;
    }

    .plans-grid {
      grid-template-columns: 1fr;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .form-footer {
      flex-direction: column-reverse;
    }

    .back-button,
    .pay-button {
      width: 100%;
    }
  }
</style>
