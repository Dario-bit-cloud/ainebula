<script>
  export let variant = 'text'; // 'text', 'circular', 'rectangular', 'chat-item', 'message'
  export let width = '100%';
  export let height = '1em';
  export let lines = 1;
  export let animation = true;
</script>

{#if variant === 'text'}
  <div class="skeleton skeleton-text" class:animated={animation} style="width: {width}; height: {height};">
    {#if lines > 1}
      {#each Array(lines) as _, i}
        <div class="skeleton-line" style="width: {i === lines - 1 ? '80%' : '100%'};"></div>
      {/each}
    {/if}
  </div>
{:else if variant === 'circular'}
  <div class="skeleton skeleton-circular" class:animated={animation} style="width: {width}; height: {width};"></div>
{:else if variant === 'rectangular'}
  <div class="skeleton skeleton-rectangular" class:animated={animation} style="width: {width}; height: {height};"></div>
{:else if variant === 'chat-item'}
  <div class="skeleton-chat-item" class:animated={animation}>
    <div class="skeleton-avatar"></div>
    <div class="skeleton-content">
      <div class="skeleton-line" style="width: 60%;"></div>
      <div class="skeleton-line" style="width: 40%; margin-top: 8px;"></div>
    </div>
  </div>
{:else if variant === 'message'}
  <div class="skeleton-message" class:animated={animation}>
    <div class="skeleton-line" style="width: 100%;"></div>
    <div class="skeleton-line" style="width: 85%; margin-top: 8px;"></div>
    <div class="skeleton-line" style="width: 70%; margin-top: 8px;"></div>
  </div>
{/if}

<style>
  .skeleton {
    background: var(--md-sys-color-surface-container-high);
    border-radius: var(--md-sys-shape-corner-small);
    position: relative;
    overflow: hidden;
  }

  .skeleton-text {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skeleton-circular {
    border-radius: 50%;
    flex-shrink: 0;
  }

  .skeleton-rectangular {
    border-radius: var(--md-sys-shape-corner-medium);
  }

  .skeleton-line {
    height: 1em;
    background: var(--md-sys-color-surface-container-high);
    border-radius: var(--md-sys-shape-corner-small);
    position: relative;
    overflow: hidden;
  }

  .skeleton-chat-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    border-radius: var(--md-sys-shape-corner-medium);
  }

  .skeleton-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--md-sys-color-surface-container-high);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .skeleton-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skeleton-message {
    padding: 16px;
    border-radius: var(--md-sys-shape-corner-medium);
    background: var(--md-sys-color-surface-container);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Shimmer animation */
  .animated::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .animated::after {
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.05),
        transparent
      );
    }
  }

  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    .animated::after {
      animation: none;
    }
  }
</style>

