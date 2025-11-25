<script>
  import { createEventDispatcher } from 'svelte';
  import { register, login } from '../services/authService.js';
  import { setUser } from '../stores/auth.js';
  import { isAuthenticatedStore } from '../stores/auth.js';
  
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
  
  async function handleSubmit() {
    error = '';
    successMessage = '';
    
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
    
    try {
      let result;
      
      if (isLogin) {
        result = await login(username, password);
      } else {
        result = await register(username, password);
      }
      
      if (result.success) {
        setUser(result.user);
        successMessage = isLogin ? 'Login completato con successo!' : 'Registrazione completata con successo!';
        
        // Chiudi il modal dopo un breve delay
        setTimeout(() => {
          closeModal();
        }, 1000);
      } else {
        // Mostra un messaggio di errore più dettagliato
        const errorDetails = [];
        if (result.message) errorDetails.push(result.message);
        if (result.error) errorDetails.push(`Dettagli: ${result.error}`);
        if (result.errorType) errorDetails.push(`Tipo: ${result.errorType}`);
        if (result.url) errorDetails.push(`URL: ${result.url}`);
        
        error = errorDetails.length > 0 
          ? errorDetails.join(' | ') 
          : 'Si è verificato un errore. Controlla la console per i dettagli.';
        
        console.error('❌ [AUTH MODAL] Errore autenticazione:', result);
      }
    } catch (err) {
      console.error('❌ [AUTH MODAL] Errore durante autenticazione:', err);
      error = `Errore di connessione: ${err.message || 'Errore sconosciuto'}. Verifica che il server sia avviato su http://localhost:3001`;
    } finally {
      isLoading = false;
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
    username = '';
    password = '';
    confirmPassword = '';
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

