<script>
  import { onMount, onDestroy } from 'svelte';
  import { contextMenuState } from '../services/contextMenuService.js';
  import { Copy, Clipboard, Scissors, Trash2, Download, Image as ImageIcon, Search, Volume2, ExternalLink, Link as LinkIcon, Share2, CheckSquare2, Maximize2, Info, Eye, Code2, MoreVertical } from 'lucide-svelte';
  import { showSuccess, showError, showInfo } from '../services/toastService.js';
  import { devMode } from '../stores/devMode.js';

  let menuElement;
  let isVisible = false;
  let position = { x: 0, y: 0 };
  let menuItems = [];
  
  // Cleanup handlers per scroll e resize
  let scrollHandler = null;
  let resizeHandler = null;
  let viewportResizeHandler = null;

  // Aggiorna il menu quando cambia lo stato
  $: {
    if ($contextMenuState.visible) {
      isVisible = true;
      position = $contextMenuState.position;
      updateMenuItems();
      // Usa doppio tick per assicurarsi che il DOM sia aggiornato
      setTimeout(() => {
        adjustMenuPosition();
        // Ricalcola dopo un breve delay per gestire animazioni
        setTimeout(() => adjustMenuPosition(), 50);
      }, 0);
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

    // Controlla se il testo selezionato è un URL
    const selectedText = hasTextSelection ? selection.toString().trim() : '';
    const isUrl = selectedText && /^https?:\/\/.+/.test(selectedText);

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

    // Seleziona tutto (solo per input/textarea)
    if (isInput && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      items.push({
        id: 'select-all',
        label: 'Seleziona tutto',
        icon: CheckSquare2,
        action: () => selectAll(activeElement)
      });
    }

    // Funzioni per testo selezionato
    if (hasTextSelection && !isImage) {
      // Divider prima delle funzioni avanzate
      items.push({ id: 'divider' });

      // Cerca su Brave
      items.push({
        id: 'search-brave',
        label: 'Cerca su Brave',
        icon: Search,
        action: () => searchBrave(selectedText)
      });

      // Leggi ad alta voce
      if ('speechSynthesis' in window) {
        items.push({
          id: 'read-aloud',
          label: 'Leggi ad alta voce',
          icon: Volume2,
          action: () => readAloud(selectedText)
        });
      }

      // Se è un URL, aggiungi opzioni link
      if (isUrl) {
        items.push({
          id: 'open-link',
          label: 'Apri link',
          icon: ExternalLink,
          action: () => openLink(selectedText)
        });
        items.push({
          id: 'copy-link',
          label: 'Copia link',
          icon: LinkIcon,
          action: () => copyText(selectedText)
        });
      }

      // Condividi testo
      if (navigator.share) {
        items.push({
          id: 'share-text',
          label: 'Condividi',
          icon: Share2,
          action: () => shareText(selectedText)
        });
      }
    }

    // Opzioni immagine
    if (isImage && imgElement) {
      if (items.length > 0) {
        items.push({ id: 'divider' });
      }
      
      // Apri immagine in nuova scheda
      items.push({
        id: 'open-image-new-tab',
        label: 'Apri in nuova scheda',
        icon: ExternalLink,
        action: () => openImageInNewTab(imgElement)
      });
      
      // Visualizza immagine a schermo intero
      items.push({
        id: 'view-image-fullscreen',
        label: 'Visualizza a schermo intero',
        icon: Maximize2,
        action: () => viewImageFullscreen(imgElement)
      });
      
      // Copia URL immagine
      if (imgElement.src) {
        items.push({
          id: 'copy-image-url',
          label: 'Copia URL immagine',
          icon: LinkIcon,
          action: () => copyImageUrl(imgElement)
        });
      }
      
      // Cerca immagine (reverse image search)
      items.push({
        id: 'search-image',
        label: 'Cerca immagine su Brave',
        icon: Search,
        action: () => searchImage(imgElement)
      });
      
      // Informazioni immagine
      items.push({
        id: 'image-info',
        label: 'Informazioni immagine',
        icon: Info,
        action: () => showImageInfo(imgElement)
      });
      
      items.push({ id: 'divider' });
      
      // Copia immagine
      items.push({
        id: 'copy-image',
        label: 'Copia immagine',
        icon: ImageIcon,
        action: () => copyImage(imgElement)
      });
      
      // Condividi immagine (se supportato)
      if (navigator.share) {
        items.push({
          id: 'share-image',
          label: 'Condividi immagine',
          icon: Share2,
          action: () => shareImage(imgElement)
        });
      }
      
      // Scarica immagine
      items.push({
        id: 'download-image',
        label: 'Scarica immagine',
        icon: Download,
        action: () => downloadImage(imgElement)
      });
    }

    // Opzioni Dev Mode (solo se dev mode è attivo)
    if ($devMode) {
      if (items.length > 0) {
        items.push({ id: 'divider' });
      }
      
      items.push({
        id: 'dev-tools',
        label: 'Impostazioni sviluppatore',
        icon: Code2,
        action: () => openDevTools()
      });
      
      items.push({
        id: 'browser-menu',
        label: 'Menu del browser',
        icon: MoreVertical,
        action: () => showBrowserMenu()
      });
    }

    menuItems = items;
  }

  function adjustMenuPosition() {
    if (!menuElement) return;
    
    // Usa requestAnimationFrame per assicurarsi che il menu sia renderizzato
    requestAnimationFrame(() => {
      if (!menuElement) return;
      
      const rect = menuElement.getBoundingClientRect();
      
      // Usa visualViewport se disponibile (per mobile con tastiera virtuale)
      const viewport = window.visualViewport || window;
      const viewportWidth = viewport.width || window.innerWidth;
      const viewportHeight = viewport.height || window.innerHeight;
      
      // Ottieni safe area insets
      const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) || 0;
      const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0;
      const safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)')) || 0;
      const safeAreaRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)')) || 0;
      
      // Determina se siamo su mobile
      const isMobile = window.innerWidth <= 768;
      const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
      
      // Margini in base al dispositivo
      const margin = isMobile ? 16 : isTablet ? 12 : 8;
      
      let x = position.x;
      let y = position.y;
      
      // Su mobile, posiziona meglio il menu
      if (isMobile) {
        // Prova a centrare orizzontalmente se possibile
        const menuWidth = rect.width || 280;
        const centerX = viewportWidth / 2;
        const idealX = centerX - (menuWidth / 2);
        
        // Verifica se il menu centrato sta nei limiti
        if (idealX >= safeAreaLeft + margin && idealX + menuWidth <= viewportWidth - safeAreaRight - margin) {
          x = idealX;
        } else {
          // Altrimenti posiziona normalmente
          if (x + menuWidth > viewportWidth - safeAreaRight - margin) {
            x = viewportWidth - menuWidth - safeAreaRight - margin;
          }
          if (x < safeAreaLeft + margin) {
            x = safeAreaLeft + margin;
          }
        }
        
        // Posiziona verticalmente sopra o sotto il punto di tocco
        const menuHeight = rect.height || 200;
        const spaceBelow = viewportHeight - y - safeAreaBottom;
        const spaceAbove = y - safeAreaTop;
        
        if (spaceBelow < menuHeight + margin && spaceAbove > spaceBelow) {
          // Menu sopra il punto di tocco
          y = y - menuHeight - 10;
          if (y < safeAreaTop + margin) {
            y = safeAreaTop + margin;
          }
        } else {
          // Menu sotto il punto di tocco
          y = y + 10;
          if (y + menuHeight > viewportHeight - safeAreaBottom - margin) {
            y = viewportHeight - menuHeight - safeAreaBottom - margin;
          }
        }
      } else {
        // Desktop/Tablet: posizionamento normale
        if (x + rect.width > viewportWidth - safeAreaRight - margin) {
          x = viewportWidth - rect.width - safeAreaRight - margin;
        }
        if (y + rect.height > viewportHeight - safeAreaBottom - margin) {
          y = viewportHeight - rect.height - safeAreaBottom - margin;
        }
        if (x < safeAreaLeft + margin) {
          x = safeAreaLeft + margin;
        }
        if (y < safeAreaTop + margin) {
          y = safeAreaTop + margin;
        }
      }
      
      menuElement.style.left = `${x}px`;
      menuElement.style.top = `${y}px`;
    });
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

  function openImageInNewTab(img) {
    try {
      window.open(img.src, '_blank', 'noopener,noreferrer');
      showSuccess('Immagine aperta in nuova scheda!');
    } catch (error) {
      console.error('Errore apertura immagine:', error);
      showError('Errore durante l\'apertura dell\'immagine');
    }
    closeMenu();
  }

  function viewImageFullscreen(img) {
    try {
      // Crea un overlay fullscreen per visualizzare l'immagine
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      `;

      const fullscreenImg = document.createElement('img');
      fullscreenImg.src = img.src;
      fullscreenImg.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      `;

      overlay.appendChild(fullscreenImg);
      document.body.appendChild(overlay);

      // Chiudi al click
      overlay.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });

      // Chiudi con ESC
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          document.body.removeChild(overlay);
          document.removeEventListener('keydown', handleEsc);
        }
      };
      document.addEventListener('keydown', handleEsc);

      showSuccess('Visualizzazione a schermo intero');
    } catch (error) {
      console.error('Errore visualizzazione fullscreen:', error);
      showError('Errore durante la visualizzazione');
    }
    closeMenu();
  }

  async function copyImageUrl(img) {
    try {
      await navigator.clipboard.writeText(img.src);
      showSuccess('URL immagine copiato!');
    } catch (error) {
      console.error('Errore copia URL:', error);
      showError('Errore durante la copia dell\'URL');
    }
    closeMenu();
  }

  async function searchImage(img) {
    try {
      // Per la ricerca inversa di immagini, usiamo l'URL dell'immagine
      // Brave Search supporta la ricerca per immagine tramite URL
      const imageUrl = encodeURIComponent(img.src);
      const searchUrl = `https://search.brave.com/images?q=${imageUrl}`;
      
      // Se l'immagine è locale (data URL o blob), dobbiamo prima caricarla
      if (img.src.startsWith('data:') || img.src.startsWith('blob:')) {
        // Converti in blob e carica su un servizio temporaneo, oppure usa un servizio di reverse image search
        // Per semplicità, apriamo la ricerca con un messaggio
        showError('La ricerca inversa richiede un URL pubblico. Usa "Copia URL immagine" se disponibile.');
        closeMenu();
        return;
      }
      
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
      showSuccess('Ricerca immagine avviata!');
    } catch (error) {
      console.error('Errore ricerca immagine:', error);
      showError('Errore durante la ricerca dell\'immagine');
    }
    closeMenu();
  }

  function showImageInfo(img) {
    try {
      const info = {
        'Larghezza': `${img.naturalWidth || img.width}px`,
        'Altezza': `${img.naturalHeight || img.height}px`,
        'URL': img.src.length > 100 ? img.src.substring(0, 100) + '...' : img.src,
        'Alt': img.alt || 'Nessun testo alternativo',
        'Title': img.title || 'Nessun titolo'
      };

      const infoText = Object.entries(info)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      // Mostra le informazioni in un alert o le copia negli appunti
      navigator.clipboard.writeText(infoText).then(() => {
        showSuccess('Informazioni immagine copiate negli appunti!');
      }).catch(() => {
        // Fallback: mostra in console
        console.log('Informazioni immagine:', info);
        showInfo('Informazioni immagine visualizzate nella console');
      });
    } catch (error) {
      console.error('Errore informazioni immagine:', error);
      showError('Errore durante il recupero delle informazioni');
    }
    closeMenu();
  }

  async function shareImage(img) {
    if (!navigator.share) {
      showError('Condivisione non supportata');
      closeMenu();
      return;
    }

    try {
      // Converti l'immagine in blob per la condivisione
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.crossOrigin = 'anonymous';
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            const file = new File([blob], 'image.png', { type: 'image/png' });
            await navigator.share({
              title: 'Immagine condivisa',
              files: [file]
            });
            showSuccess('Immagine condivisa!');
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error('Errore condivisione:', error);
              // Fallback: scarica l'immagine
              downloadImage(img);
            }
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('Errore condivisione immagine:', error);
      showError('Errore durante la condivisione');
    }
    closeMenu();
  }

  function openDevTools() {
    try {
      // Prova a triggerare l'apertura delle DevTools
      // Nota: per motivi di sicurezza, i browser non permettono di aprire le DevTools programmaticamente
      // Quindi mostriamo un messaggio e proviamo alcuni metodi alternativi
      
      // Metodo 1: Prova a dispatchare un evento (non funziona in tutti i browser)
      const event = new KeyboardEvent('keydown', {
        key: 'F12',
        code: 'F12',
        keyCode: 123,
        which: 123,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
      
      // Metodo 2: Mostra messaggio con istruzioni
      showInfo('Premi F12 o Ctrl+Shift+I (Cmd+Option+I su Mac) per aprire le DevTools');
      
      // Metodo 3: Mostra informazioni utili nella console
      console.log('%c🔧 Dev Tools', 'color: #00ff00; font-size: 16px; font-weight: bold;');
      console.log('%cConsole sviluppatore aperta!', 'color: #00ff00; font-size: 14px;');
      console.log('%cComandi utili:', 'color: #ff9900; font-size: 12px; font-weight: bold;');
      console.log('  - $0: elemento selezionato');
      console.log('  - console.clear(): pulisci la console');
      console.log('  - console.table(data): mostra dati in tabella');
      console.log('  - debugger: punto di interruzione');
      
      // Metodo 4: Prova a usare eval per aprire (solo per debug, non funziona sempre)
      // Non usiamo questo metodo per sicurezza
      
    } catch (error) {
      console.error('Errore apertura DevTools:', error);
      showError('Impossibile aprire le DevTools automaticamente. Premi F12 manualmente.');
    }
    closeMenu();
  }

  function showBrowserMenu() {
    try {
      // Chiudi il menu personalizzato
      closeMenu();
      
      const target = $contextMenuState.target || document.body;
      const pos = $contextMenuState.position;
      
      // Mostra istruzioni
      showInfo('Tieni premuto Shift e fai click destro per vedere il menu del browser');
      
      // Mostra informazioni nella console
      console.log('%c🌐 Menu del Browser', 'color: #00ff00; font-size: 16px; font-weight: bold;');
      console.log('%cPer vedere il menu del browser:', 'color: #00ff00; font-size: 14px;');
      console.log('  - Tieni premuto Shift mentre fai click destro');
      console.log('  - Il menu del browser contiene opzioni come:');
      console.log('    • Ispeziona elemento');
      console.log('    • Visualizza sorgente pagina');
      console.log('    • Salva come...');
      console.log('    • Stampa');
      console.log('    • E altre opzioni del browser');
      
      // Prova a dispatchare un nuovo evento contextmenu con Shift premuto
      // Nota: questo potrebbe non funzionare perfettamente in tutti i browser
      setTimeout(() => {
        const contextMenuEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: pos.x,
          clientY: pos.y,
          button: 2, // Tasto destro
          buttons: 2,
          shiftKey: true // Simula Shift premuto
        });
        
        // Prova a dispatchare l'evento
        try {
          target.dispatchEvent(contextMenuEvent);
        } catch (e) {
          // Se non funziona, mostra solo il messaggio
          console.log('Nota: Usa manualmente Shift+Click destro per vedere il menu del browser');
        }
      }, 200);
      
    } catch (error) {
      console.error('Errore apertura menu browser:', error);
      showError('Usa Shift+Click destro per vedere il menu del browser');
    }
  }

  function closeMenu() {
    contextMenuState.close();
  }

  function selectAll(element) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.select();
      element.focus();
      showSuccess('Testo selezionato!');
    }
    closeMenu();
  }

  function searchBrave(text) {
    const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(text)}`;
    window.open(searchUrl, '_blank');
    closeMenu();
  }

  function readAloud(text) {
    if (!text || !('speechSynthesis' in window)) {
      showError('Sintesi vocale non disponibile');
      closeMenu();
      return;
    }

    try {
      // Ferma qualsiasi sintesi vocale in corso
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onend = () => {
        showSuccess('Lettura completata!');
      };
      
      utterance.onerror = (error) => {
        console.error('Errore sintesi vocale:', error);
        showError('Errore durante la lettura');
      };
      
      window.speechSynthesis.speak(utterance);
      showSuccess('Lettura avviata...');
    } catch (error) {
      console.error('Errore sintesi vocale:', error);
      showError('Errore durante la lettura');
    }
    closeMenu();
  }

  function openLink(url) {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      showSuccess('Link aperto!');
    } catch (error) {
      console.error('Errore apertura link:', error);
      showError('Errore durante l\'apertura del link');
    }
    closeMenu();
  }

  async function shareText(text) {
    if (!navigator.share) {
      // Fallback: copia il testo se la condivisione non è supportata
      try {
        await navigator.clipboard.writeText(text);
        showSuccess('Testo copiato negli appunti!');
      } catch (error) {
        showError('Condivisione non supportata. Errore durante la copia.');
      }
      closeMenu();
      return;
    }

    try {
      await navigator.share({
        title: 'Testo condiviso',
        text: text,
      });
      showSuccess('Testo condiviso!');
    } catch (error) {
      // L'utente ha annullato la condivisione o c'è stato un errore
      if (error.name !== 'AbortError') {
        console.error('Errore condivisione:', error);
        // Fallback: copia il testo
        try {
          await navigator.clipboard.writeText(text);
          showSuccess('Testo copiato negli appunti!');
        } catch (copyError) {
          showError('Errore durante la condivisione');
        }
      }
    }
    closeMenu();
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
    
    // Gestisci scroll e resize con debounce per performance
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (isVisible) {
          adjustMenuPosition();
        }
      }, 50);
    };
    
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (isVisible) {
          adjustMenuPosition();
        } else {
          closeMenu();
        }
      }, 100);
    };
    
    // Gestisci visualViewport per mobile (tastiera virtuale)
    let viewportResizeTimeout;
    const handleViewportResize = () => {
      clearTimeout(viewportResizeTimeout);
      viewportResizeTimeout = setTimeout(() => {
        if (isVisible) {
          adjustMenuPosition();
        }
      }, 100);
    };
    
    // Salva i cleanup handlers in variabili a livello di componente
    scrollHandler = handleScroll;
    resizeHandler = handleResize;
    viewportResizeHandler = handleViewportResize;
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Visual viewport per mobile
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleScroll, { passive: true });
    }
  });

  onDestroy(() => {
    document.removeEventListener('mousedown', handleBackdropClick);
    document.removeEventListener('touchstart', handleBackdropTouch);
    document.removeEventListener('keydown', handleKeyDown);
    
    // Rimuovi listener scroll e resize usando i cleanup handlers salvati
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }
    if (viewportResizeHandler && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', viewportResizeHandler);
      window.visualViewport.removeEventListener('scroll', scrollHandler);
    }
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
    max-width: 90vw;
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
    /* Preveni selezione testo durante il drag */
    user-select: none;
    -webkit-user-select: none;
    /* Ottimizzazioni performance */
    will-change: transform, opacity;
    contain: layout style paint;
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

  /* Tablet optimizations */
  @media (min-width: 769px) and (max-width: 1024px) {
    .context-menu {
      min-width: 220px;
      padding: 10px;
      max-width: 400px;
      /* Riduci blur su tablet per performance */
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .menu-item {
      min-height: 48px;
      padding: 14px 18px;
      font-size: 15px;
    }

    .menu-item :global(svg) {
      width: 18px;
      height: 18px;
    }
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .context-menu {
      min-width: 280px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 32px);
      padding: 12px 8px;
      border-radius: var(--md-sys-shape-corner-large);
      box-shadow: var(--md-sys-elevation-level4);
      /* Supporto safe area per iOS */
      margin-left: env(safe-area-inset-left);
      margin-right: env(safe-area-inset-right);
      /* Riduci blur su mobile per performance */
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      /* Scroll se il menu è troppo lungo */
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .menu-item {
      min-height: 56px;
      padding: 16px 20px;
      font-size: 16px;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      border-radius: var(--md-sys-shape-corner-medium);
      margin: 2px 4px;
    }

    .menu-item:active {
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      transform: scale(0.97);
      transition: transform 0.1s ease;
    }

    .menu-item :global(svg) {
      width: 20px;
      height: 20px;
    }

    .menu-divider {
      margin: 6px 8px;
    }
  }

  /* Small mobile devices */
  @media (max-width: 480px) {
    .context-menu {
      min-width: calc(100vw - 24px);
      max-width: calc(100vw - 24px);
      padding: 10px 6px;
    }

    .menu-item {
      min-height: 52px;
      padding: 14px 16px;
      font-size: 15px;
      margin: 2px 2px;
    }

    .menu-item :global(svg) {
      width: 18px;
      height: 18px;
    }
  }

  /* Landscape mobile */
  @media (max-width: 768px) and (orientation: landscape) {
    .context-menu {
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .menu-item {
      min-height: 48px;
      padding: 12px 18px;
    }
  }

  /* Touch device optimizations */
  @media (hover: none) and (pointer: coarse) {
    .menu-item:hover {
      background-color: transparent;
    }

    .menu-item:active {
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }
  }

  /* High DPI displays */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .context-menu {
      border-width: 0.5px;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .context-menu {
      animation: none;
    }

    .menu-item {
      transition: none;
    }

    .menu-item:active {
      transform: none;
    }
  }
</style>