<script>
  import { createEventDispatcher } from 'svelte';
  import { showConfirm } from '../services/dialogService.js';
  import { t } from '../utils/i18n.js';
  
  export let messageIndex;
  export let messageType; // 'user' o 'ai'
  
  const dispatch = createEventDispatcher();
  
  let showMenu = false;
  
  function handleCopy() {
    dispatch('copy');
    showMenu = false;
  }
  
  function handleEdit() {
    dispatch('edit');
    showMenu = false;
  }
  
  function handleRegenerate() {
    dispatch('regenerate');
    showMenu = false;
  }
  
  async function handleDelete() {
    const confirmed = await showConfirm(t('deleteMessageConfirm') + ' ' + t('deleteMessageConfirmAll'), t('deleteMessage'), t('delete'), t('cancel'), 'danger');
    if (confirmed) {
      dispatch('delete');
      showMenu = false;
    }
  }
  
  function handleThumbsUp() {
    dispatch('feedback', { type: 'positive' });
  }
  
  function handleThumbsDown() {
    dispatch('feedback', { type: 'negative' });
  }
  
  function handleReadAloud() {
    dispatch('readAloud');
    showMenu = false;
  }
  
  function handleReport() {
    dispatch('report');
    showMenu = false;
  }
  
  function handleMoreDetailed() {
    dispatch('moreDetailed');
    showMenu = false;
  }
  
  function handleMoreSimple() {
    dispatch('moreSimple');
    showMenu = false;
  }
  
  function toggleMenu() {
    showMenu = !showMenu;
  }
  
  // Chiudi menu quando si clicca fuori
  function handleClickOutside(event) {
    if (!event.target.closest('.message-actions-container')) {
      showMenu = false;
    }
  }
</script>

<div class="message-actions-container">
  <div class="message-actions">
    {#if messageType === 'ai'}
      <button class="action-button" on:click={handleThumbsUp} title={t('useful')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
        </svg>
      </button>
      <button class="action-button" on:click={handleThumbsDown} title={t('notUseful')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
        </svg>
      </button>
    {/if}
    
      <button class="action-button" on:click={handleCopy} title={t('copy')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
      </svg>
    </button>
    
    <button class="action-button menu-button" on:click={toggleMenu} title={t('moreActions')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="1"/>
        <circle cx="19" cy="12" r="1"/>
        <circle cx="5" cy="12" r="1"/>
      </svg>
    </button>
    
    {#if showMenu}
      <div class="menu-dropdown">
        {#if messageType === 'user'}
          <button class="menu-item" on:click={handleEdit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            {t('edit')}
          </button>
        {/if}
        
        {#if messageType === 'ai'}
          <button class="menu-item" on:click={handleRegenerate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85 3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {t('regenerate')}
          </button>
          
          <button class="menu-item" on:click={handleReadAloud}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 010 7.07"/>
              <path d="M19.07 4.93a10 10 0 010 14.14"/>
              <path d="M22 2l-2 2 2 2 2-2-2-2z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {t('readAloud')}
          </button>
          
          <button class="menu-item" on:click={handleReport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
              <line x1="4" y1="22" x2="4" y2="15"/>
              <line x1="4" y1="9" x2="4" y2="3"/>
            </svg>
            {t('reportMessage')}
          </button>
          
          <div class="menu-divider"></div>
          
          <button class="menu-item" on:click={handleMoreDetailed}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M2 12h20"/>
            </svg>
            {t('moreDetailed')}
          </button>
          
          <button class="menu-item" on:click={handleMoreSimple}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('moreSimple')}
          </button>
        {/if}
        
        <button class="menu-item delete" on:click={handleDelete}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          {t('delete')}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .message-actions-container {
    position: relative;
  }
  
  .message-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  .message:hover .message-actions,
  .message-actions-container:hover .message-actions {
    opacity: 1;
  }
  
  .action-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;
    min-width: 32px;
    min-height: 32px;
  }
  
  .action-button:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }
  
  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    min-width: 160px;
    animation: menuSlideDown 0.2s ease;
  }
  
  @media (max-width: 768px) {
    .action-button {
      padding: 8px;
      min-width: 40px;
      min-height: 40px;
    }
    
    .action-button svg {
      width: 18px;
      height: 18px;
    }
    
    .message-actions {
      opacity: 1; /* Sempre visibile su mobile */
      gap: 6px;
    }
    
    .menu-dropdown {
      right: -8px;
      min-width: 180px;
      max-width: calc(100vw - 32px);
    }
    
    .menu-item {
      padding: 12px 14px;
      font-size: 15px;
      min-height: 44px; /* Touch target più grande */
    }
    
    .menu-item svg {
      width: 18px;
      height: 18px;
    }
  }
  
  @media (max-width: 480px) {
    .action-button {
      padding: 10px;
      min-width: 44px;
      min-height: 44px;
    }
    
    .menu-dropdown {
      right: -12px;
      min-width: 200px;
    }
  }
  
  @keyframes menuSlideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 6px;
    transition: background-color 0.2s ease;
    font-size: 14px;
  }
  
  .menu-item:hover {
    background-color: var(--hover-bg);
  }
  
  .menu-item.delete {
    color: #ef4444;
  }
  
  .menu-item.delete:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }
  
  .menu-divider {
    height: 1px;
    background-color: var(--border-color);
    margin: 4px 0;
  }
  
  @media (max-width: 768px) {
    .message-actions-container {
      position: relative;
    }
    
    /* Su mobile, mostra sempre le azioni quando il messaggio è visibile */
    .message-actions {
      opacity: 1;
    }
  }
</style>

