<script>
  import { toasts, removeToast } from '../services/toastService.js';
  import Toast from './Toast.svelte';
</script>

<div class="toast-container" role="region" aria-live="polite" aria-label="Notifiche">
  {#each $toasts as toast (toast.id)}
    <Toast 
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      onClose={() => removeToast(toast.id)}
    />
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
    max-width: calc(100vw - 40px);
  }

  @media (max-width: 768px) {
    .toast-container {
      top: 16px;
      right: 16px;
      left: 16px;
      max-width: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .toast-container {
      gap: 8px;
    }
  }
</style>

