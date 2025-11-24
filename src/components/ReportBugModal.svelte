<script>
  import { isReportBugModalOpen } from '../stores/app.js';
  import { onMount } from 'svelte';
  
  let problemDescription = '';
  let includeScreenshot = true;
  let screenshotData = null;
  let isSubmitting = false;
  const maxChars = 2000;
  
  function closeModal() {
    isReportBugModalOpen.set(false);
    problemDescription = '';
    includeScreenshot = true;
    screenshotData = null;
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function captureScreenshot() {
    // Cattura screenshot della pagina corrente usando html2canvas se disponibile
    if (typeof html2canvas !== 'undefined') {
      html2canvas(document.body, {
        backgroundColor: null,
        scale: 0.5
      }).then(canvas => {
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            screenshotData = reader.result;
          };
          reader.readAsDataURL(blob);
        }, 'image/png');
      }).catch(() => {
        // Fallback: usa un placeholder
        screenshotData = null;
      });
    } else {
      // Se html2canvas non è disponibile, usa un placeholder
      screenshotData = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjM2EzYTNhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2EwYTBhMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNjcmVlbnNob3Q8L3RleHQ+PC9zdmc+';
    }
  }
  
  function handleScreenshotToggle() {
    includeScreenshot = !includeScreenshot;
    if (includeScreenshot && !screenshotData) {
      captureScreenshot();
    }
  }
  
  async function handleSubmit() {
    if (!problemDescription.trim()) {
      alert('Per favore, descrivi il problema che hai riscontrato.');
      return;
    }
    
    isSubmitting = true;
    
    // Simula invio (qui andrebbe una chiamata API reale)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const reportData = {
      description: problemDescription,
      screenshot: includeScreenshot ? screenshotData : null,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.log('Bug report:', reportData);
    
    alert('Grazie per la segnalazione! Il tuo report è stato inviato.');
    closeModal();
    isSubmitting = false;
  }
  
  onMount(() => {
    // Carica html2canvas se disponibile
    if (typeof html2canvas === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      document.head.appendChild(script);
    }
    
    // Cattura screenshot iniziale se abilitato
    if (includeScreenshot) {
      setTimeout(() => captureScreenshot(), 500);
    }
    
    // Chiudi con Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape' && $isReportBugModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  });
</script>

{#if $isReportBugModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Cosa è successo?</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <textarea
          class="problem-textarea"
          placeholder="Descrivici il problema che hai riscontrato."
          bind:value={problemDescription}
          maxlength={maxChars}
          rows="6"
        ></textarea>
        
        <div class="char-counter">
          {problemDescription.length}/{maxChars} caratteri utilizzati
        </div>
        
        <div class="disclaimer">
          Qualsiasi informazione condivisa potrebbe essere esaminata per contribuire al miglioramento di Nebula AI. Se hai domande, <a href="#" class="support-link">contatta l'assistenza</a>.
        </div>
        
        <div class="screenshot-section">
          <label class="screenshot-toggle">
            <input type="checkbox" bind:checked={includeScreenshot} on:change={handleScreenshotToggle} />
            <span class="toggle-slider"></span>
            <span class="toggle-label">Includi screenshot nel report</span>
          </label>
          
          {#if includeScreenshot && screenshotData}
            <div class="screenshot-preview">
              <img src={screenshotData} alt="Screenshot" />
            </div>
          {/if}
        </div>
        
        <div class="modal-footer">
          <button class="submit-button" on:click={handleSubmit} disabled={isSubmitting || !problemDescription.trim()}>
            {#if isSubmitting}
              <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              Invio in corso...
            {:else}
              Invia
            {/if}
          </button>
        </div>
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
    z-index: 1000;
    padding: 20px;
    animation: backdropFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
    background-color: #2d2d2d;
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
    padding: 20px 24px;
    border-bottom: 1px solid #3a3a3a;
  }

  .modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    color: #ffffff;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 4px;
    width: 32px;
    height: 32px;
  }

  .close-button:hover {
    opacity: 0.7;
    background-color: rgba(255, 255, 255, 0.1);
    transform: rotate(90deg);
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .problem-textarea {
    width: 100%;
    min-height: 120px;
    padding: 12px;
    background-color: #3a3a3a;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    color: #ffffff;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .problem-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  .problem-textarea::placeholder {
    color: #a0a0a0;
  }

  .char-counter {
    font-size: 12px;
    color: #a0a0a0;
    text-align: right;
  }

  .disclaimer {
    font-size: 13px;
    color: #a0a0a0;
    line-height: 1.5;
  }

  .support-link {
    color: #3b82f6;
    text-decoration: underline;
    cursor: pointer;
  }

  .support-link:hover {
    color: #60a5fa;
  }

  .screenshot-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .screenshot-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
  }

  .screenshot-toggle input {
    display: none;
  }

  .toggle-slider {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    background-color: #3a3a3a;
    border-radius: 24px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toggle-slider::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    left: 3px;
    top: 3px;
    background-color: white;
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .screenshot-toggle input:checked + .toggle-slider {
    background-color: #3b82f6;
  }

  .screenshot-toggle input:checked + .toggle-slider::before {
    transform: translateX(20px);
  }

  .toggle-label {
    font-size: 14px;
    color: #ffffff;
  }

  .screenshot-preview {
    margin-top: 8px;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    overflow: hidden;
    max-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1f1f1f;
  }

  .screenshot-preview img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .submit-button {
    padding: 10px 24px;
    background-color: #3b82f6;
    border: none;
    border-radius: 8px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .submit-button:hover:not(:disabled) {
    background-color: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .submit-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 0;
    }

    .modal-content {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
      height: 100vh;
    }

    .modal-body {
      padding: 20px 16px;
    }
  }
</style>

