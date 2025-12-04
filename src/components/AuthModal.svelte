<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { signUp, signIn } from '../services/neonAuthService.js';
  import { setUser, isAuthenticatedStore } from '../stores/auth.js';
  import { get } from 'svelte/store';
  
  const dispatch = createEventDispatcher();
  
  export let initialMode = 'login'; // 'login' o 'register'
  
  // Aggiorna isLogin quando cambia initialMode
  $: isLogin = initialMode === 'login';
  let username = ''; // Obbligatorio per login e registrazione
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
  
  // Carica credenziali salvate al mount
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
  });
  
  async function handleSubmit() {
    error = '';
    successMessage = '';
    retryCount = 0;
    
    await attemptLogin();
  }
  
  async function attemptLogin() {
    // Validazione - username è obbligatorio
    if (!username || !password) {
      error = 'Username e password sono obbligatori';
      return;
    }
    
    // Validazione username
    if (username.length < 3) {
      error = 'Lo username deve essere di almeno 3 caratteri';
      return;
    }
    
    // Validazione caratteri username (solo lettere, numeri, underscore, trattino)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      error = 'Lo username può contenere solo lettere, numeri, underscore e trattini';
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
        result = await signIn(username, password);
      } else {
        result = await signUp(username, password);
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
        
        // Assicurati che il token sia disponibile prima di chiamare setUser
        const token = localStorage.getItem('auth_token');
        if (token) {
          console.log('✅ [AUTH MODAL] Token disponibile, chiamo setUser');
          await setUser(result.user);
        } else {
          console.warn('⚠️ [AUTH MODAL] Token non disponibile, attendo...');
          // Attendi un momento e riprova
          await new Promise(resolve => setTimeout(resolve, 200));
          const tokenRetry = localStorage.getItem('auth_token');
          if (tokenRetry) {
            await setUser(result.user);
          } else {
            console.error('❌ [AUTH MODAL] Token ancora non disponibile dopo attesa');
            error = 'Errore durante il salvataggio della sessione. Riprova.';
            isLoading = false;
            return;
          }
        }
        
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
        // Se si passa a registrazione, resetta tutto
        username = '';
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
        <div class="field-input-wrapper">
          <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
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
            minlength="3"
            pattern="[a-zA-Z0-9_\-]+"
            title="Solo lettere, numeri, underscore e trattini"
          />
        </div>
      </div>

      <div class="field">
        <div class="field-input-wrapper">
          <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
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
      </div>

      {#if !isLogin}
        <div class="field">
          <div class="field-input-wrapper">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
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
            {isLogin ? 'Accesso...' : 'Registrazione...'}
          {:else}
            {isLogin ? 'Login' : 'Registrati'}
          {/if}
        </button>
        <button class="button2" type="button" on:click={switchMode} disabled={isLoading}>
          {isLogin ? 'Registrati' : 'Login'}
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
  /* Material Design 3 Styles */
  .auth-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--md-sys-color-scrim);
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: fadeIn var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
    padding: 20px;
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
    width: 100%;
    max-width: 460px;
    max-height: 95vh;
    overflow-y: auto;
    overflow-x: hidden;
    animation: slideUpScale var(--md-sys-motion-duration-medium4) var(--md-sys-motion-easing-emphasized);
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
    background: var(--md-sys-color-surface-container-high);
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-on-surface);
    cursor: pointer;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    z-index: 10;
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
  }
  
  .close-button:hover {
    background: var(--md-sys-color-error-container);
    border-color: var(--md-sys-color-error);
    color: var(--md-sys-color-on-error-container);
    transform: scale(1.1) rotate(90deg);
  }
  
  .close-button:active {
    transform: scale(0.95) rotate(90deg);
  }
  
  .close-button:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }
  
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    background: var(--md-sys-color-surface-container);
    border-radius: var(--md-sys-shape-corner-extra-large);
    box-shadow: var(--md-sys-elevation-level3);
    transition: all var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
    position: relative;
    overflow: hidden;
  }
  
  #heading {
    text-align: center;
    margin: 0 0 24px 0;
    color: var(--md-sys-color-on-surface);
    font-family: var(--md-sys-typescale-headline-medium-font);
    font-size: var(--md-sys-typescale-headline-medium-size);
    font-weight: var(--md-sys-typescale-headline-medium-weight);
    line-height: var(--md-sys-typescale-headline-medium-line-height);
    letter-spacing: var(--md-sys-typescale-headline-medium-tracking);
    animation: fadeInSlideDown var(--md-sys-motion-duration-medium4) var(--md-sys-motion-easing-decelerated) 0.1s both;
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
  
  /* Material Design 3 Filled Text Field */
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-radius: var(--md-sys-shape-corner-small);
    padding: 0;
    position: relative;
    animation: fadeInSlideUp var(--md-sys-motion-duration-medium4) var(--md-sys-motion-easing-decelerated) both;
    animation-delay: calc(var(--field-index, 0) * 0.1s);
    background: var(--md-sys-color-surface-container-highest);
    min-height: 56px;
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
  
  .field:nth-of-type(1) { --field-index: 1; }
  .field:nth-of-type(2) { --field-index: 2; }
  .field:nth-of-type(3) { --field-index: 3; }
  
  .field-input-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    position: relative;
  }
  
  .field:focus-within {
    background: var(--md-sys-color-surface-container-high);
  }
  
  .field:focus-within::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--md-sys-color-primary);
    border-radius: 0 0 var(--md-sys-shape-corner-small) var(--md-sys-shape-corner-small);
  }
  
  .input-icon {
    height: 24px;
    width: 24px;
    fill: var(--md-sys-color-on-surface-variant);
    flex-shrink: 0;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
  }
  
  .field:focus-within .input-icon {
    fill: var(--md-sys-color-primary);
  }
  
  .input-field {
    background: none;
    border: none;
    outline: none;
    width: 100%;
    color: var(--md-sys-color-on-surface);
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    font-weight: var(--md-sys-typescale-body-large-weight);
    line-height: var(--md-sys-typescale-body-large-line-height);
    letter-spacing: var(--md-sys-typescale-body-large-tracking);
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    padding: 0;
  }
  
  .input-field::placeholder {
    color: var(--md-sys-color-on-surface-variant);
    opacity: 0.6;
  }
  
  .input-field:focus::placeholder {
    opacity: 0.4;
  }
  
  .input-field:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    color: var(--md-sys-color-on-surface);
  }
  
  .input-field:focus-visible {
    outline: none;
  }
  
  .form .btn {
    display: flex;
    justify-content: center;
    flex-direction: row;
    margin-top: 8px;
    gap: 12px;
    animation: fadeIn var(--md-sys-motion-duration-medium4) var(--md-sys-motion-easing-decelerated) 0.3s both;
  }
  
  /* Material Design 3 Filled Button */
  .button1 {
    flex: 1;
    padding: 10px 24px;
    border-radius: var(--md-sys-shape-corner-large);
    border: none;
    outline: none;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    cursor: pointer;
    font-family: var(--md-sys-typescale-label-large-font);
    font-size: var(--md-sys-typescale-label-large-size);
    font-weight: var(--md-sys-typescale-label-large-weight);
    line-height: var(--md-sys-typescale-label-large-line-height);
    letter-spacing: var(--md-sys-typescale-label-large-tracking);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: var(--md-sys-elevation-level1);
    position: relative;
    overflow: hidden;
    min-height: 40px;
  }
  
  .button1::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--md-sys-color-on-primary);
    opacity: 0;
    transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
  }
  
  .button1:hover:not(:disabled)::before {
    opacity: 0.08;
  }
  
  .button1:active:not(:disabled)::before {
    opacity: 0.12;
  }
  
  .button1:hover:not(:disabled) {
    box-shadow: var(--md-sys-elevation-level2);
  }
  
  .button1:active:not(:disabled) {
    box-shadow: var(--md-sys-elevation-level1);
  }
  
  .button1:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    box-shadow: none;
  }
  
  .button1:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }
  
  /* Material Design 3 Outlined Button */
  .button2 {
    padding: 10px 24px;
    border-radius: var(--md-sys-shape-corner-large);
    border: 1px solid var(--md-sys-color-outline);
    outline: none;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    background: transparent;
    color: var(--md-sys-color-primary);
    cursor: pointer;
    font-family: var(--md-sys-typescale-label-large-font);
    font-size: var(--md-sys-typescale-label-large-size);
    font-weight: var(--md-sys-typescale-label-large-weight);
    line-height: var(--md-sys-typescale-label-large-line-height);
    letter-spacing: var(--md-sys-typescale-label-large-tracking);
    white-space: nowrap;
    min-height: 40px;
    position: relative;
    overflow: hidden;
  }
  
  .button2::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--md-sys-color-primary);
    opacity: 0;
    transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
  }
  
  .button2:hover:not(:disabled)::before {
    opacity: 0.08;
  }
  
  .button2:active:not(:disabled)::before {
    opacity: 0.12;
  }
  
  .button2:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    border-color: var(--md-sys-color-outline);
  }
  
  .button2:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }
  
  /* Material Design 3 Text Button */
  .button3 {
    margin-top: 8px;
    margin-bottom: 0;
    padding: 10px 12px;
    border-radius: var(--md-sys-shape-corner-small);
    border: none;
    outline: none;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    background: transparent;
    color: var(--md-sys-color-primary);
    cursor: pointer;
    font-family: var(--md-sys-typescale-label-large-font);
    font-size: var(--md-sys-typescale-label-large-size);
    font-weight: var(--md-sys-typescale-label-large-weight);
    line-height: var(--md-sys-typescale-label-large-line-height);
    letter-spacing: var(--md-sys-typescale-label-large-tracking);
    width: 100%;
    text-decoration: none;
    min-height: 40px;
    position: relative;
    overflow: hidden;
  }
  
  .button3::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--md-sys-color-primary);
    opacity: 0;
    transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
  }
  
  .button3:hover:not(:disabled)::before {
    opacity: 0.08;
  }
  
  .button3:active:not(:disabled)::before {
    opacity: 0.12;
  }
  
  .button3:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }
  
  .button3:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }
  
  .error-message,
  .success-message {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: var(--md-sys-shape-corner-medium);
    margin-bottom: 8px;
    font-family: var(--md-sys-typescale-body-medium-font);
    font-size: var(--md-sys-typescale-body-medium-size);
    font-weight: var(--md-sys-typescale-body-medium-weight);
    line-height: var(--md-sys-typescale-body-medium-line-height);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking);
    animation: slideInBounce var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized);
    box-shadow: var(--md-sys-elevation-level1);
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
    background: var(--md-sys-color-error-container);
    color: var(--md-sys-color-on-error-container);
  }
  
  .error-message svg {
    fill: var(--md-sys-color-on-error-container);
    flex-shrink: 0;
  }
  
  .success-message {
    background: var(--md-sys-color-tertiary-container);
    color: var(--md-sys-color-on-tertiary-container);
  }
  
  .success-message svg {
    fill: var(--md-sys-color-on-tertiary-container);
    flex-shrink: 0;
  }
  
  .remember-credentials {
    margin: 8px 0;
    display: flex;
    justify-content: center;
    animation: fadeIn var(--md-sys-motion-duration-medium4) var(--md-sys-motion-easing-decelerated) 0.2s both;
  }
  
  .remember-label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    font-family: var(--md-sys-typescale-body-medium-font);
    font-size: var(--md-sys-typescale-body-medium-size);
    font-weight: var(--md-sys-typescale-body-medium-weight);
    line-height: var(--md-sys-typescale-body-medium-line-height);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking);
    color: var(--md-sys-color-on-surface);
    user-select: none;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    padding: 8px;
    border-radius: var(--md-sys-shape-corner-small);
  }
  
  .remember-label:hover {
    background: var(--md-sys-color-surface-container-high);
  }
  
  .remember-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--md-sys-color-primary);
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
  }
  
  .remember-label input[type="checkbox"]:checked {
    transform: scale(1.05);
  }
  
  .remember-label input[type="checkbox"]:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }
  
  .retry-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    border-radius: var(--md-sys-shape-corner-medium);
    margin: 12px 0;
    font-family: var(--md-sys-typescale-body-medium-font);
    font-size: var(--md-sys-typescale-body-medium-size);
    font-weight: var(--md-sys-typescale-body-medium-weight);
    line-height: var(--md-sys-typescale-body-medium-line-height);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking);
    animation: pulse 2s ease-in-out infinite;
    box-shadow: var(--md-sys-elevation-level1);
  }
  
  .retry-info svg {
    animation: spin 1s linear infinite;
    fill: var(--md-sys-color-on-primary-container);
    flex-shrink: 0;
  }
  
  .spinner {
    width: 18px;
    height: 18px;
    border: 2.5px solid var(--md-sys-color-on-primary);
    border-top-color: transparent;
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
      padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
      align-items: flex-end;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      background: rgba(0, 0, 0, 0.75);
    }
    
    .auth-modal {
      width: 100%;
      max-width: 100%;
      max-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      border-radius: var(--md-sys-shape-corner-extra-large) var(--md-sys-shape-corner-extra-large) 0 0;
      margin: 0;
    }
    
    .form {
      padding: 24px 20px;
      padding-bottom: calc(24px + env(safe-area-inset-bottom));
      border-radius: var(--md-sys-shape-corner-extra-large) var(--md-sys-shape-corner-extra-large) 0 0;
      gap: 16px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      max-height: 100%;
    }
    
    #heading {
      font-size: var(--md-sys-typescale-headline-small-size);
      margin: 0 0 20px 0;
    }
    
    .field {
      min-height: 56px;
    }
    
    .field-input-wrapper {
      padding: 16px;
    }
    
    .input-field {
      font-size: 16px; /* Previene zoom su iOS */
      -webkit-appearance: none;
    }
    
    .form .btn {
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }
    
    .button1,
    .button2 {
      width: 100%;
      min-height: 48px;
      font-size: 16px;
      touch-action: manipulation;
    }
    
    .button3 {
      margin-top: 8px;
      margin-bottom: 0;
      padding: 10px 12px;
      min-height: 48px;
      font-size: 16px;
      touch-action: manipulation;
    }
    
    .close-button {
      top: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      padding: 10px;
    }
    
    .error-message,
    .success-message,
    .retry-info {
      padding: 16px;
      font-size: 14px;
    }
  }
  
  @media (max-width: 480px) {
    .auth-modal-overlay {
      padding: 0;
    }
    
    .form {
      padding: 20px 16px;
      padding-bottom: calc(20px + env(safe-area-inset-bottom));
      border-radius: var(--md-sys-shape-corner-extra-large) var(--md-sys-shape-corner-extra-large) 0 0;
      gap: 16px;
    }
    
    #heading {
      font-size: var(--md-sys-typescale-headline-small-size);
      margin: 0 0 16px 0;
    }
    
    .field-input-wrapper {
      padding: 14px;
    }
    
    .input-icon {
      height: 20px;
      width: 20px;
    }
    
    .form .btn {
      margin-top: 8px;
    }
    
    .button1,
    .button2 {
      padding: 12px 24px;
      font-size: 16px;
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
    animation: modeSwitch var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized);
  }
  
  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .auth-modal-overlay {
      background: rgba(0, 0, 0, 0.7);
    }
  }
</style>

