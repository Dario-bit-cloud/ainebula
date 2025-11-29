<script>
  export let icon = null; // SVG path or component
  export let title = 'Nessun contenuto';
  export let description = '';
  export let actionLabel = null;
  export let onAction = null;
  export let variant = 'default'; // 'default', 'search', 'chat', 'project'
  
  // Icone predefinite per varianti
  $: defaultIcon = icon || (variant === 'search' ? 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' : 
    variant === 'chat' ? 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' :
    variant === 'project' ? 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' :
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z');
</script>

<div class="empty-state" class:variant-{variant}>
  <div class="empty-state-icon">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d={defaultIcon} />
    </svg>
  </div>
  <h3 class="empty-state-title">{title}</h3>
  {#if description}
    <p class="empty-state-description">{description}</p>
  {/if}
  {#if actionLabel && onAction}
    <button class="empty-state-action" on:click={onAction}>
      {actionLabel}
    </button>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
    color: var(--md-sys-color-on-surface-variant);
    animation: fadeIn 0.4s ease-out;
  }

  .empty-state-icon {
    width: 80px;
    height: 80px;
    margin-bottom: 24px;
    color: var(--md-sys-color-on-surface-variant);
    opacity: 0.5;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--md-sys-color-surface-container);
    padding: 16px;
  }

  .empty-state-title {
    font-size: var(--md-sys-typescale-title-medium-size);
    font-weight: var(--md-sys-typescale-title-medium-weight);
    font-family: var(--md-sys-typescale-title-medium-font);
    color: var(--md-sys-color-on-surface);
    margin: 0 0 8px 0;
  }

  .empty-state-description {
    font-size: var(--md-sys-typescale-body-medium-size);
    color: var(--md-sys-color-on-surface-variant);
    margin: 0 0 24px 0;
    max-width: 400px;
    line-height: 1.5;
  }

  .empty-state-action {
    padding: 12px 24px;
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    border: none;
    border-radius: var(--md-sys-shape-corner-large);
    font-size: var(--md-sys-typescale-label-large-size);
    font-weight: var(--md-sys-typescale-label-large-weight);
    cursor: pointer;
    transition: all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard);
    box-shadow: var(--md-sys-elevation-level1);
  }

  .empty-state-action:hover {
    background: var(--md-sys-color-primary);
    opacity: 0.92;
    box-shadow: var(--md-sys-elevation-level2);
    transform: translateY(-1px);
  }

  .empty-state-action:active {
    transform: translateY(0);
    box-shadow: var(--md-sys-elevation-level1);
  }

  /* Varianti */
  .variant-search .empty-state-icon {
    width: 64px;
    height: 64px;
    padding: 12px;
  }

  .variant-chat .empty-state-icon {
    background: linear-gradient(135deg, var(--md-sys-color-primary-container), var(--md-sys-color-secondary-container));
    color: var(--md-sys-color-primary);
    opacity: 0.8;
  }

  .variant-project .empty-state-icon {
    background: var(--md-sys-color-tertiary-container);
    color: var(--md-sys-color-on-tertiary-container);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .empty-state {
      padding: 32px 16px;
    }

    .empty-state-icon {
      width: 64px;
      height: 64px;
      padding: 12px;
      margin-bottom: 16px;
    }

    .empty-state-title {
      font-size: var(--md-sys-typescale-title-small-size);
    }

    .empty-state-description {
      font-size: var(--md-sys-typescale-body-small-size);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .empty-state {
      animation: none;
    }
  }
</style>

