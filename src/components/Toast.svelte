<script>
  import { onMount } from 'svelte';
  
  export let message = '';
  export let type = 'info'; // 'info', 'success', 'error', 'warning'
  export let duration = 3000;
  export let onClose = () => {};
  
  let isVisible = false;
  let isExiting = false;
  
  onMount(() => {
    // Anima l'entrata
    setTimeout(() => {
      isVisible = true;
    }, 10);
    
    // Auto-close dopo duration
    if (duration > 0) {
      setTimeout(() => {
        close();
      }, duration);
    }
  });
  
  function close() {
    isExiting = true;
    setTimeout(() => {
      onClose();
    }, 300);
  }
  
  $: iconPath = type === 'success' ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' :
    type === 'error' ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' :
    type === 'warning' ? 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' :
    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  
  $: bgColor = type === 'success' ? 'var(--md-sys-color-tertiary-container)' :
    type === 'error' ? 'var(--md-sys-color-error-container)' :
    type === 'warning' ? 'var(--md-sys-color-warning-container)' :
    'var(--md-sys-color-surface-container-high)';
  
  $: textColor = type === 'success' ? 'var(--md-sys-color-on-tertiary-container)' :
    type === 'error' ? 'var(--md-sys-color-on-error-container)' :
    type === 'warning' ? 'var(--md-sys-color-on-warning-container)' :
    'var(--md-sys-color-on-surface)';
</script>

<div 
  class="toast" 
  class:visible={isVisible} 
  class:exiting={isExiting}
  class:type-{type}
  style="background-color: {bgColor}; color: {textColor};"
  role="alert"
  aria-live="polite"
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon">
    <path d={iconPath} />
  </svg>
  <span class="toast-message">{message}</span>
  <button class="toast-close" on:click={close} aria-label="Chiudi">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>
</div>

<style>
  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: var(--md-sys-shape-corner-large);
    box-shadow: var(--md-sys-elevation-level3);
    min-width: 300px;
    max-width: 500px;
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
    transition: all var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
    pointer-events: none;
    position: relative;
    z-index: 10000;
  }

  .toast.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: all;
  }

  .toast.exiting {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }

  .toast-icon {
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
    font-size: var(--md-sys-typescale-body-medium-size);
    font-weight: var(--md-sys-typescale-body-medium-weight);
    line-height: 1.4;
  }

  .toast-close {
    background: none;
    border: none;
    color: currentColor;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--md-sys-shape-corner-small);
    opacity: 0.7;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    flex-shrink: 0;
  }

  .toast-close:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.1);
  }

  .toast-close:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    .toast {
      min-width: 280px;
      max-width: calc(100vw - 32px);
      padding: 10px 14px;
    }

    .toast-message {
      font-size: var(--md-sys-typescale-body-small-size);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .toast {
      transition: opacity 0.1s;
    }
  }
</style>

