<script>
  import { confirmDialogState } from '../stores/app.js';
  
  $: dialog = $confirmDialogState;
  $: isOpen = dialog.isOpen;
  $: title = dialog.title;
  $: message = dialog.message;
  $: confirmText = dialog.confirmText;
  $: cancelText = dialog.cancelText;
  $: type = dialog.type;
  
  let isProcessing = false;
  let lastKeydownTime = 0;
  const KEYDOWN_THROTTLE_MS = 500; // Prevenire spam di Enter
  
  function handleConfirm() {
    // Prevenire chiamate multiple
    if (isProcessing) {
      return;
    }
    
    // Throttle per prevenire spam di Enter
    const now = Date.now();
    if (now - lastKeydownTime < KEYDOWN_THROTTLE_MS) {
      return;
    }
    lastKeydownTime = now;
    
    isProcessing = true;
    
    if (dialog.resolve) {
      dialog.resolve(true);
    }
    confirmDialogState.set({ ...dialog, isOpen: false, resolve: null });
    
    // Reset dopo un breve delay
    setTimeout(() => {
      isProcessing = false;
    }, KEYDOWN_THROTTLE_MS);
  }
  
  function handleCancel() {
    if (isProcessing) {
      return;
    }
    
    if (dialog.resolve) {
      dialog.resolve(false);
    }
    confirmDialogState.set({ ...dialog, isOpen: false, resolve: null });
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape' && isOpen && !isProcessing) {
      handleCancel();
    } else if (event.key === 'Enter' && isOpen && !isProcessing) {
      event.preventDefault();
      event.stopPropagation();
      handleConfirm();
    }
  }
  
  // Reset quando il dialog si chiude
  $: if (!isOpen) {
    isProcessing = false;
    lastKeydownTime = 0;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <div class="modal-content" class:type-danger={type === 'danger'} class:type-warning={type === 'warning'}>
      <div class="modal-header">
        <h2 id="confirm-title" class="modal-title">{title}</h2>
      </div>
      
      <div class="modal-body">
        <p class="modal-message">{message}</p>
      </div>
      
      <div class="modal-footer">
        <button class="button button-cancel" on:click={handleCancel}>
          {cancelText}
        </button>
        <button class="button button-confirm" class:type-danger={type === 'danger'} class:type-warning={type === 'warning'} on:click={handleConfirm} disabled={isProcessing}>
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
    margin: 0;
    white-space: pre-line;
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

  .button-cancel {
    background-color: var(--bg-tertiary, #3a3a3a);
    color: var(--text-primary, #ffffff);
  }

  .button-cancel:hover {
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
  
  .button-confirm:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  .button-confirm.type-danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }
  
  .button-confirm.type-danger:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }
  
  .button-confirm.type-warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }
  
  .button-confirm.type-warning:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  }

  .modal-content.type-danger {
    border-color: rgba(239, 68, 68, 0.3);
  }

  .modal-content.type-warning {
    border-color: rgba(245, 158, 11, 0.3);
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

