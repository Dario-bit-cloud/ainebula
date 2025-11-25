<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { register, login } from '../services/authService.js';
  import { setUser, isAuthenticatedStore } from '../stores/auth.js';
  import { get } from 'svelte/store';
  
  const dispatch = createEventDispatcher();
  
  export let initialMode = 'login'; // 'login' o 'register'
  
  // Aggiorna isLogin quando cambia initialMode
  $: isLogin = initialMode === 'login';
  let username = '';
  let password = '';
  let confirmPassword = '';
  let error = '';
  let isLoading = false;
  let successMessage = '';
  let rememberCredentials = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  let isRetrying = false;
  let requiresTwoFactor = false;
  let twoFactorCode = '';
  
  // Carica credenziali salvate al mount e referral code dall'URL
  onMount(() => {
    const savedUsername = localStorage.getItem('saved_username');
    const savedPassword = localStorage.getItem('saved_password');
    const savedRemember = localStorage.getItem('remember_credentials') === 'true';
    
    if (savedUsername && savedRemember) {
      username = savedUsername;
      if (savedPassword) {
        password = savedPassword;
      }
      rememberCredentials = savedRemember;
    }

    // Leggi referral code dall'URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      if (refCode) {
        // Salva il referral code nel localStorage per usarlo durante la registrazione
        localStorage.setItem('pending_referral_code', refCode);
      }
    }
  });
  
  async function handleSubmit() {
    error = '';
    successMessage = '';
    retryCount = 0;
    
    // Se richiede 2FA, valida il codice
    if (requiresTwoFactor) {
      if (!twoFactorCode || twoFactorCode.length !== 6) {
        error = 'Inserisci un codice 2FA valido (6 cifre)';
        return;
      }
    }
    
    await attemptLogin();
  }
  
  async function attemptLogin() {
    // Validazione
    if (!username || !password) {
      error = 'Username e password sono obbligatori';
      return;
    }
    
    if (!isLogin && username.length < 3) {
      error = 'Lo username deve essere di almeno 3 caratteri';
      return;
    }
    
    if (!isLogin && password.length < 6) {
      error = 'La password deve essere di almeno 6 caratteri';
      return;
    }
    
    if (!isLogin && password !== confirmPassword) {
      error = 'Le password non corrispondono';
      return;
    }
    
    isLoading = true;
    isRetrying = retryCount > 0;
    
    try {
      let result;
      
      if (isLogin) {
        result = await login(username, password, requiresTwoFactor ? twoFactorCode : null);
      } else {
        // Leggi referral code dal localStorage se presente
        const referralCode = localStorage.getItem('pending_referral_code');
        result = await register(username, password, referralCode);
        // Rimuovi il referral code dopo l'uso
        if (referralCode) {
          localStorage.removeItem('pending_referral_code');
        }
      }
      
      // Se il login richiede 2FA
      if (result.requiresTwoFactor && !result.success) {
        requiresTwoFactor = true;
        error = result.message || 'Codice 2FA richiesto';
        isLoading = false;
        isRetrying = false;
        return;
      }
      
      if (result.success) {
        // Salva le credenziali se richiesto
        if (rememberCredentials && isLogin) {
          localStorage.setItem('saved_username', username);
          localStorage.setItem('saved_password', password);
          localStorage.setItem('remember_credentials', 'true');
        } else {
          // Rimuovi credenziali salvate se non si vuole ricordare
          localStorage.removeItem('saved_username');
          localStorage.removeItem('saved_password');
          localStorage.removeItem('remember_credentials');
        }
        
        setUser(result.user);
        successMessage = isLogin ? 'Login completato con successo!' : 'Registrazione completata con successo!';
        
        // Chiudi il modal solo dopo aver verificato che l'utente è autenticato
        setTimeout(async () => {
          // Verifica che l'utente sia effettivamente autenticato prima di chiudere
          await new Promise(resolve => setTimeout(resolve, 500)); // Attendi che lo store si aggiorni
          
          const isAuth = get(isAuthenticatedStore);
          if (isAuth) {
            closeModal();
          } else {
            // Se non è autenticato, riprova
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              console.log(`🔄 [AUTH MODAL] Utente non autenticato, riprovo... (${retryCount}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              await attemptLogin();
            } else {
              error = 'Impossibile completare il login. Riprova più tardi.';
              isLoading = false;
              isRetrying = false;
            }
          }
        }, 1500);
      } else {
        // Se è un errore di connessione, riprova automaticamente
        const isConnectionError = result.errorType === 'TypeError' || 
                                  result.message?.includes('Failed to fetch') ||
                                  result.message?.includes('Errore nella comunicazione');
        
        if (isConnectionError && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`🔄 [AUTH MODAL] Tentativo ${retryCount}/${MAX_RETRIES}...`);
          
          // Attendi prima di riprovare (backoff esponenziale)
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Riprova automaticamente
          await attemptLogin();
          return;
        }
        
        // Mostra un messaggio di errore più dettagliato
        const errorDetails = [];
        if (result.message) errorDetails.push(result.message);
        if (result.error && !result.error.includes('Failed to fetch')) {
          errorDetails.push(`Dettagli: ${result.error}`);
        }
        
        if (retryCount >= MAX_RETRIES) {
          errorDetails.push(`Tentativi esauriti (${MAX_RETRIES}).`);
        }
        
        error = errorDetails.length > 0 
          ? errorDetails.join(' | ') 
          : 'Si è verificato un errore. Controlla la console per i dettagli.';
        
        console.error('❌ [AUTH MODAL] Errore autenticazione:', result);
        isLoading = false;
        isRetrying = false;
      }
    } catch (err) {
      // Se è un errore di connessione, riprova
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`🔄 [AUTH MODAL] Tentativo ${retryCount}/${MAX_RETRIES} dopo errore...`);
        
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        await attemptLogin();
        return;
      }
      
      console.error('❌ [AUTH MODAL] Errore durante autenticazione:', err);
      error = `Errore di connessione: ${err.message || 'Errore sconosciuto'}. Tentativi esauriti (${MAX_RETRIES}).`;
      isLoading = false;
      isRetrying = false;
    }
  }
  
  function closeModal() {
    // Emetti evento per chiudere il modal
    dispatch('close');
  }
  
  function switchMode() {
    isLogin = !isLogin;
    error = '';
    successMessage = '';
    confirmPassword = '';
    retryCount = 0;
    isRetrying = false;
    requiresTwoFactor = false;
    twoFactorCode = '';
    
    // Se si passa a login, carica le credenziali salvate
    if (isLogin) {
      const savedUsername = localStorage.getItem('saved_username');
      const savedPassword = localStorage.getItem('saved_password');
      const savedRemember = localStorage.getItem('remember_credentials') === 'true';
      
      if (savedUsername && savedRemember) {
        username = savedUsername;
        if (savedPassword) {
          password = savedPassword;
        }
        rememberCredentials = savedRemember;
      } else {
        username = '';
        password = '';
        rememberCredentials = false;
      }
    } else {
      // Se si passa a registrazione, mantieni username ma resetta password
      password = '';
      confirmPassword = '';
      rememberCredentials = false;
    }
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="auth-modal-overlay" on:click={closeModal} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && closeModal()}>
  <div class="auth-modal" on:click|stopPropagation role="dialog" aria-labelledby="auth-title">
    <div class="auth-modal-header">
      <h2 id="auth-title">{isLogin ? 'Accedi' : 'Registrati'}</h2>
      <button class="close-button" on:click={closeModal} aria-label="Chiudi">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    
    <div class="auth-modal-content">
      {#if error}
        <div class="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      {/if}
      
      {#if successMessage}
        <div class="success-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {successMessage}
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            type="text"
            bind:value={username}
            placeholder={isLogin ? "Il tuo username" : "Scegli un username (min. 3 caratteri)"}
            required
            disabled={isLoading}
            autocomplete="username"
            minlength={isLogin ? undefined : "3"}
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder={isLogin ? "La tua password" : "Minimo 6 caratteri"}
            required
            disabled={isLoading}
            autocomplete={isLogin ? "current-password" : "new-password"}
          />
        </div>
        
        {#if !isLogin}
          <div class="form-group">
            <label for="confirmPassword">Conferma Password</label>
            <input
              id="confirmPassword"
              type="password"
              bind:value={confirmPassword}
              placeholder="Ripeti la password"
              required
              disabled={isLoading}
              autocomplete="new-password"
            />
          </div>
        {/if}
        
        {#if isLogin && requiresTwoFactor}
          <div class="form-group">
            <label for="twoFactorCode">Codice 2FA</label>
            <input
              id="twoFactorCode"
              type="text"
              bind:value={twoFactorCode}
              placeholder="000000"
              required
              disabled={isLoading}
              autocomplete="one-time-code"
              maxlength="6"
              pattern="[0-9]{6}"
            />
            <small class="form-hint" style="display: block; margin-top: 4px; font-size: 12px; color: var(--text-secondary);">Inserisci il codice a 6 cifre dalla tua app di autenticazione</small>
          </div>
        {/if}
        
        {#if isLogin}
          <div class="form-group remember-credentials">
            <label class="remember-label">
              <input
                type="checkbox"
                bind:checked={rememberCredentials}
                disabled={isLoading}
              />
              <span>Ricorda le credenziali</span>
            </label>
          </div>
        {/if}
        
        {#if isRetrying && retryCount > 0}
          <div class="retry-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            Tentativo {retryCount}/{MAX_RETRIES}...
          </div>
        {/if}
        
        <button type="submit" class="submit-button" disabled={isLoading}>
          {#if isLoading}
            <span class="spinner"></span>
            {isLogin ? 'Accesso in corso...' : 'Registrazione in corso...'}
          {:else}
            {isLogin ? 'Accedi' : 'Registrati'}
          {/if}
        </button>
      </form>
      
      <div class="auth-switch">
        <p>
          {isLogin ? "Non hai un account? " : "Hai già un account? "}
          <button type="button" class="switch-button" on:click={switchMode} disabled={isLoading}>
            {isLogin ? 'Registrati' : 'Accedi'}
          </button>
        </p>
      </div>
    </div>
  </div>
</div>

<style>
  .auth-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .auth-modal {
    background: var(--bg-secondary, #1a1a1a);
    border: 1px solid var(--border-color, #333);
    border-radius: 16px;
    width: 90%;
    max-width: 440px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease;
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .auth-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    border-bottom: 1px solid var(--border-color, #333);
  }
  
  .auth-modal-header h2 {
    margin: 0;
    font-size: 24px;
    color: var(--text-primary, #ffffff);
  }
  
  .close-button {
    background: none;
    border: none;
    color: var(--text-secondary, #999);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .close-button:hover {
    background: var(--hover-bg, #2a2a2a);
    color: var(--text-primary, #ffffff);
  }
  
  .auth-modal-content {
    padding: 24px;
  }
  
  .error-message,
  .success-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
  }
  
  .error-message {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }
  
  .success-message {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #22c55e;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #ffffff);
  }
  
  .form-group input {
    width: 100%;
    padding: 12px 16px;
    background: var(--bg-tertiary, #2a2a2a);
    border: 1px solid var(--border-color, #333);
    border-radius: 8px;
    color: var(--text-primary, #ffffff);
    font-size: 16px;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }
  
  .form-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .form-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .submit-button {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
  }
  
  .submit-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
  
  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .auth-switch {
    margin-top: 24px;
    text-align: center;
    color: var(--text-secondary, #999);
    font-size: 14px;
  }
  
  .switch-button {
    background: none;
    border: none;
    color: #3b82f6;
    cursor: pointer;
    font-weight: 600;
    text-decoration: underline;
    padding: 0;
    margin-left: 4px;
  }
  
  .switch-button:hover:not(:disabled) {
    color: #60a5fa;
  }
  
  .switch-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .remember-credentials {
    margin-bottom: 16px;
  }
  
  .remember-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-secondary, #999);
    user-select: none;
  }
  
  .remember-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #3b82f6;
  }
  
  .remember-label input[type="checkbox"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .remember-label:hover {
    color: var(--text-primary, #ffffff);
  }
  
  .retry-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    margin-bottom: 16px;
    color: #60a5fa;
    font-size: 14px;
    animation: pulse 2s ease-in-out infinite;
  }
  
  .retry-info svg {
    animation: spin 1s linear infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
  
  @media (max-width: 768px) {
    .auth-modal {
      width: 95%;
      max-height: 95vh;
    }
    
    .auth-modal-header,
    .auth-modal-content {
      padding: 20px;
    }
  }
</style>

