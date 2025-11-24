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

