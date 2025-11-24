// Utility per gestire le scorciatoie da tastiera
// Evita conflitti con le scorciatoie del browser

export function isInputElement(element) {
  if (!element) return false;
  const tagName = element.tagName?.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isContentEditable = element.contentEditable === 'true';
  const isInModal = element.closest('.modal-content, .modal-backdrop');
  
  // Se è un input ma non è in un modal e non è readonly, è un input attivo
  if (isInput && !isInModal) {
    const input = element;
    if (input.type === 'text' || input.type === 'search' || input.type === 'email' || 
        input.type === 'password' || input.type === 'url' || !input.type) {
      return !input.readOnly && !input.disabled;
    }
  }
  
  return isContentEditable;
}

export function getKeyString(event) {
  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');
  
  // Normalizza i tasti
  let key = event.key;
  if (key === 'Meta') key = 'Ctrl'; // Cmd su Mac
  if (key === 'Control') key = 'Ctrl';
  
  // Gestisci tasti speciali
  if (key.length === 1) {
    parts.push(key);
  } else {
    // Tasti speciali
    const specialKeys = {
      'Enter': 'Enter',
      'Backspace': 'Backspace',
      'Escape': 'Esc',
      'Esc': 'Esc',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      'Tab': 'Tab',
      'Delete': 'Delete'
    };
    if (specialKeys[key]) {
      parts.push(specialKeys[key]);
    }
  }
  
  return parts.join('+');
}

export function matchesShortcut(event, shortcut) {
  const keyString = getKeyString(event);
  return keyString === shortcut;
}

