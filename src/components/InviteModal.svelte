<script>
  import { isInviteModalOpen } from '../stores/app.js';
  import { getToken } from '../services/authService.js';
  import { onMount } from 'svelte';
  
  let referralLink = '';
  let referralCode = '';
  let stats = {
    totalReferrals: 0,
    completedReferrals: 0,
    totalEarnings: '0.00',
    availableEarnings: '0.00',
    pendingEarnings: '0.00',
    withdrawnEarnings: '0.00',
    maxEarnings: 500,
    minWithdrawal: 200,
    canWithdraw: false,
    maxEarningsReached: false
  };
  let isLoading = true;
  let copied = false;
  let showWithdrawForm = false;
  let withdrawalAmount = '';
  let paymentMethod = 'bank_transfer';
  let paymentDetails = {};
  let isWithdrawing = false;
  let withdrawError = '';
  let withdrawSuccess = false;

  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001/api';
      }
      const backendUrl = import.meta.env.VITE_API_BASE_URL;
      if (backendUrl) {
        return `${backendUrl}/api`;
      }
      return '/api';
    }
    return 'http://localhost:3001/api';
  };

  async function loadReferralData() {
    isLoading = true;
    const token = getToken();
    
    if (!token) {
      isLoading = false;
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/referral`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        referralLink = data.referralLink;
        referralCode = data.referralCode;
        stats = data.stats;
      }
    } catch (error) {
      console.error('Errore nel caricamento dati referral:', error);
    } finally {
      isLoading = false;
    }
  }

  function closeModal() {
    isInviteModalOpen.set(false);
    showWithdrawForm = false;
    withdrawalAmount = '';
    withdrawError = '';
    withdrawSuccess = false;
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (error) {
      console.error('Errore nella copia:', error);
      // Fallback per browser che non supportano clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    }
  }

  function openWithdrawForm() {
    showWithdrawForm = true;
    withdrawalAmount = stats.availableEarnings;
  }

  function closeWithdrawForm() {
    showWithdrawForm = false;
    withdrawalAmount = '';
    paymentMethod = 'bank_transfer';
    paymentDetails = {};
    withdrawError = '';
    withdrawSuccess = false;
  }

  async function handleWithdraw() {
    withdrawError = '';
    withdrawSuccess = false;
    
    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount < parseFloat(stats.minWithdrawal)) {
      withdrawError = `L'importo minimo per il ritiro è €${stats.minWithdrawal}`;
      return;
    }

    if (amount > parseFloat(stats.availableEarnings)) {
      withdrawError = `Importo non disponibile. Disponibile: €${stats.availableEarnings}`;
      return;
    }

    isWithdrawing = true;
    const token = getToken();

    try {
      const response = await fetch(`${getApiBaseUrl()}/referral`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'withdraw',
          amount: amount,
          paymentMethod: paymentMethod,
          paymentDetails: paymentDetails
        })
      });

      const data = await response.json();
      
      if (data.success) {
        withdrawSuccess = true;
        // Ricarica i dati
        await loadReferralData();
        setTimeout(() => {
          closeWithdrawForm();
        }, 2000);
      } else {
        withdrawError = data.message || 'Errore durante il ritiro';
      }
    } catch (error) {
      withdrawError = 'Errore nella comunicazione con il server';
      console.error('Errore nel ritiro:', error);
    } finally {
      isWithdrawing = false;
    }
  }

  onMount(() => {
    loadReferralData();
  });

  // Ricarica i dati quando il modal si apre
  $: if ($isInviteModalOpen) {
    loadReferralData();
  }
</script>

{#if $isInviteModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Invita e guadagna fino a 500€</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        {#if isLoading}
          <div class="loading-state">
            <p>Caricamento...</p>
          </div>
        {:else if showWithdrawForm}
          <!-- Form per il ritiro -->
          <div class="withdraw-section">
            <h3>Ritira guadagni</h3>
            
            {#if withdrawSuccess}
              <div class="success-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Richiesta di ritiro creata con successo!</span>
              </div>
            {/if}

            {#if withdrawError}
              <div class="error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{withdrawError}</span>
              </div>
            {/if}

            <div class="form-section">
              <label class="form-label">Importo da ritirare (€)</label>
              <input 
                type="number"
                class="amount-input"
                bind:value={withdrawalAmount}
                min={stats.minWithdrawal}
                max={stats.availableEarnings}
                step="0.01"
                placeholder={stats.minWithdrawal}
              />
              <p class="form-hint">Minimo: €{stats.minWithdrawal} | Disponibile: €{stats.availableEarnings}</p>
            </div>

            <div class="form-section">
              <label class="form-label">Metodo di pagamento</label>
              <select class="payment-select" bind:value={paymentMethod}>
                <option value="bank_transfer">Bonifico bancario</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>

            {#if paymentMethod === 'bank_transfer'}
              <div class="form-section">
                <label class="form-label">IBAN</label>
                <input 
                  type="text"
                  class="payment-input"
                  bind:value={paymentDetails.iban}
                  placeholder="IT60 X054 2811 1010 0000 0123 456"
                />
              </div>
            {:else if paymentMethod === 'paypal'}
              <div class="form-section">
                <label class="form-label">Email PayPal</label>
                <input 
                  type="email"
                  class="payment-input"
                  bind:value={paymentDetails.email}
                  placeholder="nome@esempio.com"
                />
              </div>
            {/if}

            <div class="form-actions">
              <button class="cancel-button" on:click={closeWithdrawForm} disabled={isWithdrawing}>
                Annulla
              </button>
              <button 
                class="withdraw-button" 
                on:click={handleWithdraw}
                disabled={isWithdrawing || !withdrawalAmount || parseFloat(withdrawalAmount) < parseFloat(stats.minWithdrawal)}
              >
                {isWithdrawing ? 'Elaborazione...' : 'Ritira'}
              </button>
            </div>
          </div>
        {:else}
          <!-- Vista principale referral -->
          <div class="referral-section">
            <div class="info-banner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <div>
                <p class="banner-title">Guadagna €20 per ogni amico che si registra!</p>
                <p class="banner-text">Soglia minima per ritirare: €{stats.minWithdrawal} | Massimo guadagnabile: €{stats.maxEarnings}</p>
              </div>
            </div>

            <div class="form-section">
              <label class="form-label">Il tuo link referral</label>
              <div class="link-input-wrapper">
                <input 
                  type="text"
                  class="link-input"
                  value={referralLink}
                  readonly
                />
                <button class="copy-button" on:click={copyReferralLink} class:copied={copied}>
                  {#if copied}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Copiato!</span>
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    <span>Copia</span>
                  {/if}
                </button>
              </div>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{stats.totalReferrals}</div>
                <div class="stat-label">Referral totali</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{stats.completedReferrals}</div>
                <div class="stat-label">Registrazioni completate</div>
              </div>
              <div class="stat-card highlight">
                <div class="stat-value">€{stats.availableEarnings}</div>
                <div class="stat-label">Guadagni disponibili</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">€{stats.totalEarnings}</div>
                <div class="stat-label">Guadagni totali</div>
              </div>
            </div>

            <!-- Progress bar verso la soglia minima -->
            {#if parseFloat(stats.availableEarnings) < parseFloat(stats.minWithdrawal)}
              <div class="progress-section">
                <div class="progress-header">
                  <span>Progresso verso la soglia minima</span>
                  <span class="progress-text">
                    €{stats.availableEarnings} / €{stats.minWithdrawal}
                  </span>
                </div>
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    style="width: {Math.min((parseFloat(stats.availableEarnings) / parseFloat(stats.minWithdrawal)) * 100, 100)}%"
                  ></div>
                </div>
                <p class="progress-hint">
                  Ti mancano €{(parseFloat(stats.minWithdrawal) - parseFloat(stats.availableEarnings)).toFixed(2)} per poter ritirare
                </p>
              </div>
            {/if}

            {#if stats.maxEarningsReached}
              <div class="max-earnings-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Hai raggiunto il massimo guadagnabile di €{stats.maxEarnings}!</span>
              </div>
            {/if}

            <div class="action-section">
              <button 
                class="withdraw-button-main" 
                on:click={openWithdrawForm}
                disabled={!stats.canWithdraw || stats.maxEarningsReached}
                class:disabled={!stats.canWithdraw || stats.maxEarningsReached}
              >
                {#if stats.canWithdraw && !stats.maxEarningsReached}
                  Ritira guadagni
                {:else if stats.maxEarningsReached}
                  Massimo raggiunto
                {:else}
                  Soglia minima non raggiunta
                {/if}
              </button>
            </div>
          </div>
        {/if}
      </div>
      
      {#if !showWithdrawForm}
        <div class="modal-footer">
          <button class="close-button-footer" on:click={closeModal}>Chiudi</button>
        </div>
      {/if}
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
    z-index: 1000;
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
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
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
  }

  .close-button:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: 16px 20px;
    overflow-y: auto;
    flex: 1;
  }

  .loading-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
  }

  .info-banner {
    display: flex;
    gap: 10px;
    padding: 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 16px;
    color: var(--text-primary);
  }

  .info-banner svg {
    flex-shrink: 0;
    color: var(--accent-blue);
    margin-top: 2px;
  }

  .banner-title {
    font-weight: 600;
    margin: 0 0 3px 0;
    font-size: 13px;
  }

  .banner-text {
    margin: 0;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .form-section {
    margin-bottom: 14px;
  }

  .form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .link-input-wrapper {
    display: flex;
    gap: 8px;
  }

  .link-input {
    flex: 1;
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
    font-family: 'Courier New', monospace;
    outline: none;
  }

  .copy-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background-color: var(--accent-blue);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .copy-button:hover {
    opacity: 0.9;
  }

  .copy-button.copied {
    background-color: #10b981;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }

  .stat-card {
    padding: 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    text-align: center;
  }

  .stat-card.highlight {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
    border-color: var(--accent-blue);
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 3px;
  }

  .stat-label {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .progress-section {
    margin-bottom: 24px;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--text-primary);
  }

  .progress-text {
    font-weight: 600;
    color: var(--accent-blue);
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-blue), #8b5cf6);
    transition: width 0.3s ease;
  }

  .progress-hint {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0;
  }

  .max-earnings-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background-color: rgba(16, 185, 129, 0.1);
    border: 1px solid #10b981;
    border-radius: 8px;
    color: #10b981;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 20px;
  }

  .action-section {
    margin-top: 24px;
  }

  .withdraw-button-main {
    width: 100%;
    padding: 12px 24px;
    background-color: var(--accent-blue);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .withdraw-button-main:hover:not(.disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .withdraw-button-main.disabled {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    cursor: not-allowed;
    opacity: 0.6;
  }

  .withdraw-section {
    padding: 8px 0;
  }

  .withdraw-section h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 20px 0;
  }

  .success-message,
  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 13px;
  }

  .success-message {
    background-color: rgba(16, 185, 129, 0.1);
    border: 1px solid #10b981;
    color: #10b981;
  }

  .error-message {
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid #ef4444;
    color: #ef4444;
  }

  .amount-input,
  .payment-select,
  .payment-input {
    width: 100%;
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
  }

  .amount-input:focus,
  .payment-select:focus,
  .payment-input:focus {
    border-color: var(--accent-blue);
  }

  .form-hint {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 6px 0 0 0;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }

  .cancel-button,
  .withdraw-button {
    flex: 1;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .cancel-button {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .cancel-button:hover {
    background-color: var(--hover-bg);
  }

  .withdraw-button {
    background-color: var(--accent-blue);
    color: white;
  }

  .withdraw-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .withdraw-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 12px 20px;
    border-top: 1px solid var(--border-color);
  }

  .close-button-footer {
    padding: 10px 20px;
    background-color: var(--bg-tertiary);
    border: none;
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-button-footer:hover {
    background-color: var(--hover-bg);
  }

  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .modal-content {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }
  }
</style>
