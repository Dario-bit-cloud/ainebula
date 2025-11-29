<script>
  import { onMount, onDestroy } from 'svelte';
  import { isPremiumModalOpen } from '../stores/app.js';
  import { isMobile } from '../stores/app.js';
  import { user } from '../stores/user.js';
  import { isAuthenticatedStore } from '../stores/auth.js';
  import { showAlert, showConfirm } from '../services/dialogService.js';
  import { getPatreonAuthUrl, getPatreonStatus, syncPatreonMembership, unlinkPatreonAccount } from '../services/patreonService.js';
  import { saveSubscription } from '../services/subscriptionService.js';
  
  let selectedPlan = 'premium'; // 'premium', 'monthly' o 'yearly'
  let selectedDuration = 1; // Durata in mesi
  let showPaymentForm = false;
  let couponCode = '';
  let couponApplied = false;
  let couponDiscount = 0;
  let isProcessing = false;
  let isActivating = false;
  let plansContainerRef;
  
  // Opzioni di durata disponibili (in mesi)
  const durationOptions = [
    { value: 1, label: '1 mese', months: 1 },
    { value: 2, label: '2 mesi', months: 2 },
    { value: 3, label: '3 mesi', months: 3 },
    { value: 6, label: '6 mesi', months: 6 },
    { value: 12, label: '1 anno', months: 12 },
    { value: 24, label: '2 anni', months: 24 },
    { value: 60, label: '5 anni', months: 60 }
  ];
  
  // Sconti progressivi in base alla durata
  const durationDiscounts = {
    1: 0,    // Nessuno sconto per 1 mese
    2: 5,    // 5% di sconto per 2 mesi
    3: 10,   // 10% di sconto per 3 mesi
    6: 15,   // 15% di sconto per 6 mesi
    12: 20,  // 20% di sconto per 1 anno
    24: 30,  // 30% di sconto per 2 anni
    60: 40   // 40% di sconto per 5 anni
  };
  
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
    premium: {
      name: 'Premium',
      basePrice: 5, // Prezzo mensile base
      badge: 'Patreon',
      description: 'Piano base con accesso a funzionalità essenziali di Nebula AI. Perfetto per iniziare.',
      features: [
        'Accesso a modelli standard (Nebula AI 1.5, Pro, Coder)',
        'Token generosi per chat',
        'Caricamento file e immagini',
        'Esportazione chat base (Markdown)',
        'Supporto via email'
      ],
      patreonEnabled: false
      patreonEnabled: false
    },
    monthly: {
      name: 'Pro',
      basePrice: 30, // Prezzo mensile base
      badge: 'Popolare',
      description: 'Accesso completo a Nebula AI Premium Pro e tutte le funzionalità avanzate.',
      features: [
        'Accesso a Nebula AI Premium Pro (modello premium avanzato)',
        'Accesso a tutti i modelli standard (Nebula AI 1.5, Pro, Coder)',
        'Token illimitati per chat',
        'Caricamenti illimitati di file e immagini',
        'Esportazione chat avanzata (Markdown, PDF, JSON)',
        'Supporto prioritario',
        'Aggiornamenti e nuove funzionalità in anteprima'
      ]
    },
    yearly: {
      name: 'Massimo',
      basePrice: 300, // Prezzo mensile base
      badge: null,
      description: 'Il piano completo con accesso a tutti i modelli premium e funzionalità esclusive.',
      features: [
        'Accesso a Nebula AI Premium Max (il modello più avanzato)',
        'Accesso a Nebula AI Premium Pro incluso',
        'Accesso a tutti i modelli standard (Nebula AI 1.5, Pro, Coder)',
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
  
  // Calcola il prezzo base per la durata selezionata
  function getBasePriceForDuration() {
    const plan = plans[selectedPlan];
    const durationOption = durationOptions.find(d => d.value === selectedDuration);
    if (!durationOption) return plan.basePrice;
    
    return plan.basePrice * durationOption.months;
  }
  
  // Calcola lo sconto per la durata selezionata
  function getDurationDiscount() {
    return durationDiscounts[selectedDuration] || 0;
  }
  
  // Calcola il prezzo con sconto durata
  function getPriceWithDurationDiscount() {
    const basePrice = getBasePriceForDuration();
    const discount = getDurationDiscount();
    return basePrice * (1 - discount / 100);
  }
  
  function closeModal() {
    isPremiumModalOpen.set(false);
    showPaymentForm = false;
    selectedPlan = 'premium';
    selectedDuration = 1;
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
  
  let patreonLinkStatus = null;
  let isCheckingPatreon = false;
  
  // Carica stato collegamento Patreon quando si apre il modal
  onMount(async () => {
    if ($isAuthenticatedStore && $isPremiumModalOpen) {
      try {
        const status = await getPatreonStatus();
        if (status.success) {
          patreonLinkStatus = status;
        }
      } catch (error) {
        console.error('Errore caricamento stato Patreon:', error);
      }
    }
  });
  
  function selectPlan(plan) {
    selectedPlan = plan;
    // Su mobile, scrolla al piano selezionato prima di aprire il form
    if ($isMobile && plansContainerRef && !showPaymentForm) {
      setTimeout(() => {
        scrollToPlan(plan);
      }, 100);
    }
    
    // Se è il piano premium, mostra opzione Patreon invece del form di pagamento
    if (plan === 'premium') {
      // Non aprire subito il form, mostra opzione Patreon
      showPaymentForm = false;
    } else {
      showPaymentForm = true;
    }
  }
  
  async function handlePatreonLink() {
    if (!$isAuthenticatedStore) {
      await showAlert('Devi essere autenticato per collegare Patreon', 'Autenticazione richiesta', 'OK', 'warning');
      return;
    }
    
    try {
      const authUrl = getPatreonAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Errore collegamento Patreon:', error);
      await showAlert('Errore durante il collegamento con Patreon', 'Errore', 'OK', 'error');
    }
  }
  
  async function handlePatreonSync() {
    if (!$isAuthenticatedStore) {
      await showAlert('Devi essere autenticato per sincronizzare Patreon', 'Autenticazione richiesta', 'OK', 'warning');
      return;
    }
    
    isCheckingPatreon = true;
    
    try {
      const syncResult = await syncPatreonMembership();
      
      if (syncResult.success && syncResult.hasActiveMembership) {
        // Aggiorna store utente
        user.update(u => ({
          ...u,
          subscription: {
            active: true,
            plan: 'premium',
            expiresAt: syncResult.subscription?.expires_at,
            key: `NEBULA-PREMIUM-PATREON-${Date.now()}`
          }
        }));
        
        // Ricarica stato
        const status = await getPatreonStatus();
        if (status.success) {
          patreonLinkStatus = status;
        }
        
        await showAlert('Abbonamento Premium sincronizzato e attivo!', 'Patreon sincronizzato', 'OK', 'success');
      } else {
        await showAlert(syncResult.message || 'Nessun abbonamento Premium attivo trovato. Assicurati di essere iscritto al tier da almeno 5€/mese su Patreon.', 'Abbonamento non trovato', 'OK', 'warning');
      }
    } catch (error) {
      console.error('Errore sincronizzazione Patreon:', error);
      await showAlert('Errore durante la sincronizzazione dell\'abbonamento Patreon', 'Errore', 'OK', 'error');
    } finally {
      isCheckingPatreon = false;
    }
  }
  
  async function handlePatreonUnlink() {
    if (!$isAuthenticatedStore) {
      return;
    }
    
    const confirmed = await showConfirm(
      'Sei sicuro di voler scollegare il tuo account Patreon? Il tuo abbonamento Premium verrà disattivato.',
      'Scollega Patreon',
      'Scollega',
      'Annulla',
      'danger'
    );
    
    if (!confirmed) return;
    
    try {
      const result = await unlinkPatreonAccount();
      
      if (result.success) {
        // Aggiorna store utente
        user.update(u => ({
          ...u,
          subscription: {
            active: false,
            plan: null,
            expiresAt: null,
            key: null
          }
        }));
        
        // Ricarica stato
        const status = await getPatreonStatus();
        if (status.success) {
          patreonLinkStatus = status;
        }
        
        await showAlert('Account Patreon scollegato con successo', 'Patreon scollegato', 'OK', 'success');
      } else {
        await showAlert(result.message || 'Errore durante lo scollegamento', 'Errore', 'OK', 'error');
      }
    } catch (error) {
      console.error('Errore scollegamento Patreon:', error);
      await showAlert('Errore durante lo scollegamento con Patreon', 'Errore', 'OK', 'error');
    }
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
      showAlert('Codice coupon non valido', 'Coupon non valido', 'OK', 'error');
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
    let total = getPriceWithDurationDiscount();
    if (couponApplied && couponDiscount > 0) {
      total = total - (total * couponDiscount / 100);
    }
    return Math.max(0, total).toFixed(2); // Non può essere negativo
  }
  
  // Formatta la durata per la visualizzazione
  function formatDuration(months) {
    if (months === 1) return '1 mese';
    if (months < 12) return `${months} mesi`;
    if (months === 12) return '1 anno';
    if (months === 24) return '2 anni';
    if (months === 60) return '5 anni';
    return `${months} mesi`;
  }
  
  // Calcola il risparmio rispetto al prezzo mensile
  function calculateSavings() {
    const basePrice = getBasePriceForDuration();
    const discountedPrice = getPriceWithDurationDiscount();
    return basePrice - discountedPrice;
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
        await showAlert('Inserisci un numero di carta valido', 'Dati mancanti', 'OK', 'warning');
        return;
      }
      if (!paymentData.cardHolder || paymentData.cardHolder.trim().length < 3) {
        await showAlert('Inserisci il nome del titolare della carta', 'Dati mancanti', 'OK', 'warning');
        return;
      }
      if (!paymentData.expiryMonth || !paymentData.expiryYear) {
        await showAlert('Inserisci la data di scadenza', 'Dati mancanti', 'OK', 'warning');
        return;
      }
      if (!paymentData.cvv || paymentData.cvv.length < 3) {
        await showAlert('Inserisci il CVV', 'Dati mancanti', 'OK', 'warning');
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
    const planType = selectedPlan === 'premium' ? 'premium' : (selectedPlan === 'monthly' ? 'pro' : 'max');
    const durationOption = durationOptions.find(d => d.value === selectedDuration);
    const months = durationOption ? durationOption.months : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);
    
    // Genera una chiave univoca per l'abbonamento
    const subscriptionKey = `NEBULA-${selectedPlan.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Salva l'abbonamento nel database se l'utente è autenticato
    if ($isAuthenticatedStore) {
      try {
        const { saveSubscription } = await import('../services/subscriptionService.js');
        const subscriptionResult = await saveSubscription({
          plan: planType,
          expiresAt: expiresAt.toISOString(),
          autoRenew: true,
          billingCycle: selectedPlan === 'monthly' ? 'monthly' : 'yearly',
          amount: parseFloat(calculateTotal()),
          currency: 'EUR'
        });
        
        if (!subscriptionResult.success) {
          console.error('Errore salvataggio abbonamento nel database:', subscriptionResult.message);
          // Continua comunque con il salvataggio locale
        }
      } catch (error) {
        console.error('Errore durante il salvataggio dell\'abbonamento:', error);
        // Continua comunque con il salvataggio locale
      }
    }
    
    user.update(u => ({
      ...u,
      isLoggedIn: true,
      subscription: {
        active: true,
        plan: planType,
        expiresAt: expiresAt.toISOString(),
        key: subscriptionKey
      }
    }));
    
    isActivating = false;
    
    // Chiudi modal dopo conferma
    setTimeout(async () => {
      closeModal();
      await showAlert(`Abbonamento ${plans[selectedPlan].name} attivato con successo! Benvenuto in Premium!`, 'Abbonamento attivato', 'OK', 'success');
    }, 500);
  }
  
  function goBack() {
    showPaymentForm = false;
  }
  
  function handlePlansScroll() {
    if (!$isMobile || !plansContainerRef) return;
    
    // Trova il piano più vicino al centro durante lo scroll
    const container = plansContainerRef;
    const containerCenter = container.scrollLeft + container.offsetWidth / 2;
    const planCards = container.querySelectorAll('.plan-card');
    
    let closestCard = null;
    let closestDistance = Infinity;
    
    planCards.forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - containerCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCard = card;
      }
    });
    
    if (closestCard) {
      const planType = closestCard.getAttribute('data-plan');
      if (planType && planType !== selectedPlan) {
        selectedPlan = planType;
      }
    }
  }
  
  function scrollToPlan(planType) {
    if (!plansContainerRef || !$isMobile) return;
    
    const planCard = plansContainerRef.querySelector(`[data-plan="${planType}"]`);
    if (planCard) {
      const container = plansContainerRef;
      const cardLeft = planCard.offsetLeft;
      const cardWidth = planCard.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;
      const cardCenter = cardLeft + cardWidth / 2;
      const containerCenter = scrollLeft + containerWidth / 2;
      const scrollTo = scrollLeft + (cardCenter - containerCenter);
      
      container.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  }
  
  // Gestisci listener per lo scroll dei piani
  let scrollListenerAdded = false;
  
  // Aggiungi listener quando plansContainerRef è disponibile
  $: if (plansContainerRef && $isMobile && !scrollListenerAdded) {
    plansContainerRef.addEventListener('scroll', handlePlansScroll, { passive: true });
    scrollListenerAdded = true;
  }
  
  // Rimuovi listener quando il componente viene distrutto
  onDestroy(() => {
    if (plansContainerRef && scrollListenerAdded) {
      plansContainerRef.removeEventListener('scroll', handlePlansScroll);
      scrollListenerAdded = false;
    }
  });
  
  // Scrolla al piano selezionato quando il modal si apre su mobile
  $: if ($isPremiumModalOpen && $isMobile && selectedPlan && plansContainerRef && !showPaymentForm) {
    setTimeout(() => {
      scrollToPlan(selectedPlan);
    }, 300);
  }
</script>

  {#if $isPremiumModalOpen}
  <div class="modal-backdrop" role="button" tabindex="-1" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="premium-modal-title">
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
        {#if !showPaymentForm && selectedPlan !== 'premium'}
          <!-- Selezione Piano -->
          <div class="plans-selection">
            <p class="section-description">Scegli il piano che fa per te</p>
            
            <div class="plans-grid" bind:this={plansContainerRef} on:scroll={handlePlansScroll}>
              <div class="plan-card" class:selected={selectedPlan === 'premium'} data-plan="premium" role="button" tabindex="0" on:click={() => selectPlan('premium')} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), selectPlan('premium'))}>
                {#if plans.premium.badge}
                  <div class="plan-badge">{plans.premium.badge}</div>
                {/if}
                <div class="plan-header">
                  <h3>{plans.premium.name}</h3>
                  <div class="plan-price">
                    <span class="price-amount">€{plans.premium.basePrice.toFixed(2)}</span>
                    <span class="price-period">/mese</span>
                  </div>
                </div>
                <p class="plan-description">{plans.premium.description}</p>
                <ul class="plan-features">
                  {#each plans.premium.features as feature}
                    <li>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {feature}
                    </li>
                  {/each}
                </ul>
                <button class="select-plan-button">Ottieni Premium</button>
              </div>
              
              <div class="plan-card" class:selected={selectedPlan === 'monthly'} data-plan="monthly" role="button" tabindex="0" on:click={() => selectPlan('monthly')} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), selectPlan('monthly'))}>
                {#if plans.monthly.badge}
                  <div class="plan-badge">{plans.monthly.badge}</div>
                {/if}
                <div class="plan-header">
                  <h3>{plans.monthly.name}</h3>
                  <div class="plan-price">
                    <span class="price-amount">€{plans.monthly.basePrice.toFixed(2)}</span>
                    <span class="price-period">/mese</span>
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
              
              <div class="plan-card" class:selected={selectedPlan === 'yearly'} data-plan="yearly" role="button" tabindex="0" on:click={() => selectPlan('yearly')} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), selectPlan('yearly'))}>
                {#if plans.yearly.badge}
                  <div class="plan-badge">{plans.yearly.badge}</div>
                {/if}
                <div class="plan-header">
                  <h3>{plans.yearly.name}</h3>
                  <div class="plan-price">
                    <span class="price-amount">€{plans.yearly.basePrice.toFixed(2)}</span>
                    <span class="price-period">/mese</span>
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
            
            <!-- Selezione Durata -->
            <div class="duration-selection">
              <h3 class="duration-title">Scegli la durata dell'abbonamento</h3>
              <p class="duration-description">Più paghi in anticipo, più risparmi!</p>
              <div class="duration-options">
                {#each durationOptions as option}
                  <button
                    type="button"
                    class="duration-button"
                    class:active={selectedDuration === option.value}
                    on:click={() => selectedDuration = option.value}
                  >
                    <span class="duration-label">{option.label}</span>
                    {#if durationDiscounts[option.value] > 0}
                      <span class="duration-discount-badge">-{durationDiscounts[option.value]}%</span>
                    {/if}
                  </button>
                {/each}
              </div>
              
              {#if selectedPlan && selectedDuration}
                <div class="duration-preview">
                  <div class="preview-row">
                    <span>Prezzo base ({formatDuration(durationOptions.find(d => d.value === selectedDuration)?.months || 1)}):</span>
                    <span>€{getBasePriceForDuration().toFixed(2)}</span>
                  </div>
                  {#if getDurationDiscount() > 0}
                    <div class="preview-row discount">
                      <span>Sconto durata ({getDurationDiscount()}%):</span>
                      <span>-€{calculateSavings().toFixed(2)}</span>
                    </div>
                  {/if}
                  <div class="preview-row total">
                    <span>Totale:</span>
                    <span>€{getPriceWithDurationDiscount().toFixed(2)}</span>
                  </div>
                  {#if getDurationDiscount() > 0}
                    <div class="savings-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                      </svg>
                      <span>Risparmi €{calculateSavings().toFixed(2)} pagando in anticipo!</span>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {:else if selectedPlan === 'premium'}
          <!-- Patreon in Manutenzione -->
          <div class="patreon-selection">
            <div class="patreon-header">
              <div class="patreon-icon maintenance">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <h3>Patreon in Manutenzione</h3>
              <p class="patreon-description">
                L'integrazione con Patreon è temporaneamente in manutenzione. Stiamo lavorando per migliorare il servizio.
              </p>
              <div class="maintenance-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <span>In Manutenzione</span>
              </div>
            </div>
            
            <div class="patreon-alternative">
              <button 
                class="alternative-button" 
                on:click={() => {
                  selectedPlan = 'monthly';
                  showPaymentForm = true;
                }}
              >
                Scegli il piano Pro
              </button>
            </div>
            
            <div class="patreon-back">
              <button 
                class="back-button" 
                on:click={() => {
                  selectedPlan = 'premium';
                  showPaymentForm = false;
                }}
              >
                ← Torna alla selezione piani
              </button>
            </div>
          </div>
        {:else}
          <!-- Form di Pagamento -->
          <div class="payment-modal-wrapper">
            <form class="payment-form-new" on:submit={handlePayment} novalidate>
              <!-- Riepilogo Ordine -->
              <div class="order-summary-section">
                <h3>Riepilogo Ordine</h3>
                <div class="order-summary">
                  <div class="summary-row">
                    <span>Piano selezionato:</span>
                    <span>{plans[selectedPlan].name}</span>
                  </div>
                  <div class="summary-row">
                    <span>Durata:</span>
                    <span>{formatDuration(durationOptions.find(d => d.value === selectedDuration)?.months || 1)}</span>
                  </div>
                  <div class="summary-row">
                    <span>Prezzo base:</span>
                    <span>€{getBasePriceForDuration().toFixed(2)}</span>
                  </div>
                  {#if getDurationDiscount() > 0}
                    <div class="summary-row discount">
                      <span>Sconto durata ({getDurationDiscount()}%):</span>
                      <span>-€{calculateSavings().toFixed(2)}</span>
                    </div>
                  {/if}
                  {#if couponApplied}
                    <div class="summary-row discount">
                      <span>Sconto coupon ({couponDiscount}%):</span>
                      <span>-€{(getPriceWithDurationDiscount() * couponDiscount / 100).toFixed(2)}</span>
                    </div>
                  {/if}
                  <div class="summary-row total">
                    <span>Totale:</span>
                    <span>€{calculateTotal()}</span>
                  </div>
                </div>
              </div>

              <!-- Codice Coupon -->
              <div class="coupon-section-new">
                <h3>Codice Coupon</h3>
                {#if !couponApplied}
                  <div class="coupon-input-group">
                    <input
                      type="text"
                      class="coupon-input"
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

              {#if requiresPaymentData}
                <!-- Metodi di Pagamento -->
                <div class="payment--options">
                  <button name="paypal" type="button" on:click={() => console.log('PayPal selected')}>
                    <svg xml:space="preserve" viewBox="0 0 124 33" height="33px" width="124px" y="0px" x="0px" id="Layer_1" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">
                      <path d="M46.211,6.749h-6.839c-0.468,0-0.866,0.34-0.939,0.802l-2.766,17.537c-0.055,0.346,0.213,0.658,0.564,0.658  h3.265c0.468,0,0.866-0.34,0.939-0.803l0.746-4.73c0.072-0.463,0.471-0.803,0.938-0.803h2.165c4.505,0,7.105-2.18,7.784-6.5  c0.306-1.89,0.013-3.375-0.872-4.415C50.224,7.353,48.5,6.749,46.211,6.749z M47,13.154c-0.374,2.454-2.249,2.454-4.062,2.454  h-1.032l0.724-4.583c0.043-0.277,0.283-0.481,0.563-0.481h0.473c1.235,0,2.4,0,3.002,0.704C47.027,11.668,47.137,12.292,47,13.154z" fill="#253B80"></path>
                      <path d="M66.654,13.075h-3.275c-0.279,0-0.52,0.204-0.563,0.481l-0.145,0.916l-0.229-0.332  c-0.709-1.029-2.29-1.373-3.868-1.373c-3.619,0-6.71,2.741-7.312,6.586c-0.313,1.918,0.132,3.752,1.22,5.031  c0.998,1.176,2.426,1.666,4.125,1.666c2.916,0,4.533-1.875,4.533-1.875l-0.146,0.91c-0.055,0.348,0.213,0.66,0.562,0.66h2.95  c0.469,0,0.865-0.34,0.939-0.803l1.77-11.209C67.271,13.388,67.004,13.075,66.654,13.075z M62.089,19.449  c-0.316,1.871-1.801,3.127-3.695,3.127c-0.951,0-1.711-0.305-2.199-0.883c-0.484-0.574-0.668-1.391-0.514-2.301  c0.295-1.855,1.805-3.152,3.67-3.152c0.93,0,1.686,0.309,2.184,0.892C62.034,17.721,62.232,18.543,62.089,19.449z" fill="#253B80"></path>
                      <path d="M84.096,13.075h-3.291c-0.314,0-0.609,0.156-0.787,0.417l-4.539,6.686l-1.924-6.425  c-0.121-0.402-0.492-0.678-0.912-0.678h-3.234c-0.393,0-0.666,0.384-0.541,0.754l3.625,10.638l-3.408,4.811  c-0.268,0.379,0.002,0.9,0.465,0.9h3.287c0.312,0,0.604-0.152,0.781-0.408L84.564,13.97C84.826,13.592,84.557,13.075,84.096,13.075z" fill="#253B80"></path>
                      <path d="M94.992,6.749h-6.84c-0.467,0-0.865,0.34-0.938,0.802l-2.766,17.537c-0.055,0.346,0.213,0.658,0.562,0.658  h3.51c0.326,0,0.605-0.238,0.656-0.562l0.785-4.971c0.072-0.463,0.471-0.803,0.938-0.803h2.164c4.506,0,7.105-2.18,7.785-6.5  c0.307-1.89,0.012-3.375-0.873-4.415C99.004,7.353,97.281,6.749,94.992,6.749z M95.781,13.154c-0.373,2.454-2.248,2.454-4.062,2.454  h-1.031l0.725-4.583c0.043-0.277,0.281-0.481,0.562-0.481h0.473c1.234,0,2.4,0,3.002,0.704  C95.809,11.668,95.918,12.292,95.781,13.154z" fill="#179BD7"></path>
                      <path d="M115.434,13.075h-3.273c-0.281,0-0.52,0.204-0.562,0.481l-0.145,0.916l-0.23-0.332  c-0.709-1.029-2.289-1.373-3.867-1.373c-3.619,0-6.709,2.741-7.311,6.586c-0.312,1.918,0.131,3.752,1.219,5.031  c1,1.176,2.426,1.666,4.125,1.666c2.916,0,4.533-1.875,4.533-1.875l-0.146,0.91c-0.055,0.348,0.213,0.66,0.564,0.66h2.949  c0.467,0,0.865-0.34,0.938-0.803l1.771-11.209C116.053,13.388,115.785,13.075,115.434,13.075z M110.869,19.449  c-0.314,1.871-1.801,3.127-3.695,3.127c-0.949,0-1.711-0.305-2.199-0.883c-0.484-0.574-0.666-1.391-0.514-2.301  c0.297-1.855,1.805-3.152,3.67-3.152c0.93,0,1.686,0.309,2.184,0.892C110.816,17.721,111.014,18.543,110.869,19.449z" fill="#179BD7"></path>
                      <path d="M119.295,7.23l-2.807,17.858c-0.055,0.346,0.213,0.658,0.562,0.658h2.822c0.469,0,0.867-0.34,0.939-0.803  l2.768-17.536c0.055-0.346-0.213-0.659-0.562-0.659h-3.16C119.578,6.749,119.338,6.953,119.295,7.23z" fill="#179BD7"></path>
                      <path d="M7.266,29.154l0.523-3.322l-1.165-0.027H1.061L4.927,1.292C4.939,1.218,4.978,1.149,5.035,1.1  c0.057-0.049,0.13-0.076,0.206-0.076h9.38c3.114,0,5.263,0.648,6.385,1.927c0.526,0.6,0.861,1.227,1.023,1.917  c0.17,0.724,0.173,1.589,0.007,2.644l-0.012,0.077v0.676l0.526,0.298c0.443,0.235,0.795,0.504,1.065,0.812  c0.45,0.513,0.741,1.165,0.864,1.938c0.127,0.795,0.085,1.741-0.123,2.812c-0.24,1.232-0.628,2.305-1.152,3.183  c-0.482,0.809-1.096,1.48-1.825,2c-0.696,0.494-1.523,0.869-2.458,1.109c-0.906,0.236-1.939,0.355-3.072,0.355h-0.73  c-0.522,0-1.029,0.188-1.427,0.525c-0.399,0.344-0.663,0.814-0.744,1.328l-0.055,0.299l-0.924,5.855l-0.042,0.215  c-0.011,0.068-0.03,0.102-0.058,0.125c-0.025,0.021-0.061,0.035-0.096,0.035H7.266z" fill="#253B80"></path>
                      <path d="M23.048,7.667L23.048,7.667L23.048,7.667c-0.028,0.179-0.06,0.362-0.096,0.55  c-1.237,6.351-5.469,8.545-10.874,8.545H9.326c-0.661,0-1.218,0.48-1.321,1.132l0,0l0,0L6.596,26.83l-0.399,2.533  c-0.067,0.428,0.263,0.814,0.695,0.814h4.881c0.578,0,1.069-0.42,1.16-0.99l0.048-0.248l0.919-5.832l0.059-0.32  c0.09-0.572,0.582-0.992,1.16-0.992h0.73c4.729,0,8.431-1.92,9.513-7.476c0.452-2.321,0.218-4.259-0.978-5.622  C24.022,8.286,23.573,7.945,23.048,7.667z" fill="#179BD7"></path>
                      <path d="M21.754,7.151c-0.189-0.055-0.384-0.105-0.584-0.15c-0.201-0.044-0.407-0.083-0.619-0.117  c-0.742-0.12-1.555-0.177-2.426-0.177h-7.352c-0.181,0-0.353,0.041-0.507,0.115C9.927,6.985,9.675,7.306,9.614,7.699L8.05,17.605  l-0.045,0.289c0.103-0.652,0.66-1.132,1.321-1.132h2.752c5.405,0,9.637-2.195,10.874-8.545c0.037-0.188,0.068-0.371,0.096-0.55  c-0.313-0.166-0.652-0.308-1.017-0.429C21.941,7.208,21.848,7.179,21.754,7.151z" fill="#222D65"></path>
                      <path d="M9.614,7.699c0.061-0.393,0.313-0.714,0.652-0.876c0.155-0.074,0.326-0.115,0.507-0.115h7.352  c0.871,0,1.684,0.057,2.426,0.177c0.212,0.034,0.418,0.073,0.619,0.117c0.2,0.045,0.395,0.095,0.584,0.15  c0.094,0.028,0.187,0.057,0.278,0.086c0.365,0.121,0.704,0.264,1.017,0.429c0.368-2.347-0.003-3.945-1.272-5.392  C20.378,0.682,17.853,0,14.622,0h-9.38c-0.66,0-1.223,0.48-1.325,1.133L0.01,25.898c-0.077,0.49,0.301,0.932,0.795,0.932h5.791  l1.454-9.225L9.614,7.699z" fill="#253B80"></path>
                    </svg>
                  </button>
                  <button name="apple-pay" type="button" on:click={() => console.log('Apple Pay selected')}>
                    <svg xml:space="preserve" viewBox="0 0 512 210.2" height="33px" width="124px" y="0px" x="0px" id="Layer_1" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">
                      <path d="M93.6,27.1C87.6,34.2,78,39.8,68.4,39c-1.2-9.6,3.5-19.8,9-26.1c6-7.3,16.5-12.5,25-12.9  C103.4,10,99.5,19.8,93.6,27.1 M102.3,40.9c-13.9-0.8-25.8,7.9-32.4,7.9c-6.7,0-16.8-7.5-27.8-7.3c-14.3,0.2-27.6,8.3-34.9,21.2  c-15,25.8-3.9,64,10.6,85c7.1,10.4,15.6,21.8,26.8,21.4c10.6-0.4,14.8-6.9,27.6-6.9c12.9,0,16.6,6.9,27.8,6.7  c11.6-0.2,18.9-10.4,26-20.8c8.1-11.8,11.4-23.3,11.6-23.9c-0.2-0.2-22.4-8.7-22.6-34.3c-0.2-21.4,17.5-31.6,18.3-32.2  C123.3,42.9,107.7,41.3,102.3,40.9 M182.6,11.9v155.9h24.2v-53.3h33.5c30.6,0,52.1-21,52.1-51.4c0-30.4-21.1-51.2-51.3-51.2H182.6z   M206.8,32.3h27.9c21,0,33,11.2,33,30.9c0,19.7-12,31-33.1,31h-27.8V32.3z M336.6,169c15.2,0,29.3-7.7,35.7-19.9h0.5v18.7h22.4V90.2  c0-22.5-18-37-45.7-37c-25.7,0-44.7,14.7-45.4,34.9h21.8c1.8-9.6,10.7-15.9,22.9-15.9c14.8,0,23.1,6.9,23.1,19.6v8.6l-30.2,1.8  c-28.1,1.7-43.3,13.2-43.3,33.2C298.4,155.6,314.1,169,336.6,169z M343.1,150.5c-12.9,0-21.1-6.2-21.1-15.7c0-9.8,7.9-15.5,23-16.4  l26.9-1.7v8.8C371.9,140.1,359.5,150.5,343.1,150.5z M425.1,210.2c23.6,0,34.7-9,44.4-36.3L512,54.7h-24.6l-28.5,92.1h-0.5  l-28.5-92.1h-25.3l41,113.5l-2.2,6.9c-3.7,11.7-9.7,16.2-20.4,16.2c-1.9,0-5.6-0.2-7.1-0.4v18.7C417.3,210,423.3,210.2,425.1,210.2z" id="XMLID_34_"></path>
                    </svg>
                  </button>
                  <button name="google-pay" type="button" on:click={() => console.log('Google Pay selected')}>
                    <svg fill="none" viewBox="0 0 80 39" height="33px" width="124px" xmlns="http://www.w3.org/2000/svg">
                      <g clip-path="url(#clip0_134_34)">
                        <path fill="#5F6368" d="M37.8 19.7V29H34.8V6H42.6C44.5 6 46.3001 6.7 47.7001 8C49.1001 9.2 49.8 11 49.8 12.9C49.8 14.8 49.1001 16.5 47.7001 17.8C46.3001 19.1 44.6 19.8 42.6 19.8L37.8 19.7ZM37.8 8.8V16.8H42.8C43.9 16.8 45.0001 16.4 45.7001 15.6C47.3001 14.1 47.3 11.6 45.8 10.1L45.7001 10C44.9001 9.2 43.9 8.7 42.8 8.8H37.8Z"></path>
                        <path fill="#5F6368" d="M56.7001 12.8C58.9001 12.8 60.6001 13.4 61.9001 14.6C63.2001 15.8 63.8 17.4 63.8 19.4V29H61V26.8H60.9001C59.7001 28.6 58 29.5 56 29.5C54.3 29.5 52.8 29 51.6 28C50.5 27 49.8 25.6 49.8 24.1C49.8 22.5 50.4 21.2 51.6 20.2C52.8 19.2 54.5 18.8 56.5 18.8C58.3 18.8 59.7 19.1 60.8 19.8V19.1C60.8 18.1 60.4 17.1 59.6 16.5C58.8 15.8 57.8001 15.4 56.7001 15.4C55.0001 15.4 53.7 16.1 52.8 17.5L50.2001 15.9C51.8001 13.8 53.9001 12.8 56.7001 12.8ZM52.9001 24.2C52.9001 25 53.3001 25.7 53.9001 26.1C54.6001 26.6 55.4001 26.9 56.2001 26.9C57.4001 26.9 58.6 26.4 59.5 25.5C60.5 24.6 61 23.5 61 22.3C60.1 21.6 58.8 21.2 57.1 21.2C55.9 21.2 54.9 21.5 54.1 22.1C53.3 22.6 52.9001 23.3 52.9001 24.2Z"></path>
                        <path fill="#5F6368" d="M80 13.3L70.1 36H67.1L70.8 28.1L64.3 13.4H67.5L72.2 24.7H72.3L76.9 13.4H80V13.3Z"></path>
                        <path fill="#4285F4" d="M25.9 17.7C25.9 16.8 25.8 15.9 25.7 15H13.2V20.1H20.3C20 21.7 19.1 23.2 17.7 24.1V27.4H22C24.5 25.1 25.9 21.7 25.9 17.7Z"></path>
                        <path fill="#34A853" d="M13.1999 30.5999C16.7999 30.5999 19.7999 29.3999 21.9999 27.3999L17.6999 24.0999C16.4999 24.8999 14.9999 25.3999 13.1999 25.3999C9.7999 25.3999 6.7999 23.0999 5.7999 19.8999H1.3999V23.2999C3.6999 27.7999 8.1999 30.5999 13.1999 30.5999Z"></path>
                        <path fill="#FBBC04" d="M5.8001 19.8999C5.2001 18.2999 5.2001 16.4999 5.8001 14.7999V11.3999H1.4001C-0.499902 15.0999 -0.499902 19.4999 1.4001 23.2999L5.8001 19.8999Z"></path>
                        <path fill="#EA4335" d="M13.2 9.39996C15.1 9.39996 16.9 10.1 18.3 11.4L22.1 7.59996C19.7 5.39996 16.5 4.09996 13.3 4.19996C8.3 4.19996 3.7 6.99996 1.5 11.5L5.9 14.9C6.8 11.7 9.8 9.39996 13.2 9.39996Z"></path>
                      </g>
                      <defs>
                        <clipPath id="clip0_134_34">
                          <rect fill="white" height="38.1" width="80"></rect>
                        </clipPath>
                      </defs>
                    </svg>
                  </button>
                </div>

                <div class="separator">
                  <hr class="line">
                  <p>or pay using credit card</p>
                  <hr class="line">
                </div>

                <div class="credit-card-info--form">
                  <div class="input_container">
                    <label for="cardHolder" class="input_label">Card holder full name</label>
                    <input 
                      id="cardHolder" 
                      class="input_field" 
                      type="text" 
                      name="cardHolder" 
                      title="Card holder name" 
                      placeholder="Enter your full name"
                      bind:value={paymentData.cardHolder}
                      required={!isFree}
                    >
                  </div>
                  <div class="input_container">
                    <label for="cardNumber" class="input_label">Card Number</label>
                    <input 
                      id="cardNumber" 
                      class="input_field" 
                      type="text" 
                      name="cardNumber" 
                      title="Card number" 
                      placeholder="0000 0000 0000 0000"
                      maxlength="19"
                      value={paymentData.cardNumber}
                      on:input={handleCardNumberInput}
                      required={!isFree}
                    >
                  </div>
                  <div class="input_container">
                    <label for="expiry" class="input_label">Expiry Date / CVV</label>
                    <div class="split">
                      <input 
                        id="expiry" 
                        class="input_field" 
                        type="text" 
                        name="expiry" 
                        title="Expiry Date" 
                        placeholder="01/23"
                        maxlength="5"
                        value={paymentData.expiryMonth && paymentData.expiryYear ? `${paymentData.expiryMonth}/${paymentData.expiryYear}` : ''}
                        on:input={handleExpiryInput}
                        required={!isFree}
                      >
                      <input 
                        id="cvv" 
                        class="input_field" 
                        type="text" 
                        name="cvv" 
                        title="CVV" 
                        placeholder="CVV"
                        maxlength="4"
                        value={paymentData.cvv}
                        on:input={handleCvvInput}
                        required={!isFree}
                      >
                    </div>
                  </div>
                </div>
              {:else}
                <div class="free-payment-notice">
                  <div class="free-notice">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <p>Pagamento gratuito con coupon applicato. Nessun dato di pagamento richiesto.</p>
                  </div>
                </div>
              {/if}

              <div class="form-footer-new">
                <button type="button" class="back-button" on:click={goBack} disabled={isProcessing || isActivating}>
                  Indietro
                </button>
                <button type="submit" class="purchase--btn" disabled={isProcessing || isActivating}>
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
                    Checkout €{calculateTotal()}
                  {/if}
                </button>
              </div>
            </form>
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
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    padding: 20px;
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 0;
      align-items: flex-end;
      background-color: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
    }
  }

  @keyframes backdropFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
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
  
  @media (max-width: 768px) {
    .modal-content {
      max-width: 100%;
      max-height: 90vh;
      height: 90vh;
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3);
    }
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
  
  @media (max-width: 768px) {
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    position: relative;
    flex-shrink: 0;
  }
  
  @media (max-width: 768px) {
    .modal-header {
      padding: 16px 20px;
      border-bottom: none;
    }
    
    .modal-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--border-color);
    }
    
    .modal-header h2 {
      font-size: 20px;
      font-weight: 700;
    }
    
    .close-button {
      min-width: 44px;
      min-height: 44px;
      padding: 10px;
      border-radius: 50%;
      background-color: var(--bg-tertiary);
    }
  }

  .premium-icon {
    color: #fbbf24;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-header h2 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    flex: 1;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 4px;
  }

  .close-button:hover {
    opacity: 0.7;
    background-color: rgba(255, 255, 255, 0.1);
    transform: rotate(90deg);
  }

  .modal-body {
    padding: 16px 20px;
    flex: 1;
    overflow-y: auto;
  }

  .section-description {
    text-align: center;
    color: var(--text-secondary);
    margin-bottom: 16px;
    font-size: 13px;
  }

  .plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    .plans-grid {
      display: flex;
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      gap: 16px;
      scroll-snap-type: x mandatory;
      scroll-padding: 0 16px;
      scroll-behavior: smooth;
      padding: 0 16px;
    }
    
    .plans-grid::-webkit-scrollbar {
      display: none;
    }
  }

  .plan-card {
    background-color: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  
  @media (max-width: 768px) {
    .plan-card {
      min-width: calc(100vw - 64px);
      max-width: calc(100vw - 64px);
      flex-shrink: 0;
      scroll-snap-align: center;
      scroll-snap-stop: always;
    }
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
    margin-bottom: 12px;
  }

  .plan-header h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
  }

  .plan-price {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 8px;
  }

  .price-amount {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .price-period {
    font-size: 16px;
    color: var(--text-secondary);
  }


  .plan-description {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 12px 0;
    line-height: 1.4;
  }

  .plan-features {
    list-style: none;
    padding: 0;
    margin: 0 0 12px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .plan-features li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .plan-features li svg {
    color: #10b981;
    flex-shrink: 0;
    margin-top: 2px;
    width: 14px;
    height: 14px;
  }

  .select-plan-button {
    width: 100%;
    padding: 10px;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    border: none;
    border-radius: 8px;
    color: #000;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .select-plan-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
  }

  /* Payment Modal Wrapper */
  .payment-modal-wrapper {
    width: 100%;
  }

  .payment-form-new {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 0;
  }

  /* Order Summary Section */
  .order-summary-section {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
  }

  .order-summary-section h3 {
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

  /* Coupon Section */
  .coupon-section-new {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
  }

  .coupon-section-new h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 16px 0;
  }

  .coupon-input-group {
    display: flex;
    gap: 8px;
  }

  .coupon-input {
    flex: 1;
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

  .coupon-input:focus {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .coupon-input::placeholder {
    color: var(--text-secondary);
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

  /* Payment Options - New UI */
  .payment--options {
    width: 100%;
    display: grid;
    grid-template-columns: 33% 34% 33%;
    gap: 20px;
    padding: 10px 0;
  }

  .payment--options button {
    height: 55px;
    background: var(--bg-tertiary, #F2F2F2);
    border-radius: 11px;
    padding: 0;
    border: 1px solid var(--border-color, transparent);
    outline: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.15, 0.83, 0.66, 1);
  }

  .payment--options button:hover {
    background: var(--hover-bg, #E5E5E5);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .payment--options button svg {
    height: 18px;
    width: auto;
  }

  .payment--options button:last-child svg {
    height: 22px;
  }

  /* Separator */
  .separator {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    gap: 10px;
    color: #8B8E98;
    margin: 0;
    align-items: center;
  }

  .separator > p {
    word-break: keep-all;
    display: block;
    text-align: center;
    font-weight: 600;
    font-size: 11px;
    margin: auto;
    color: var(--text-secondary, #8B8E98);
  }

  .separator .line {
    display: inline-block;
    width: 100%;
    height: 1px;
    border: 0;
    background-color: var(--border-color, #e8e8e8);
    margin: auto;
  }

  /* Credit Card Form - New UI */
  .credit-card-info--form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .input_container {
    width: 100%;
    height: fit-content;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .input_label {
    font-size: 10px;
    color: var(--text-secondary, #8B8E98);
    font-weight: 600;
  }

  .input_field {
    width: auto;
    height: 40px;
    padding: 0 0 0 16px;
    border-radius: 9px;
    outline: none;
    background-color: var(--bg-tertiary, #F2F2F2);
    border: 1px solid transparent;
    transition: all 0.3s cubic-bezier(0.15, 0.83, 0.66, 1);
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
  }

  .input_field:focus {
    border: 1px solid transparent;
    box-shadow: 0px 0px 0px 2px var(--text-primary, #242424);
    background-color: var(--bg-secondary, transparent);
  }

  .input_field::placeholder {
    color: var(--text-secondary, #8B8E98);
  }

  .split {
    display: grid;
    grid-template-columns: 4fr 2fr;
    gap: 15px;
  }

  .split input {
    width: 100%;
  }


  /* Form Footer */
  .form-footer-new {
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

  .back-button:hover:not(:disabled) {
    background-color: var(--hover-bg);
  }

  .back-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Purchase Button - New UI */
  .purchase--btn {
    flex: 1;
    height: 55px;
    background: linear-gradient(180deg, #363636 0%, #1B1B1B 50%, #000000 100%);
    border-radius: 11px;
    border: 0;
    outline: none;
    color: #ffffff;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0px 0px 0px 0px #FFFFFF, 0px 0px 0px 0px #000000;
    transition: all 0.3s cubic-bezier(0.15, 0.83, 0.66, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .purchase--btn:hover:not(:disabled) {
    box-shadow: 0px 0px 0px 2px #FFFFFF, 0px 0px 0px 4px #0000003a;
  }

  .purchase--btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .purchase--btn .spinner {
    animation: spin 1s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Free Payment Notice */
  .free-payment-notice {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
    border: 1px solid #10b981;
    border-radius: 8px;
    padding: 20px;
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

  /* Duration Selection */
  .duration-selection {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--border-color);
  }

  .duration-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
  }

  .duration-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 20px 0;
  }

  .duration-options {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
  }

  .duration-button {
    flex: 1;
    min-width: 100px;
    padding: 12px 16px;
    background-color: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    position: relative;
  }

  .duration-button:hover {
    border-color: var(--accent-blue);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .duration-button.active {
    border-color: #fbbf24;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
    box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
  }

  .duration-label {
    font-weight: 600;
  }

  .duration-discount-badge {
    font-size: 11px;
    color: #10b981;
    background-color: rgba(16, 185, 129, 0.1);
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 600;
  }

  .duration-preview {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
  }

  .preview-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .preview-row.discount {
    color: #10b981;
  }

  .preview-row.total {
    font-weight: 600;
    font-size: 18px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
    margin-top: 8px;
    margin-bottom: 12px;
  }

  .savings-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
    border: 1px solid #10b981;
    border-radius: 6px;
    color: #10b981;
    font-size: 13px;
    font-weight: 500;
  }

  .savings-info svg {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .duration-options {
      flex-direction: row;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding-bottom: 8px;
    }
    
    .duration-options::-webkit-scrollbar {
      display: none;
    }
    
    .duration-button {
      min-width: 90px;
      flex-shrink: 0;
    }
    
    .duration-selection {
      margin-top: 24px;
      padding-top: 20px;
    }
  }

  /* Patreon Section Styles */
  .patreon-selection {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .patreon-header {
    text-align: center;
    margin-bottom: 8px;
  }
  
  .patreon-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 16px;
    color: #FF424D;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .patreon-icon.maintenance {
    color: #f59e0b;
  }
  
  .maintenance-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 8px;
    color: #f59e0b;
    font-size: 14px;
    font-weight: 500;
    margin-top: 16px;
  }
  
  .patreon-header h3 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
  }
  
  .patreon-description {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }
  
  .patreon-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .patreon-status {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }
  
  .status-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
  }
  
  .status-badge.linked {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
    border: 1px solid #10b981;
    color: #10b981;
  }
  
  .patreon-button {
    width: 100%;
    padding: 14px 20px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  
  .patreon-button.link-button {
    background: linear-gradient(135deg, #FF424D 0%, #E63946 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(255, 66, 77, 0.3);
  }
  
  .patreon-button.link-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 66, 77, 0.4);
  }
  
  .patreon-button.check-button {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }
  
  .patreon-button.check-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }
  
  .patreon-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .patreon-info {
    font-size: 13px;
    color: var(--text-secondary);
    text-align: center;
    margin: 0;
    line-height: 1.5;
  }
  
  .patreon-alternative {
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
  }
  
  .alternative-button {
    width: 100%;
    padding: 12px;
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .alternative-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }
  
  .patreon-back {
    padding-top: 8px;
  }
  
  .patreon-back .back-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 14px;
    cursor: pointer;
    padding: 8px;
    transition: color 0.2s;
  }
  
  .patreon-back .back-button:hover {
    color: var(--text-primary);
  }
  
  .patreon-button .spinner {
    animation: spin 1s linear infinite;
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    }
    
    .modal-content {
      max-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
    }
    
    .modal-header {
      padding-top: calc(16px + env(safe-area-inset-top));
    }
    
    .modal-body {
      padding: 20px 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      padding-bottom: calc(20px + env(safe-area-inset-bottom));
    }
    
    .plans-selection {
      padding: 0 16px;
    }
    
    .patreon-selection {
      padding: 20px 16px;
    }
    
    .patreon-header h3 {
      font-size: 20px;
    }
    
    .patreon-description {
      font-size: 14px;
    }
    
    .maintenance-badge {
      padding: 10px 18px;
      font-size: 15px;
      min-height: 44px;
      touch-action: manipulation;
    }
    
    .alternative-button,
    .back-button {
      min-height: 48px;
      padding: 14px 20px;
      font-size: 16px;
      touch-action: manipulation;
    }

    .payment--options {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .payment--options button {
      height: 56px;
      min-height: 56px;
      font-size: 16px;
      touch-action: manipulation;
    }

    .split {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .form-footer-new {
      flex-direction: column-reverse;
      gap: 12px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom));
    }

    .back-button,
    .purchase--btn {
      width: 100%;
      min-height: 48px;
      padding: 14px 20px;
      font-size: 16px;
      touch-action: manipulation;
    }
    
    .order-summary-section,
    .payment-form-section {
      padding: 16px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .form-group input,
    .form-group select {
      padding: 14px 16px;
      font-size: 15px;
      min-height: 48px;
      -webkit-appearance: none;
    }
    
    .plan-card {
      touch-action: manipulation;
    }
  }
  
  @media (max-width: 480px) {
    .modal-header h2 {
      font-size: 18px;
    }
    
    .plan-card {
      min-width: calc(100vw - 48px);
      max-width: calc(100vw - 48px);
      padding: 14px;
    }
    
    .plan-name {
      font-size: 16px;
    }
    
    .plan-price {
      font-size: 24px;
    }
    
    .feature-item {
      font-size: 13px;
    }
  }
</style>
