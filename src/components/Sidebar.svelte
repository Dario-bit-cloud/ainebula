<script>
  let activeItem = null;
  
  const menuItems = [
    { id: 'new-chat', label: 'Nuova chat', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
    { id: 'search', label: 'Cerca chat', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { id: 'library', label: 'Libreria', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'codex', label: 'Codex', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'gpt', label: 'GPT', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'projects', label: 'Progetti', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' }
  ];

  function handleClick(itemId) {
    activeItem = itemId;
  }
</script>

<aside class="sidebar">
  <nav class="sidebar-nav">
    {#each menuItems as item}
      <button 
        class="nav-item" 
        class:active={activeItem === item.id}
        on:click={() => handleClick(item.id)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d={item.icon} />
        </svg>
        <span>{item.label}</span>
        {#if item.id === 'projects'}
          <svg class="plus-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        {/if}
      </button>
    {/each}
  </nav>
  
  <div class="user-section">
    <div class="user-info">
      <div class="user-avatar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="user-details">
        <div class="username">andrea.winkler</div>
        <div class="workspace">Godfrey's Workspace</div>
      </div>
    </div>
    <button class="invite-button">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
      <span>Invita membri del team</span>
    </button>
  </div>
</aside>

<style>
  .sidebar {
    width: 240px;
    background-color: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color);
    height: 100%;
  }

  .sidebar-nav {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
  }

  .nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s;
    position: relative;
    text-align: left;
  }

  .nav-item:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .nav-item.active {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .nav-item svg {
    flex-shrink: 0;
  }

  .plus-icon {
    margin-left: auto;
    opacity: 0.6;
  }

  .user-section {
    padding: 12px;
    border-top: 1px solid var(--border-color);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    padding: 8px;
    border-radius: 8px;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-blue), #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }

  .user-details {
    flex: 1;
    min-width: 0;
  }

  .username {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .workspace {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .invite-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .invite-button:hover {
    background-color: var(--hover-bg);
    border-color: var(--accent-blue);
  }

  .invite-button svg {
    flex-shrink: 0;
  }
</style>

