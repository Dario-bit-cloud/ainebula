<script>
  import { promptDialogState } from '../stores/app.js';
  
  $: dialog = $promptDialogState;
  $: isOpen = dialog.isOpen;
  $: title = dialog.title;
  $: message = dialog.message;
  $: placeholder = dialog.placeholder;
  $: defaultValue = dialog.defaultValue;
  $: confirmText = dialog.confirmText;
  $: cancelText = dialog.cancelText;
  $: type = dialog.type;
  
  let inputValue = '';
  let inputRef;
  
  $: if (isOpen) {
    inputValue = defaultValue || '';
    setTimeout(() => {
      if (inputRef) {
        inputRef.focus();
        if (inputRef.select) {
          inputRef.select();
        }
      }
    }, 100);
  }
  
  function handleConfirm() {
    if (dialog.resolve) {
      dialog.resolve(inputValue);
    }
    promptDialogState.set({ ...dialog, isOpen: false, resolve: null });
  }
  
  function handleCancel() {
    if (dialog.resolve) {
      dialog.resolve(null);
    }
    promptDialogState.set({ ...dialog, isOpen: false, resolve: null });
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape' && isOpen) {
      handleCancel();
    } else if (event.key === 'Enter' && !event.shiftKey && isOpen && type !== 'textarea') {
      event.preventDefault();
      handleConfirm();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="prompt-title">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="prompt-title" class="modal-title">{title}</h2>
      </div>
      
      <div class="modal-body">
        <p class="modal-message">{message}</p>
        {#if type === 'textarea'}
          <textarea
            bind:this={inputRef}
            bind:value={inputValue}
            class="input-field"
            placeholder={placeholder}
            rows="4"
          ></textarea>
        {:else}
          <input
            bind:this={inputRef}
            bind:value={inputValue}
            type={type}
            class="input-field"
            placeholder={placeholder}
          />
        {/if}
      </div>
      
      <div class="modal-footer">
        <button class="button button-cancel" on:click={handleCancel}>
          {cancelText}
        </button>
        <button class="button button-confirm" on:click={handleConfirm} disabled={!inputValue.trim()}>
          {confirmText}
        </button>
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
    z-index: 2000;
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
    background-color: var(--bg-secondary, #2d2d2d);
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--border-color, #3a3a3a);
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
    padding: 24px 24px 16px 24px;
    border-bottom: 1px solid var(--border-color, #3a3a3a);
  }

  .modal-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary, #ffffff);
    margin: 0;
  }

  .modal-body {
    padding: 24px;
  }

  .modal-message {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-secondary, #a0a0a0);
    margin: 0 0 16px 0;
    white-space: pre-line;
  }

  .input-field {
    width: 100%;
    padding: 12px 16px;
    background-color: var(--bg-tertiary, #3a3a3a);
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 8px;
    color: var(--text-primary, #ffffff);
    font-size: 15px;
    font-family: inherit;
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .input-field:focus {
    border-color: var(--accent-blue, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .input-field::placeholder {
    color: var(--text-secondary, #a0a0a0);
  }

  textarea.input-field {
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    padding: 16px 24px 24px 24px;
    justify-content: flex-end;
  }

  .button {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    min-width: 100px;
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .button-cancel {
    background-color: var(--bg-tertiary, #3a3a3a);
    color: var(--text-primary, #ffffff);
  }

  .button-cancel:hover:not(:disabled) {
    background-color: var(--hover-bg, #454545);
  }

  .button-confirm {
    background: linear-gradient(135deg, var(--accent-blue, #3b82f6) 0%, #8b5cf6 100%);
    color: white;
  }

  .button-confirm:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 16px;
      align-items: flex-end;
    }

    .modal-content {
      max-width: 100%;
      border-radius: 16px 16px 0 0;
      animation: modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      padding: 20px 20px 12px 20px;
    }
    
    .modal-title {
      font-size: 18px;
    }

    .modal-body {
      padding: 20px;
    }
    
    .modal-message {
      font-size: 14px;
    }
    
    .input-field {
      font-size: 16px; /* Previene zoom su iOS */
      padding: 14px 16px;
      min-height: 48px;
    }
    
    textarea.input-field {
      min-height: 120px;
      font-size: 16px;
    }

    .modal-footer {
      flex-direction: column-reverse;
      padding: 16px 20px 20px 20px;
      gap: 10px;
    }

    .button {
      width: 100%;
      min-height: 48px;
      font-size: 15px;
    }
  }
</style>

