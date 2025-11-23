// Servizio per il riconoscimento vocale

let recognition = null;
let isListening = false;

export function initVoiceRecognition(onResult, onError) {
  if (typeof window === 'undefined') return null;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('Speech recognition not supported');
    return null;
  }
  
  recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };
  
  recognition.onerror = (event) => {
    onError(event.error);
  };
  
  recognition.onend = () => {
    isListening = false;
  };
  
  return recognition;
}

export function startListening() {
  if (recognition && !isListening) {
    isListening = true;
    recognition.start();
  }
}

export function stopListening() {
  if (recognition && isListening) {
    isListening = false;
    recognition.stop();
  }
}

export function isVoiceAvailable() {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

