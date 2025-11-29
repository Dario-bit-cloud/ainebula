// Utility per ottimizzazioni mobile

/**
 * Prevenisce lo zoom su input focus (iOS Safari)
 */
export function preventZoomOnInputFocus() {
  if (typeof window === 'undefined') return;
  
  const viewportMeta = document.getElementById('viewport-meta');
  if (!viewportMeta) return;
  
  const originalContent = viewportMeta.content;
  const preventZoomContent = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  const allowZoomContent = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
  
  // Preveni zoom quando un input riceve focus
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      viewportMeta.content = preventZoomContent;
    }
  });
  
  // Ripristina zoom quando l'input perde focus
  document.addEventListener('focusout', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      // Delay per permettere al browser di processare il blur
      setTimeout(() => {
        viewportMeta.content = allowZoomContent;
      }, 100);
    }
  });
}

/**
 * Ottiene l'altezza viewport dinamica (considera la tastiera virtuale)
 */
export function getViewportHeight() {
  if (typeof window === 'undefined') return '100vh';
  
  // Usa CSS custom property per viewport height dinamico
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  return 'calc(var(--vh, 1vh) * 100)';
}

/**
 * Inizializza viewport height dinamico
 */
export function initDynamicViewport() {
  if (typeof window === 'undefined') return;
  
  getViewportHeight();
  
  // Aggiorna su resize e orientation change
  window.addEventListener('resize', getViewportHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(getViewportHeight, 100);
  });
  
  // Aggiorna quando la tastiera virtuale appare/scompare (mobile)
  if ('visualViewport' in window) {
    window.visualViewport.addEventListener('resize', getViewportHeight);
  }
}

/**
 * Verifica se il dispositivo supporta touch
 */
export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Ottiene safe area insets per iOS
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
  
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0')
  };
}

/**
 * Ottimizza scroll performance su mobile
 */
export function optimizeMobileScroll(element) {
  if (!element || typeof window === 'undefined') return;
  
  // Abilita hardware acceleration
  element.style.webkitOverflowScrolling = 'touch';
  element.style.overflowScrolling = 'touch';
  element.style.transform = 'translate3d(0, 0, 0)';
  element.style.willChange = 'scroll-position';
}

/**
 * Previene il pull-to-refresh su mobile (iOS Safari)
 */
export function preventPullToRefresh() {
  if (typeof window === 'undefined') return;
  
  let touchStartY = 0;
  let touchEndY = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    touchEndY = e.touches[0].clientY;
    
    // Previeni pull-to-refresh se si scrolla verso il basso dall'inizio
    if (window.scrollY === 0 && touchEndY > touchStartY) {
      e.preventDefault();
    }
  }, { passive: false });
}

/**
 * Gestisce la tastiera virtuale su mobile
 */
export function handleVirtualKeyboard() {
  if (typeof window === 'undefined' || !isTouchDevice()) return;
  
  const inputElements = document.querySelectorAll('input, textarea');
  
  inputElements.forEach(input => {
    input.addEventListener('focus', () => {
      // Scrolla l'input in vista quando riceve focus
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  });
}




