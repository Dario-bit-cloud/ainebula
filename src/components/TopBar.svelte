<script>
  let isSettingsOpen = false;
</script>

<div class="top-bar">
  <div class="left-section">
    <div class="logo-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </div>
    <div class="model-selector">
      <span class="model-name">Nebula AI 5.1 Instant</span>
      <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  </div>
  <div class="right-section">
    <button class="icon-button" title="Impostazioni">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
      </svg>
    </button>
    <div class="loading-indicator">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
    </div>
  </div>
</div>

<style>
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    height: 56px;
  }

  .left-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
  }

  .model-selector {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  .model-selector:hover {
    background-color: var(--hover-bg);
  }

  .model-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .dropdown-icon {
    color: var(--text-secondary);
  }

  .right-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .icon-button:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .loading-indicator {
    color: var(--accent-blue);
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
</style>

