<script>
  import { onMount } from 'svelte';
  import { isPremiumModalOpen } from '../stores/app.js';
  import { isMobile } from '../stores/app.js';
  import { showAlert } from '../services/dialogService.js';
  
  // Supabase Auth - billing gestito dal database
  let isLoading = false;
  let currentSubscription = null;
  
  // Piani disponibili
  const plans = [
    {
      key: 'nebula_max',
      name: 'Nebula Max',
      description: 'Il piano completo con accesso a tutti i modelli premium',
      monthlyPrice: 300,
      annualPrice: 3000,
      features: [
        'Accesso esclusivo a o3 (ragionamento avanzato)',
        'Accesso a 4.1 incluso (1M di contesto)',
        'Accesso a tutti i modelli gratuiti',
        'Chat illimitate',
        'Caricamenti illimitati',
        'Supporto prioritario',
        'API access incluso'
      ]
    }
  ];
  
  onMount(async () => {
    await loadSubscription();
  });
  
  async function loadSubscription() {
    try {
      const { user, isAuthenticatedStore } = await import('../stores/auth.js');
      const { get } = await import('svelte/store');
      
      if (!get(isAuthenticatedStore) || !get(user)) {
        currentSubscription = null;
        return;
      }
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        currentSubscription = null;
        return;
      }
      
      const getApiBaseUrl = () => {
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001/api/auth';
          }
          const backendUrl = import.meta.env.VITE_API_BASE_URL;
          if (backendUrl) {
            return `${backendUrl}/api/auth`;
          }
          return '/api/auth';
        }
        return 'http://localhost:3001/api/auth';
      };
      
      const response = await fetch(`${getApiBaseUrl()}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user && data.user.subscription) {
          currentSubscription = data.user.subscription;
        } else {
          currentSubscription = null;
        }
      } else {
        currentSubscription = null;
      }
    } catch (error) {
      console.error('Errore caricamento abbonamento:', error);
      currentSubscription = null;
    }
  }
  
  async function handleSubscribe(planKey) {
    // Verifica autenticazione
    const { user, isAuthenticatedStore } = await import('../stores/auth.js');
    const { get } = await import('svelte/store');
    
    if (!get(isAuthenticatedStore) || !get(user)) {
      await showAlert('Devi essere autenticato per sottoscrivere un abbonamento', 'Autenticazione richiesta', 'OK', 'warning');
      return;
    }
    
    isLoading = true;
    
    try {
      // Determina l'URL base dell'API
      const apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : '';

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Token di autenticazione non trovato');
      }

      // Chiama l'API per creare la sessione di checkout
      const response = await fetch(`${apiBaseUrl}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planKey: planKey
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Errore durante la creazione della sessione di checkout');
      }

      // Reindirizza all'URL di checkout se disponibile
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        await showAlert(
          'Sistema di pagamento non ancora configurato. Contatta il supporto per attivare il tuo abbonamento.',
          'Errore',
          'OK',
          'error'
        );
      }
    } finally {
      isLoading = false;
    }
  }
  
  function closeModal() {
    isPremiumModalOpen.set(false);
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  // Ricarica abbonamento quando il modal si apre
  $: if ($isPremiumModalOpen && $isAuthenticatedStore) {
    loadSubscription();
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
        {#if $isAuthenticatedStore}
          <div class="billing-info">
            <p>Seleziona il piano che fa per te. I pagamenti sono gestiti in modo sicuro.</p>
          </div>
          
          <div class="plans-container">
            {#each plans as plan}
              <div class="plan-card" class:active={currentSubscription?.plan === plan.key}>
                <div class="plan-header">
                  <h3 class="plan-name">{plan.name}</h3>
                  {#if currentSubscription?.plan === plan.key && currentSubscription?.active}
                    <div class="plan-badge active">Attivo</div>
                  {/if}
                </div>
                
                <p class="plan-description">{plan.description}</p>
                
                <div class="plan-pricing">
                  <div class="price-row">
                    <span class="price-label">Mensile:</span>
                    <span class="price-amount">${plan.monthlyPrice}/mese</span>
                  </div>
                  <div class="price-row annual">
                    <span class="price-label">Annuale:</span>
                    <span class="price-amount">${plan.annualPrice}/anno</span>
                    <span class="price-savings">Risparmia ${(plan.monthlyPrice * 12) - plan.annualPrice}/anno</span>
                  </div>
                </div>
                
                <ul class="plan-features">
                  {#each plan.features as feature}
                    <li>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {feature}
                    </li>
                  {/each}
                </ul>
                
                {#if currentSubscription?.plan === plan.key && currentSubscription?.active}
                  <button class="subscribe-button active" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Piano Attivo
                  </button>
                {:else}
                  <button 
                    class="subscribe-button" 
                    on:click={() => handleSubscribe(plan.key)}
                    disabled={isLoading}
                  >
                    {#if isLoading}
                      <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Caricamento...
                    {:else}
                      Sottoscrivi Ora
                    {/if}
                  </button>
                {/if}
              </div>
            {/each}
          </div>
          
          {#if !$isAuthenticatedStore}
            <div class="auth-required">
              <p>Devi essere autenticato per sottoscrivere un abbonamento.</p>
            </div>
          {/if}
        {:else}
          <div class="error-message">
            <p>Devi essere autenticato per vedere i piani disponibili.</p>
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
    border-radius: 16px;
    max-width: 900px;
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
    padding: 24px;
    flex: 1;
    overflow-y: auto;
  }

  .billing-container {
    width: 100%;
  }

  .billing-info {
    text-align: center;
    margin-bottom: 24px;
    padding: 16px;
    background-color: var(--bg-tertiary);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .billing-info p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.5;
  }

  .plans-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    margin-top: 24px;
  }
  
  @media (max-width: 768px) {
    .plans-container {
      grid-template-columns: 1fr;
    }
  }

  .plan-card {
    background-color: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    transition: all 0.3s;
  }

  .plan-card:hover {
    border-color: var(--accent-blue);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .plan-card.active {
    border-color: #fbbf24;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
  }

  .plan-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .plan-name {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .plan-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }

  .plan-badge.active {
    background: #10b981;
    color: white;
  }

  .plan-description {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 0 0 20px 0;
    line-height: 1.5;
  }

  .plan-pricing {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .price-row.annual {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .price-label {
    color: var(--text-secondary);
    font-size: 14px;
  }

  .price-amount {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .price-savings {
    font-size: 12px;
    color: #10b981;
    margin-top: 4px;
  }

  .plan-features {
    list-style: none;
    padding: 0;
    margin: 0 0 24px 0;
  }

  .plan-features li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 14px;
    color: var(--text-primary);
  }

  .plan-features li svg {
    color: #10b981;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .subscribe-button {
    width: 100%;
    padding: 14px 24px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .subscribe-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .subscribe-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .subscribe-button.active {
    background: #10b981;
  }

  .subscribe-button .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .auth-required {
    text-align: center;
    padding: 20px;
    background-color: var(--bg-tertiary);
    border-radius: 8px;
    margin-top: 24px;
  }

  .auth-required p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .error-message {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
  }

  .error-message p {
    margin: 0;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    .modal-body {
      padding: 20px 16px;
    }
  }
</style>
