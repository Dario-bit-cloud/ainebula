import { marked } from 'marked';
import hljs from 'highlight.js';
// Usa il tema GitHub Dark come base, poi sovrascriveremo con colori VS Code personalizzati
import 'highlight.js/styles/github-dark.css';

// Configura marked per usare highlight.js per il codice
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {
        console.error('Error highlighting code:', err);
      }
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

// Normalizza il testo rimuovendo spazi extra alla fine di ogni riga
export function normalizeTextSpacing(text) {
  if (!text) return '';
  // Rimuove spazi e tab alla fine di ogni riga, mantenendo solo il carattere di nuova riga
  return text.replace(/[ \t]+$/gm, '');
}

// Rileva se il contenuto contiene HTML non escapato che dovrebbe essere mostrato come codice
function detectUnescapedHTML(content) {
  if (!content) return false;
  
  // Verifica che non sia già dentro un blocco di codice markdown
  const hasCodeBlock = /```[\s\S]*?```/.test(content) || /`[^`]+`/.test(content);
  if (hasCodeBlock) return false;
  
  // Tag HTML comuni che indicano codice HTML completo
  const htmlTags = [
    /<html[\s>]/i,
    /<head[\s>]/i,
    /<body[\s>]/i,
    /<!DOCTYPE/i,
    /<html>/i,
    /<\/html>/i
  ];
  
  // Verifica se contiene tag HTML strutturali
  const hasHTMLTags = htmlTags.some(tag => tag.test(content));
  
  // Verifica se contiene tag HTML multipli (probabilmente codice HTML completo)
  const htmlTagCount = (content.match(/<[a-z][\s>]/gi) || []).length;
  
  // Wrappa se ha tag HTML strutturali o almeno 2 tag HTML (per evitare falsi positivi con singoli tag)
  return hasHTMLTags || htmlTagCount >= 2;
}

// Renderizza markdown in HTML sicuro
export function renderMarkdown(markdown, options = {}) {
  if (!markdown) return '';
  try {
    let processedMarkdown = markdown;
    
    // Verifica se contiene HTML non escapato (per tutti i modelli)
    const hasUnescapedHTML = detectUnescapedHTML(markdown);
    
    // Se rileva HTML non escapato, wrappa in un blocco di codice
    if (hasUnescapedHTML) {
      processedMarkdown = `\`\`\`html\n${markdown}\n\`\`\``;
    }
    
    // Normalizza il testo prima di renderizzarlo
    const normalizedMarkdown = normalizeTextSpacing(processedMarkdown);
    let html = marked.parse(normalizedMarkdown);
    
    // Rimuovi paragrafi vuoti o con solo spazi
    html = html.replace(/<p[^>]*>\s*<\/p>/g, '');
    
    // Normalizza spazi multipli consecutivi nei paragrafi (ma non nel codice)
    html = html.replace(/(<p[^>]*>)([^<]*?)(<\/p>)/g, (match, openTag, content, closeTag) => {
      // Rimuovi spazi multipli e newline multiple, ma mantieni almeno uno spazio
      const normalized = content.replace(/\s+/g, ' ').trim();
      return normalized ? `${openTag}${normalized}${closeTag}` : '';
    });
    
    // Aggiungi pulsanti di copia e header ai blocchi di codice
    // Regex migliorata per catturare pre><code con qualsiasi attributo e linguaggio
    html = html.replace(/<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/g, (match, language, codeContent) => {
      // Escape base del codice per l'attributo data (il testo verrà estratto dal DOM al click)
      // Usiamo un placeholder che verrà sostituito quando necessario
      const escapedCode = codeContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
      // Determina il nome del linguaggio da mostrare
      const langName = language || 'code';
      const langDisplay = langName.charAt(0).toUpperCase() + langName.slice(1);
      
      return `<div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-block-language">${langDisplay}</span>
          <button class="code-copy-button" data-code="${escapedCode}" title="Copia codice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span class="copy-text">Copia</span>
          </button>
        </div>
        ${match}
      </div>`;
    });
    
    return html;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return markdown; // Fallback a testo normale
  }
}

// Funzione per mostrare un toast di notifica
function showCopyToast() {
  // Usa il toast service se disponibile
  if (typeof window !== 'undefined' && window.showToastSuccess) {
    window.showToastSuccess('Codice copiato!');
  } else {
    // Fallback al metodo originale
    const existingToast = document.querySelector('.copy-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = '✓ Codice copiato!';
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Inizializza i pulsanti di copia usando event delegation
export function initCodeCopyButtons(container) {
  if (!container) return;
  
  // Rimuovi listener esistenti per evitare duplicati
  if (container._copyButtonHandler) {
    container.removeEventListener('click', container._copyButtonHandler);
  }
  
  // Usa event delegation - più robusto
  container._copyButtonHandler = async (e) => {
    // Verifica se il click è su un pulsante di copia o su un elemento dentro di esso
    const button = e.target.closest('.code-copy-button');
    if (!button) return;
    
    console.log('Pulsante copia cliccato!', button);
    
    e.stopPropagation();
    e.preventDefault();
    
    // Trova il blocco di codice associato
    const wrapper = button.closest('.code-block-wrapper');
    if (!wrapper) {
      console.error('Wrapper non trovato');
      return;
    }
    
    const codeElement = wrapper.querySelector('code');
    if (!codeElement) {
      console.error('Elemento code non trovato');
      return;
    }
    
    // Estrai il testo puro dal codice (rimuove HTML entities e span di highlight.js)
    // Usa textContent per ottenere tutto il testo senza HTML - questo è il metodo più affidabile
    let codeText = '';
    
    // Prova prima con textContent (rimuove automaticamente tutti i tag HTML)
    if (codeElement) {
      codeText = codeElement.textContent || codeElement.innerText || '';
    }
    
    // Se non c'è testo, prova a decodificare dall'attributo data-code
    if (!codeText || codeText.trim() === '') {
      const dataCode = button.getAttribute('data-code');
      if (dataCode) {
        // Crea un elemento temporaneo per decodificare HTML entities
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = dataCode;
        codeText = tempDiv.textContent || tempDiv.innerText || '';
        
        // Se ancora vuoto, prova decodifica manuale
        if (!codeText) {
          codeText = dataCode
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/&nbsp;/g, ' ')
            .replace(/&#10;/g, '\n')
            .replace(/&#13;/g, '\r');
        }
      }
    }
    
    if (!codeText || codeText.trim() === '') {
      console.error('Nessun testo da copiare trovato');
      return;
    }
    
    // Rimuovi spazi extra e normalizza
    codeText = codeText.trim();
    
    try {
      // Prova prima con Clipboard API moderna
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeText);
      } else {
        throw new Error('Clipboard API non disponibile');
      }
      
      // Feedback visivo sul pulsante
      const copyText = button.querySelector('.copy-text');
      const originalText = copyText ? copyText.textContent : 'Copia';
      if (copyText) copyText.textContent = 'Copiato!';
      button.classList.add('copied');
      
      // Mostra toast di notifica
      showCopyToast();
      
      setTimeout(() => {
        if (copyText) copyText.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Errore durante la copia:', err);
      // Fallback per browser che non supportano clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = codeText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      
      // Seleziona il testo
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        // Per iOS
        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        textarea.setSelectionRange(0, 999999);
      } else {
        textarea.select();
        textarea.setSelectionRange(0, 99999);
      }
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          // Feedback visivo sul pulsante
          const copyText = button.querySelector('.copy-text');
          const originalText = copyText ? copyText.textContent : 'Copia';
          if (copyText) copyText.textContent = 'Copiato!';
          button.classList.add('copied');
          
          // Mostra toast di notifica
          showCopyToast();
          
          setTimeout(() => {
            if (copyText) copyText.textContent = originalText;
            button.classList.remove('copied');
          }, 2000);
        } else {
          console.error('execCommand copy fallito');
          // Non possiamo usare showAlert qui perché è un file utils, usiamo console.error
          console.error('Impossibile copiare il codice. Seleziona manualmente il testo.');
        }
      } catch (fallbackErr) {
        console.error('Errore fallback copia:', fallbackErr);
        // Non possiamo usare showAlert qui perché è un file utils, usiamo console.error
        console.error('Impossibile copiare il codice. Seleziona manualmente il testo.');
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };
  
  // Aggiungi il listener al container
  container.addEventListener('click', container._copyButtonHandler);
}

