<script>
  import { isInviteModalOpen } from '../stores/app.js';
  
  let emailInput = '';
  let emails = [];
  let message = '';
  
  function closeModal() {
    isInviteModalOpen.set(false);
    emailInput = '';
    emails = [];
    message = '';
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function addEmail() {
    const email = emailInput.trim();
    if (email && isValidEmail(email) && !emails.includes(email)) {
      emails = [...emails, email];
      emailInput = '';
    }
  }
  
  function removeEmail(email) {
    emails = emails.filter(e => e !== email);
  }
  
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addEmail();
    }
  }
  
  function sendInvites() {
    if (emails.length === 0) {
      alert('Aggiungi almeno un indirizzo email');
      return;
    }
    
    // Simula invio inviti
    alert(`Inviti inviati a: ${emails.join(', ')}`);
    closeModal();
  }
</script>

{#if $isInviteModalOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Invita membri del team</h2>
        <button class="close-button" on:click={closeModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-section">
          <label class="form-label">Indirizzi email</label>
          <div class="email-input-wrapper">
            <input 
              type="email"
              class="email-input"
              placeholder="nome@esempio.com"
              bind:value={emailInput}
              on:keypress={handleKeyPress}
            />
            <button class="add-button" on:click={addEmail}>Aggiungi</button>
          </div>
          
          {#if emails.length > 0}
            <div class="email-tags">
              {#each emails as email}
                <div class="email-tag">
                  <span>{email}</span>
                  <button class="remove-tag" on:click={() => removeEmail(email)}>×</button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        
        <div class="form-section">
          <label class="form-label">Messaggio (opzionale)</label>
          <textarea 
            class="message-textarea"
            placeholder="Scrivi un messaggio di benvenuto..."
            bind:value={message}
            rows="4"
          ></textarea>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-button" on:click={closeModal}>Annulla</button>
        <button class="send-button" on:click={sendInvites}>Invia inviti</button>
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
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    font-size: 20px;
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
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .form-section {
    margin-bottom: 24px;
  }

  .form-section:last-child {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .email-input-wrapper {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .email-input {
    flex: 1;
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
  }

  .email-input:focus {
    border-color: var(--accent-blue);
  }

  .add-button {
    padding: 10px 16px;
    background-color: var(--accent-blue);
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .add-button:hover {
    opacity: 0.9;
  }

  .email-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .email-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 13px;
    color: var(--text-primary);
  }

  .remove-tag {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-tag:hover {
    color: var(--text-primary);
  }

  .message-textarea {
    width: 100%;
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    resize: vertical;
  }

  .message-textarea:focus {
    border-color: var(--accent-blue);
  }

  .message-textarea::placeholder {
    color: var(--text-secondary);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid var(--border-color);
  }

  .cancel-button,
  .send-button {
    padding: 10px 20px;
    border-radius: 6px;
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

  .send-button {
    background-color: var(--accent-blue);
    color: white;
  }

  .send-button:hover {
    opacity: 0.9;
  }
</style>

