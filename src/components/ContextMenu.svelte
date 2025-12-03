<script>
  import { onMount, onDestroy } from 'svelte';
  import { contextMenuState } from '../services/contextMenuService.js';
  import { Copy, Clipboard, Scissors, Trash2, Download, Image as ImageIcon } from 'lucide-svelte';
  import { showSuccess, showError } from '../services/toastService.js';

  let menuElement;
  let isVisible = false;
  let position = { x: 0, y: 0 };
  let menuItems = [];

  // Aggiorna il menu quando cambia lo stato
  $: {
    if ($contextMenuState.visible) {
      isVisible = true;
      position = $contextMenuState.position;
      updateMenuItems();
      setTimeout(() => adjustMenuPosition(), 0);
    } else {
      isVisible = false;
    }
  }

  function updateMenuItems() {
    const items = [];
    
    // Controlla selezione testo
    const selection = window.getSelection();
    const hasTextSelection = selection && selection.toString().trim().length > 0;
    
    // Controlla input attivo
    const activeElement = document.activeElement;
    const isInput = activeElement && 
      (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || 
       activeElement.contentEditable === 'true');
    
    // Controlla immagine
    const target = $contextMenuState.target;
    const isImage = target && (target.tagName === 'IMG' || target.closest('img'));
    const imgElement = isImage ? (target.tagName === 'IMG' ? target : target.closest('img')) : null;

    // Copia testo (se c'è testo selezionato e non è un'immagine)
    if (hasTextSelection && !isImage) {
      items.push({
        id: 'copy',
        label: 'Copia',
        icon: Copy,
        action: () => copyText(selection.toString().trim())
      });
    }

    // Incolla (se siamo in un input)
    if (isInput) {
      items.push({
        id: 'paste',
        label: 'Incolla',
        icon: Clipboard,
        action: () => pasteText(activeElement)
      });
    }

    // Taglia (se c'è testo selezionato e siamo in un input)
    if (hasTextSelection && isInput) {
      items.push({
        id: 'cut',
        label: 'Taglia',
        icon: Scissors,
        action: () => cutText(activeElement, selection)
      });
    }

    // Elimina (se c'è testo selezionato o siamo in un input)
    if (hasTextSelection || isInput) {
      items.push({
        id: 'delete',
        label: 'Elimina',
        icon: Trash2,
        action: () => deleteText(activeElement, selection)
      });
    }

    // Opzioni immagine
    if (isImage && imgElement) {
      if (items.length > 0) {
        items.push({ id: 'divider' });
      }
      items.push({
        id: 'copy-image',
        label: 'Copia immagine',
        icon: ImageIcon,
        action: () => copyImage(imgElement)
      });
      items.push({
        id: 'download-image',
        label: 'Scarica immagine',
        icon: Download,
        action: () => downloadImage(imgElement)
      });
    }

    menuItems = items;
  }

  function adjustMenuPosition() {
    if (!menuElement) return;
    
    const rect = menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = position.x;
    let y = position.y;
    
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 8;
    }
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 8;
    }
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    
    menuElement.style.left = `${x}px`;
    menuElement.style.top = `${y}px`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Testo copiato!');
    } catch (error) {
      console.error('Errore copia:', error);
      showError('Errore durante la copia');
    }
    closeMenu();
  }

  async function pasteText(element) {
    try {
      const text = await navigator.clipboard.readText();
      
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        const input = element;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const value = input.value || '';
        
        input.value = value.substring(0, start) + text + value.substring(end);
        input.selectionStart = input.selectionEnd = start + text.length;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (element.contentEditable === 'true') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          selection.deleteContents();
          selection.getRangeAt(0).insertNode(document.createTextNode(text));
          selection.collapseToEnd();
        }
      }
      
      showSuccess('Testo incollato!');
    } catch (error) {
      console.error('Errore incolla:', error);
      showError('Errore durante l\'incolla');
    }
    closeMenu();
  }

  async function cutText(element, selection) {
    try {
      const text = selection.toString().trim();
      if (!text) {
        showError('Nessun testo selezionato');
        closeMenu();
        return;
      }

      await navigator.clipboard.writeText(text);
      
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        const input = element;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const value = input.value;
        
        input.value = value.substring(0, start) + value.substring(end);
        input.selectionStart = input.selectionEnd = start;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        selection.deleteContents();
      }
      
      showSuccess('Testo tagliato!');
    } catch (error) {
      console.error('Errore taglia:', error);
      showError('Errore durante il taglio');
    }
    closeMenu();
  }

  function deleteText(element, selection) {
    try {
      if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
        const input = element;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const value = input.value;
        
        if (start === end && start < value.length) {
          input.value = value.substring(0, start) + value.substring(start + 1);
          input.selectionStart = input.selectionEnd = start;
        } else if (start !== end) {
          input.value = value.substring(0, start) + value.substring(end);
          input.selectionStart = input.selectionEnd = start;
        }
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
        showSuccess('Testo eliminato!');
      } else if (selection && selection.rangeCount > 0) {
        selection.deleteContents();
        showSuccess('Contenuto eliminato!');
      } else {
        showError('Nessun contenuto selezionato');
      }
    } catch (error) {
      console.error('Errore elimina:', error);
      showError('Errore durante l\'eliminazione');
    }
    closeMenu();
  }

  async function copyImage(img) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.crossOrigin = 'anonymous';
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showSuccess('Immagine copiata!');
          } catch (error) {
            console.error('Errore copia immagine:', error);
            showError('Errore durante la copia dell\'immagine');
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('Errore copia immagine:', error);
      showError('Errore durante la copia dell\'immagine');
    }
    closeMenu();
  }

  async function downloadImage(img) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.crossOrigin = 'anonymous';
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `image-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showSuccess('Immagine scaricata!');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Errore download immagine:', error);
      showError('Errore durante il download dell\'immagine');
    }
    closeMenu();
  }

  function closeMenu() {
    contextMenuState.close();
  }

  function handleItemClick(item) {
    if (item.action) {
      item.action();
    }
  }

  function handleBackdropClick(event) {
    if (menuElement && !menuElement.contains(event.target)) {
      closeMenu();
    }
  }

  function handleBackdropTouch(event) {
    // Su mobile, chiudi il menu se si tocca fuori
    if (menuElement && !menuElement.contains(event.target)) {
      closeMenu();
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }

  onMount(() => {
    // Usa mousedown per desktop
    document.addEventListener('mousedown', handleBackdropClick);
    // Usa touchstart per mobile
    document.addEventListener('touchstart', handleBackdropTouch, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
  });

  onDestroy(() => {
    document.removeEventListener('mousedown', handleBackdropClick);
    document.removeEventListener('touchstart', handleBackdropTouch);
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('scroll', closeMenu, true);
    window.removeEventListener('resize', closeMenu);
  });
</script>

{#if isVisible && menuItems.length > 0}
  <div
    class="context-menu"
    bind:this={menuElement}
    style="left: {position.x}px; top: {position.y}px;"
    role="menu"
    aria-label="Menu contestuale"
    on:contextmenu|preventDefault|stopPropagation
  >
    {#each menuItems as item}
      {#if item.id === 'divider'}
        <div class="menu-divider"></div>
      {:else}
        <button
          class="menu-item"
          on:click={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleItemClick(item);
          }}
          on:touchstart={(e) => {
            e.stopPropagation();
          }}
          on:touchend={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleItemClick(item);
          }}
          on:mousedown|stopPropagation
          role="menuitem"
        >
          <svelte:component this={item.icon} size={18} />
          <span>{item.label}</span>
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    z-index: 10000;
    min-width: 200px;
    background-color: var(--md-sys-color-surface-container-high);
    border-radius: var(--md-sys-shape-corner-medium);
    box-shadow: var(--md-sys-elevation-level3);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    animation: fadeInScale var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--md-sys-color-outline-variant);
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface);
    font-size: var(--md-sys-typescale-body-medium-size);
    font-weight: var(--md-sys-typescale-body-medium-weight);
    line-height: var(--md-sys-typescale-body-medium-line-height);
    cursor: pointer;
    border-radius: var(--md-sys-shape-corner-small);
    transition: background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    text-align: left;
    width: 100%;
    min-height: 48px;
  }

  .menu-item:hover {
    background-color: var(--md-sys-color-surface-container-highest);
  }

  .menu-item:active {
    background-color: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }

  .menu-item:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: -2px;
  }

  .menu-item :global(svg) {
    flex-shrink: 0;
    color: var(--md-sys-color-on-surface-variant);
  }

  .menu-item:hover :global(svg),
  .menu-item:active :global(svg) {
    color: var(--md-sys-color-on-surface);
  }

  .menu-item:active :global(svg) {
    color: var(--md-sys-color-on-primary-container);
  }

  .menu-divider {
    height: 1px;
    background-color: var(--md-sys-color-outline-variant);
    margin: 4px 0;
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Dark theme adjustments */
  @media (prefers-color-scheme: dark) {
    .context-menu {
      background-color: var(--md-sys-color-surface-container-high-dark);
      border-color: var(--md-sys-color-outline-variant-dark);
    }

    .menu-item {
      color: var(--md-sys-color-on-surface-dark);
    }

    .menu-item:hover {
      background-color: var(--md-sys-color-surface-container-highest-dark);
    }

    .menu-item:active {
      background-color: var(--md-sys-color-primary-container-dark);
      color: var(--md-sys-color-on-primary-container-dark);
    }

    .menu-divider {
      background-color: var(--md-sys-color-outline-variant-dark);
    }
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .context-menu {
      min-width: 240px;
      padding: 12px;
      max-width: 90vw;
    }

    .menu-item {
      min-height: 56px;
      padding: 16px 20px;
      font-size: 16px;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .menu-item:active {
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      transform: scale(0.98);
      transition: transform 0.1s ease;
    }
  }
</style>