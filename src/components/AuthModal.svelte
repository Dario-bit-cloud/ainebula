<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { register, login } from '../services/authService.js';
  import { registerPasskey, loginWithPasskey, isPasskeySupported } from '../services/passkeyService.js';
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
  let isSwitching = false;
  let passkeySupported = false;
  let isPasskeyLoading = false;
  
  // Carica credenziali salvate al mount e referral code dall'URL
  onMount(() => {
    passkeySupported = isPasskeySupported();
    
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
    isSwitching = true;
    
    setTimeout(() => {
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
      
      setTimeout(() => {
        isSwitching = false;
      }, 400);
    }, 50);
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
  
  async function handlePasskeyRegister() {
    if (!username) {
      error = 'Inserisci prima lo username';
      return;
    }
    
    if (username.length < 3) {
      error = 'Lo username deve essere di almeno 3 caratteri';
      return;
    }
    
    error = '';
    successMessage = '';
    isPasskeyLoading = true;
    
    try {
      const result = await registerPasskey(username);
      
      if (result.success) {
        successMessage = 'Passkey registrata con successo! Ora puoi usarla per accedere.';
        // Dopo la registrazione, effettua automaticamente il login con passkey
        setTimeout(async () => {
          await handlePasskeyLogin();
        }, 1500);
      } else {
        error = result.message || 'Errore durante la registrazione della passkey';
      }
    } catch (err) {
      error = `Errore: ${err.message || 'Errore sconosciuto'}`;
    } finally {
      isPasskeyLoading = false;
    }
  }
  
  async function handlePasskeyLogin() {
    if (!username) {
      error = 'Inserisci prima lo username';
      return;
    }
    
    error = '';
    successMessage = '';
    isPasskeyLoading = true;
    
    try {
      const result = await loginWithPasskey(username);
      
      if (result.success) {
        setUser(result.user);
        successMessage = 'Login con passkey completato con successo!';
        
        // Chiudi il modal dopo il login
        setTimeout(async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          const isAuth = get(isAuthenticatedStore);
          if (isAuth) {
            closeModal();
          }
        }, 1500);
      } else {
        error = result.message || 'Errore durante il login con passkey';
      }
    } catch (err) {
      error = `Errore: ${err.message || 'Errore sconosciuto'}`;
    } finally {
      isPasskeyLoading = false;
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
    
    <form class="form" class:switching={isSwitching} on:submit|preventDefault={handleSubmit}>
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

      {#if passkeySupported}
        <div class="passkey-section">
          <div class="passkey-divider">
            <span>oppure</span>
          </div>
          <button 
            class="passkey-button" 
            type="button" 
            on:click={isLogin ? handlePasskeyLogin : handlePasskeyRegister}
            disabled={isLoading || isPasskeyLoading || !username}
          >
            {#if isPasskeyLoading}
              <span class="spinner"></span>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{isLogin ? 'Accesso con passkey...' : 'Registrazione passkey...'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{isLogin ? 'Accedi con Passkey' : 'Registra Passkey'}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {/if}
          </button>
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
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(8px) saturate(180%);
    -webkit-backdrop-filter: blur(8px) saturate(180%);
    animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 20px;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
      -webkit-backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(8px) saturate(180%);
      -webkit-backdrop-filter: blur(8px) saturate(180%);
    }
  }
  
  .auth-modal {
    position: relative;
    width: 100%;
    max-width: 460px;
    max-height: 95vh;
    overflow-y: auto;
    overflow-x: hidden;
    animation: slideUpScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: center;
  }
  
  @keyframes slideUpScale {
    from {
      transform: translateY(30px) scale(0.95);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
  
  .close-button {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(37, 37, 37, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #ffffff;
    cursor: pointer;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10;
    width: 36px;
    height: 36px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  .close-button:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    transform: scale(1.1) rotate(90deg);
  }
  
  .close-button:active {
    transform: scale(0.95) rotate(90deg);
  }
  
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 2.5em 2.5em 2em 2.5em;
    background: linear-gradient(135deg, #1a1a1a 0%, #171717 100%);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset,
      0 1px 0 rgba(255, 255, 255, 0.1) inset;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .form::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(59, 130, 246, 0.5) 50%, 
      transparent 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .form:hover::before {
    opacity: 1;
  }
  
  #heading {
    text-align: center;
    margin: 0.5em 0 1.5em 0;
    color: #ffffff;
    font-size: 1.75em;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: fadeInSlideDown 0.5s ease-out 0.1s both;
  }
  
  @keyframes fadeInSlideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .field {
    display: flex;
    align-items: center;
    gap: 0.75em;
    border-radius: 16px;
    padding: 0.85em 1.1em;
    border: 1.5px solid rgba(255, 255, 255, 0.08);
    outline: none;
    color: white;
    background: rgba(23, 23, 23, 0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      0 1px 0 rgba(255, 255, 255, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    animation: fadeInSlideUp 0.5s ease-out both;
    animation-delay: calc(var(--field-index, 0) * 0.1s);
  }
  
  @keyframes fadeInSlideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .field:nth-child(1) { --field-index: 1; }
  .field:nth-child(2) { --field-index: 2; }
  .field:nth-child(3) { --field-index: 3; }
  
  .field:focus-within {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(23, 23, 23, 0.8);
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      0 0 0 3px rgba(59, 130, 246, 0.1),
      0 2px 8px rgba(59, 130, 246, 0.2);
    transform: translateY(-1px);
  }
  
  .field:hover:not(:focus-within) {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(23, 23, 23, 0.7);
  }
  
  .input-icon {
    height: 1.4em;
    width: 1.4em;
    fill: rgba(255, 255, 255, 0.6);
    flex-shrink: 0;
    transition: all 0.3s ease;
  }
  
  .field:focus-within .input-icon {
    fill: rgba(59, 130, 246, 0.9);
    transform: scale(1.1);
  }
  
  .input-field {
    background: none;
    border: none;
    outline: none;
    width: 100%;
    color: #ffffff;
    font-size: 15px;
    font-weight: 400;
    letter-spacing: 0.01em;
    transition: all 0.2s ease;
  }
  
  .input-field::placeholder {
    color: rgba(255, 255, 255, 0.4);
    transition: color 0.2s ease;
  }
  
  .input-field:focus::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }
  
  .input-field:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .form .btn {
    display: flex;
    justify-content: center;
    flex-direction: row;
    margin-top: 1.5em;
    gap: 0.75em;
    animation: fadeIn 0.6s ease-out 0.3s both;
  }
  
  .button1 {
    flex: 1;
    padding: 0.85em 1.5em;
    border-radius: 12px;
    border: none;
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 
      0 4px 12px rgba(59, 130, 246, 0.3),
      0 2px 4px rgba(0, 0, 0, 0.2);
    position: relative;
    overflow: hidden;
  }
  
  .button1::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  
  .button1:hover:not(:disabled)::before {
    left: 100%;
  }
  
  .button1:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transform: translateY(-2px);
    box-shadow: 
      0 6px 20px rgba(59, 130, 246, 0.4),
      0 4px 8px rgba(0, 0, 0, 0.3);
  }
  
  .button1:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 
      0 2px 8px rgba(59, 130, 246, 0.3),
      0 1px 2px rgba(0, 0, 0, 0.2);
  }
  
  .button1:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  .button2 {
    padding: 0.85em 1.8em;
    border-radius: 12px;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: rgba(37, 37, 37, 0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: white;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .button2:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .button2:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .button2:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  .button3 {
    margin-top: 0.5em;
    margin-bottom: 1em;
    padding: 0.75em;
    border-radius: 12px;
    border: none;
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    width: 100%;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  
  .button3:hover:not(:disabled) {
    color: rgba(239, 68, 68, 0.9);
    background: rgba(239, 68, 68, 0.05);
    text-decoration: none;
  }
  
  .button3:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .passkey-section {
    margin: 1.5em 0 1em 0;
    animation: fadeIn 0.5s ease-out 0.2s both;
  }
  
  .passkey-divider {
    display: flex;
    align-items: center;
    text-align: center;
    margin: 1.5em 0;
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
  }
  
  .passkey-divider::before,
  .passkey-divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .passkey-divider span {
    padding: 0 1em;
  }
  
  .passkey-button {
    width: 100%;
    padding: 0.85em 1.5em;
    border-radius: 12px;
    border: 1.5px solid rgba(59, 130, 246, 0.3);
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: #60a5fa;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 
      0 2px 8px rgba(59, 130, 246, 0.2),
      0 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  .passkey-button:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%);
    border-color: rgba(59, 130, 246, 0.5);
    transform: translateY(-2px);
    box-shadow: 
      0 4px 12px rgba(59, 130, 246, 0.3),
      0 2px 4px rgba(0, 0, 0, 0.2);
    color: #93c5fd;
  }
  
  .passkey-button:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 
      0 2px 6px rgba(59, 130, 246, 0.2),
      0 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  .passkey-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .passkey-button svg {
    flex-shrink: 0;
  }
  
  .error-message,
  .success-message {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-radius: 12px;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    animation: slideInBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  @keyframes slideInBounce {
    from {
      opacity: 0;
      transform: translateX(-20px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  
  .error-message {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #fca5a5;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  .success-message {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%);
    border: 1px solid rgba(34, 197, 94, 0.4);
    color: #86efac;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  .remember-credentials {
    margin: 0.5em 0;
    display: flex;
    justify-content: center;
    animation: fadeIn 0.5s ease-out 0.2s both;
  }
  
  .remember-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    user-select: none;
    transition: color 0.2s ease;
    padding: 4px 8px;
    border-radius: 8px;
  }
  
  .remember-label:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .remember-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #3b82f6;
    transition: all 0.2s ease;
  }
  
  .remember-label input[type="checkbox"]:checked {
    transform: scale(1.1);
  }
  
  .remember-label input[type="checkbox"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .retry-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%);
    border: 1px solid rgba(59, 130, 246, 0.4);
    border-radius: 12px;
    margin: 12px 0;
    color: #93c5fd;
    font-size: 14px;
    font-weight: 500;
    animation: pulse 2s ease-in-out infinite;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .retry-info svg {
    animation: spin 1s linear infinite;
  }
  
  .spinner {
    width: 18px;
    height: 18px;
    border: 2.5px solid rgba(255, 255, 255, 0.2);
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
      transform: scale(1);
    }
    50% {
      opacity: 0.85;
      transform: scale(0.98);
    }
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .auth-modal-overlay {
      padding: 16px;
    }
    
    .auth-modal {
      width: 100%;
      max-width: 100%;
      max-height: 98vh;
    }
    
    .form {
      padding: 2em 1.5em 1.5em 1.5em;
      border-radius: 20px;
      gap: 14px;
    }
    
    #heading {
      font-size: 1.5em;
      margin: 0.3em 0 1.2em 0;
    }
    
    .field {
      padding: 0.75em 1em;
      border-radius: 14px;
    }
    
    .input-field {
      font-size: 16px; /* Previene zoom su iOS */
    }
    
    .form .btn {
      flex-direction: column;
      gap: 0.6em;
      margin-top: 1.2em;
    }
    
    .button1,
    .button2 {
      width: 100%;
      padding: 0.9em 1.5em;
      font-size: 15px;
    }
    
    .button3 {
      margin-top: 0.3em;
      margin-bottom: 0.8em;
      padding: 0.7em;
    }
    
    .close-button {
      top: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      padding: 8px;
    }
    
    .error-message,
    .success-message,
    .retry-info {
      padding: 12px 16px;
      font-size: 13px;
    }
  }
  
  @media (max-width: 480px) {
    .auth-modal-overlay {
      padding: 12px;
    }
    
    .form {
      padding: 1.8em 1.2em 1.2em 1.2em;
      border-radius: 18px;
      gap: 12px;
    }
    
    #heading {
      font-size: 1.35em;
      margin: 0.2em 0 1em 0;
    }
    
    .field {
      padding: 0.7em 0.9em;
      border-radius: 12px;
    }
    
    .input-icon {
      height: 1.2em;
      width: 1.2em;
    }
    
    .form .btn {
      margin-top: 1em;
    }
    
    .button1,
    .button2 {
      padding: 0.85em 1.3em;
      font-size: 14px;
    }
  }
  
  /* Animazione per il cambio modalità */
  @keyframes modeSwitch {
    0% {
      opacity: 0;
      transform: scale(0.95);
    }
    50% {
      transform: scale(1.02);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .form.switching {
    animation: modeSwitch 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>

