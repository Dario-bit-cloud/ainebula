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
        result = await login(username, password);
      } else {
        // Leggi referral code dal localStorage se presente
        const referralCode = localStorage.getItem('pending_referral_code');
        result = await register(username, password, referralCode);
        // Rimuovi il referral code dopo l'uso
        if (referralCode) {
          localStorage.removeItem('pending_referral_code');
        }
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
    <button class="close-button" on:click={closeModal} aria-label="Chiudi">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
    
    <form class="form" on:submit|preventDefault={handleSubmit}>
      <p id="heading">{isLogin ? 'Login' : 'Registrati'}</p>

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

      <div class="field">
        <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z"></path>
        </svg>
        <input
          autocomplete="off"
          placeholder="Username"
          class="input-field"
          type="text"
          bind:value={username}
          required
          disabled={isLoading}
          autocomplete="username"
          minlength={isLogin ? undefined : "3"}
        />
      </div>

      <div class="field">
        <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
        </svg>
        <input
          placeholder="Password"
          class="input-field"
          type="password"
          bind:value={password}
          required
          disabled={isLoading}
          autocomplete={isLogin ? "current-password" : "new-password"}
        />
      </div>

      {#if !isLogin}
        <div class="field">
          <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
          </svg>
          <input
            placeholder="Conferma Password"
            class="input-field"
            type="password"
            bind:value={confirmPassword}
            required
            disabled={isLoading}
            autocomplete="new-password"
          />
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

      {#if isLogin}
        <div class="remember-credentials">
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

      <div class="btn">
        <button class="button1" type="submit" disabled={isLoading}>
          {#if isLoading}
            <span class="spinner"></span>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{isLogin ? 'Accesso...' : 'Registrazione...'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          {:else}
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{isLogin ? 'Login' : 'Registrati'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          {/if}
        </button>
        <button class="button2" type="button" on:click={switchMode} disabled={isLoading}>
          {isLogin ? 'Sign Up' : 'Login'}
        </button>
      </div>

      {#if isLogin}
        <button class="button3" type="button" disabled={isLoading}>
          Forgot Password
        </button>
      {/if}
    </form>
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
    position: relative;
    width: 90%;
    max-width: 440px;
    max-height: 90vh;
    overflow-y: auto;
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
  
  .close-button {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(37, 37, 37, 0.8);
    border: none;
    color: #ffffff;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
    z-index: 10;
    width: 32px;
    height: 32px;
  }
  
  .close-button:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.1);
  }
  
  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-left: 2em;
    padding-right: 2em;
    padding-bottom: 0.4em;
    padding-top: 2em;
    background-color: #171717;
    border-radius: 25px;
    transition: .4s ease-in-out;
    position: relative;
  }
  
  .form:hover {
    transform: scale(1.02);
    border: 1px solid black;
  }
  
  #heading {
    text-align: center;
    margin: 2em 0 1em 0;
    color: rgb(255, 255, 255);
    font-size: 1.2em;
    font-weight: 600;
  }
  
  .field {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    border-radius: 25px;
    padding: 0.6em;
    border: none;
    outline: none;
    color: white;
    background-color: #171717;
    box-shadow: inset 2px 5px 10px rgb(5, 5, 5);
  }
  
  .input-icon {
    height: 1.3em;
    width: 1.3em;
    fill: white;
    flex-shrink: 0;
  }
  
  .input-field {
    background: none;
    border: none;
    outline: none;
    width: 100%;
    color: #d3d3d3;
    font-size: 14px;
  }
  
  .input-field::placeholder {
    color: #666;
  }
  
  .input-field:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .form .btn {
    display: flex;
    justify-content: center;
    flex-direction: row;
    margin-top: 2.5em;
    gap: 0.5em;
  }
  
  .button1 {
    padding: 0.5em;
    padding-left: 1.1em;
    padding-right: 1.1em;
    border-radius: 5px;
    border: none;
    outline: none;
    transition: .4s ease-in-out;
    background-color: #252525;
    color: white;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  .button1:hover:not(:disabled) {
    background-color: black;
    color: white;
  }
  
  .button1:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .button2 {
    padding: 0.5em;
    padding-left: 2.3em;
    padding-right: 2.3em;
    border-radius: 5px;
    border: none;
    outline: none;
    transition: .4s ease-in-out;
    background-color: #252525;
    color: white;
    cursor: pointer;
    font-size: 14px;
  }
  
  .button2:hover:not(:disabled) {
    background-color: black;
    color: white;
  }
  
  .button2:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .button3 {
    margin-bottom: 3em;
    padding: 0.5em;
    border-radius: 5px;
    border: none;
    outline: none;
    transition: .4s ease-in-out;
    background-color: #252525;
    color: white;
    cursor: pointer;
    font-size: 14px;
    width: 100%;
  }
  
  .button3:hover:not(:disabled) {
    background-color: red;
    color: white;
  }
  
  .button3:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .error-message,
  .success-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 10px;
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
  
  .remember-credentials {
    margin: 1em 0;
    display: flex;
    justify-content: center;
  }
  
  .remember-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #d3d3d3;
    user-select: none;
  }
  
  .remember-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #252525;
  }
  
  .remember-label input[type="checkbox"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .remember-label:hover {
    color: #ffffff;
  }
  
  .retry-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    margin: 10px 0;
    color: #60a5fa;
    font-size: 14px;
    animation: pulse 2s ease-in-out infinite;
  }
  
  .retry-info svg {
    animation: spin 1s linear infinite;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
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
    
    .form {
      padding-left: 1.5em;
      padding-right: 1.5em;
    }
    
    .form .btn {
      flex-direction: column;
    }
    
    .button2 {
      width: 100%;
      padding-left: 1.1em;
      padding-right: 1.1em;
    }
  }
</style>

