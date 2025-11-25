<script>
  import { alertDialogState } from '../stores/app.js';
  
  $: dialog = $alertDialogState;
  $: isOpen = dialog.isOpen;
  $: title = dialog.title;
  $: message = dialog.message;
  $: buttonText = dialog.buttonText;
  $: type = dialog.type;
  
  function handleClose() {
    if (dialog.resolve) {
      dialog.resolve();
    }
    alertDialogState.set({ ...dialog, isOpen: false, resolve: null });
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
  
  function handleKeydown(event) {
    if ((event.key === 'Escape' || event.key === 'Enter') && isOpen) {
      handleClose();
    }
  }
  
  $: iconPath = {
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  }[type];
  
  $: iconColor = {
    info: '#3b82f6',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b'
  }[type];
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="alert-title">
    <div class="modal-content" class:type-info={type === 'info'} class:type-success={type === 'success'} class:type-error={type === 'error'} class:type-warning={type === 'warning'}>
      <div class="modal-header">
        <div class="icon-wrapper" style="color: {iconColor}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d={iconPath} />
          </svg>
        </div>
        <h2 id="alert-title" class="modal-title">{title}</h2>
      </div>
      
      <div class="modal-body">
        <p class="modal-message">{message}</p>
      </div>
      
      <div class="modal-footer">
        <button class="button button-ok" class:type-info={type === 'info'} class:type-success={type === 'success'} class:type-error={type === 'error'} class:type-warning={type === 'warning'} on:click={handleClose}>
          {buttonText}
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
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 24px 16px 24px;
    border-bottom: 1px solid var(--border-color, #3a3a3a);
  }

  .icon-wrapper {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: rgba(59, 130, 246, 0.1);
  }

  .type-success .icon-wrapper {
    background-color: rgba(34, 197, 94, 0.1);
  }

  .type-error .icon-wrapper {
    background-color: rgba(239, 68, 68, 0.1);
  }

  .type-warning .icon-wrapper {
    background-color: rgba(245, 158, 11, 0.1);
  }

  .modal-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary, #ffffff);
    margin: 0;
    flex: 1;
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
    justify-content: flex-end;
    padding: 16px 24px 24px 24px;
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

  .button-ok {
    background: linear-gradient(135deg, var(--accent-blue, #3b82f6) 0%, #8b5cf6 100%);
    color: white;
  }

  .button-ok:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .button-ok.type-success {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  }

  .button-ok.type-success:hover {
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  }

  .button-ok.type-error {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }

  .button-ok.type-error:hover {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  .button-ok.type-warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }

  .button-ok.type-warning:hover {
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  }

  .modal-content.type-info {
    border-color: rgba(59, 130, 246, 0.3);
  }

  .modal-content.type-success {
    border-color: rgba(34, 197, 94, 0.3);
  }

  .modal-content.type-error {
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
      gap: 12px;
    }
    
    .icon-wrapper {
      width: 36px;
      height: 36px;
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
      padding: 16px 20px 20px 20px;
    }

    .button {
      width: 100%;
      min-height: 48px;
      font-size: 15px;
    }
  }
</style>

