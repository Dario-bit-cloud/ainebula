// Servizio per il riconoscimento vocale e TTS

let recognition = null;
let isListening = false;
let shouldAutoRestart = false;
let speechSynthesis = null;
let currentUtterance = null;
let currentAccumulatedText = ''; // Testo accumulato disponibile per invio manuale

// Inizializza Speech Synthesis
if (typeof window !== 'undefined') {
  speechSynthesis = window.speechSynthesis;
}

export function initVoiceRecognition(onResult, onError, onInterimResult = null) {
  if (typeof window === 'undefined') return null;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('Speech recognition not supported');
    return null;
  }
  
  recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.continuous = true; // Modalità continua per rilevare fine frase
  recognition.interimResults = true; // Risultati intermedi per feedback visivo
  
  let finalTranscript = '';
  let accumulatedTranscript = ''; // Accumula tutto il testo
  let silenceTimeout = null;
  
  recognition.onresult = (event) => {
    let interimTranscript = '';
    
    // Reset timeout silenzio ogni volta che c'è attività
    if (silenceTimeout) {
      clearTimeout(silenceTimeout);
      silenceTimeout = null;
    }
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        // Accumula i risultati finali
        finalTranscript += transcript + ' ';
        accumulatedTranscript = finalTranscript; // Aggiorna il testo accumulato
      } else {
        // Risultati intermedi
        interimTranscript += transcript;
      }
    }
    
    // Combina risultati finali e intermedi per il feedback visivo
    const displayText = finalTranscript + interimTranscript;
    
    // Aggiorna il testo accumulato globale per accesso esterno
    if (interimTranscript) {
      accumulatedTranscript = finalTranscript + interimTranscript;
      currentAccumulatedText = accumulatedTranscript;
    } else if (finalTranscript) {
      accumulatedTranscript = finalTranscript;
      currentAccumulatedText = accumulatedTranscript;
    }
    
    // Callback per risultati intermedi (feedback visivo) - mostra tutto il testo
    if (onInterimResult && displayText.trim()) {
      onInterimResult(displayText.trim());
    }
    
    // Invia automaticamente dopo 3 secondi di silenzio
    silenceTimeout = setTimeout(() => {
      // Invia il testo accumulato solo dopo silenzio
      if (accumulatedTranscript.trim()) {
        const textToSend = accumulatedTranscript.trim();
        finalTranscript = '';
        accumulatedTranscript = '';
        currentAccumulatedText = '';
        onResult(textToSend);
      }
      silenceTimeout = null;
    }, 3000); // 3 secondi di silenzio = fine frase
  };
  
  recognition.onerror = (event) => {
    if (silenceTimeout) {
      clearTimeout(silenceTimeout);
    }
    // Non riavviare automaticamente in caso di errore
    shouldAutoRestart = false;
    onError(event.error);
  };
  
  recognition.onend = () => {
    if (silenceTimeout) {
      clearTimeout(silenceTimeout);
    }
    isListening = false;
    
    // Riavvia automaticamente solo se dovrebbe
    if (shouldAutoRestart && recognition) {
      setTimeout(() => {
        if (shouldAutoRestart && !isListening) {
          try {
            recognition.start();
          } catch (e) {
            // Ignora errori di riavvio (potrebbe essere già in esecuzione)
            console.log('Recognition already started or error:', e);
          }
        }
      }, 100);
    }
  };
  
  recognition.onstart = () => {
    isListening = true;
  };
  
  return recognition;
}

export function startListening() {
  if (recognition && !isListening) {
    shouldAutoRestart = true;
    isListening = true;
    try {
      recognition.start();
    } catch (e) {
      // Potrebbe essere già in esecuzione
      console.log('Recognition start error:', e);
      isListening = false;
    }
  }
}

export function stopListening() {
  if (recognition) {
    shouldAutoRestart = false;
    isListening = false;
    try {
      recognition.stop();
    } catch (e) {
      console.log('Recognition stop error:', e);
    }
  }
}

export function getCurrentTranscript() {
  return currentAccumulatedText || '';
}

export function clearCurrentTranscript() {
  currentAccumulatedText = '';
}

export function isListeningActive() {
  return isListening;
}

export function isVoiceAvailable() {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export async function requestMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Chiudi lo stream immediatamente, serve solo per richiedere il permesso
    stream.getTracks().forEach(track => track.stop());
    return { success: true };
  } catch (error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return { success: false, error: 'permission-denied' };
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return { success: false, error: 'no-device' };
    } else {
      return { success: false, error: 'unknown' };
    }
  }
}

export async function checkMicrophonePermission() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasMicrophone = devices.some(device => device.kind === 'audioinput');
    if (!hasMicrophone) {
      return { available: false, error: 'no-device' };
    }
    
    // Prova a richiedere il permesso
    const result = await requestMicrophonePermission();
    return { available: result.success, error: result.error };
  } catch (error) {
    return { available: false, error: 'unknown' };
  }
}

// Funzioni per Text-to-Speech
export function speakText(text, voiceId = null, onEnd = null) {
  if (!speechSynthesis || typeof window === 'undefined') {
    console.warn('Speech synthesis not available');
    return;
  }
  
  // Ferma eventuali sintesi in corso
  stopSpeaking();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'it-IT';
  utterance.rate = 1.25; // Velocità aumentata da 1.0 a 1.25 (25% più veloce)
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // Funzione per selezionare la voce
  const selectVoice = () => {
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Se le voci non sono ancora caricate, aspetta
      setTimeout(selectVoice, 100);
      return;
    }
    
    // Filtra voci italiane
    const italianVoices = voices.filter(v => v.lang.startsWith('it'));
    
    if (italianVoices.length > 0) {
      // Se c'è un voiceId specifico, prova a trovarlo
      if (voiceId) {
        const selectedVoice = italianVoices.find(v => 
          v.name.toLowerCase().includes(voiceId.toLowerCase()) ||
          v.name.toLowerCase().includes('female') && (voiceId === 'vale' || voiceId === 'ember' || voiceId === 'juniper') ||
          v.name.toLowerCase().includes('male') && (voiceId === 'cove' || voiceId === 'arbor' || voiceId === 'spruce')
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        } else {
          // Usa la prima voce italiana disponibile
          utterance.voice = italianVoices[0];
        }
      } else {
        // Usa la prima voce italiana disponibile
        utterance.voice = italianVoices[0];
      }
    }
    
    // Avvia la sintesi
    currentUtterance = utterance;
    speechSynthesis.speak(utterance);
  };
  
  utterance.onend = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };
  
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
    currentUtterance = null;
    if (onEnd) onEnd();
  };
  
  // Seleziona la voce e avvia
  selectVoice();
}

export function stopSpeaking() {
  if (speechSynthesis) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking() {
  return speechSynthesis && speechSynthesis.speaking;
}

export function getAvailableVoices() {
  if (!speechSynthesis || typeof window === 'undefined') {
    return [];
  }
  
  // Carica le voci se non sono ancora disponibili
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.addEventListener('voiceschanged', () => {
      // Le voci sono ora disponibili
    });
  }
  
  return speechSynthesis.getVoices().filter(voice => voice.lang.startsWith('it'));
}

// Mappa le voci personalizzate alle voci del sistema
export function mapVoiceToSystemVoice(voiceId) {
  const voiceMap = {
    'vale': 'it',
    'ember': 'it',
    'cove': 'it',
    'arbor': 'it',
    'juniper': 'it',
    'spruce': 'it'
  };
  
  return voiceMap[voiceId] || 'it';
}

