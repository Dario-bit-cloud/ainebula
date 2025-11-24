// Servizio AssemblyAI per riconoscimento vocale streaming
import { ASSEMBLYAI_CONFIG } from '../config/api.js';

let socket = null;
let mediaStream = null;
let audioContext = null;
let processor = null;
let isConnected = false;
let isListening = false;
let accumulatedTranscript = '';
let onResultCallback = null;
let onInterimCallback = null;
let onErrorCallback = null;

/**
 * Inizializza il riconoscimento vocale con AssemblyAI
 */
export function initAssemblyAIRecognition(onResult, onError, onInterimResult = null) {
  if (typeof window === 'undefined') return null;
  
  onResultCallback = onResult;
  onErrorCallback = onError;
  onInterimCallback = onInterimResult;
  
  return {
    start: startListening,
    stop: stopListening,
    isActive: () => isListening
  };
}

/**
 * Connette al WebSocket di AssemblyAI
 */
async function connectWebSocket() {
  return new Promise((resolve, reject) => {
    try {
      // AssemblyAI Realtime API v2 - API key come query parameter
      const wsUrl = `${ASSEMBLYAI_CONFIG.wsUrl}?sample_rate=${ASSEMBLYAI_CONFIG.sampleRate}&language_code=${ASSEMBLYAI_CONFIG.language}&token=${ASSEMBLYAI_CONFIG.apiKey}`;
      
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('AssemblyAI WebSocket connected');
        // Invia configurazione iniziale dopo la connessione
        socket.send(JSON.stringify({
          sample_rate: ASSEMBLYAI_CONFIG.sampleRate,
          language_code: ASSEMBLYAI_CONFIG.language,
          format_turns: true
        }));
        isConnected = true;
        resolve();
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onerror = (error) => {
        console.error('AssemblyAI WebSocket error:', error);
        isConnected = false;
        if (onErrorCallback) {
          onErrorCallback('websocket-error');
        }
        reject(error);
      };
      
      socket.onclose = () => {
        console.log('AssemblyAI WebSocket closed');
        isConnected = false;
        isListening = false;
      };
      
    } catch (error) {
      console.error('Error connecting to AssemblyAI:', error);
      reject(error);
    }
  });
}

/**
 * Gestisce i messaggi dal WebSocket
 */
function handleWebSocketMessage(data) {
  // AssemblyAI Realtime API v2 formato
  if (data.message_type === 'SessionBegins') {
    console.log('AssemblyAI session started:', data.session_id);
  } else if (data.message_type === 'PartialTranscript') {
    // Trascrizione parziale (interim)
    const text = data.text || '';
    if (text && onInterimCallback) {
      accumulatedTranscript = text;
      onInterimCallback(text);
    }
  } else if (data.message_type === 'FinalTranscript') {
    // Trascrizione finale
    const text = data.text || '';
    if (text) {
      // Accumula il testo finale
      if (accumulatedTranscript && !accumulatedTranscript.includes(text)) {
        accumulatedTranscript += ' ' + text;
      } else {
        accumulatedTranscript = text;
      }
    }
  } else if (data.message_type === 'Turn') {
    // Fine di un turno di conversazione
    const text = data.text || '';
    if (text && onResultCallback) {
      onResultCallback(text.trim());
      accumulatedTranscript = ''; // Reset dopo invio
    }
  } else if (data.message_type === 'SessionTerminated') {
    console.log('AssemblyAI session terminated');
    isListening = false;
  } else if (data.error) {
    console.error('AssemblyAI error:', data.error);
    if (onErrorCallback) {
      onErrorCallback(data.error);
    }
  }
}

/**
 * Avvia l'ascolto del microfono e streaming ad AssemblyAI
 */
async function startListening() {
  if (isListening) {
    console.log('Already listening');
    return;
  }
  
  try {
    // Connetti al WebSocket
    if (!isConnected) {
      await connectWebSocket();
    }
    
    // Ottieni accesso al microfono
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: ASSEMBLYAI_CONFIG.sampleRate,
        echoCancellation: true,
        noiseSuppression: true
      }
    });
    
    // Crea AudioContext per processare l'audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: ASSEMBLYAI_CONFIG.sampleRate
    });
    
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // Crea ScriptProcessorNode per convertire audio in PCM
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (!isConnected || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      
      const inputData = event.inputBuffer.getChannelData(0);
      
      // Converti Float32Array in Int16Array (PCM)
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        // Clamp e converti a Int16
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Invia audio al WebSocket come base64
      // AssemblyAI richiede l'audio in formato base64
      const base64Audio = btoa(
        String.fromCharCode.apply(null, new Uint8Array(pcmData.buffer))
      );
      
      // Invia come messaggio JSON con audio_data
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          audio_data: base64Audio
        }));
      }
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    isListening = true;
    accumulatedTranscript = '';
    
    console.log('AssemblyAI listening started');
    
  } catch (error) {
    console.error('Error starting AssemblyAI listening:', error);
    isListening = false;
    if (onErrorCallback) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        onErrorCallback('permission-denied');
      } else if (error.name === 'NotFoundError') {
        onErrorCallback('no-device');
      } else {
        onErrorCallback('unknown');
      }
    }
  }
}

/**
 * Ferma l'ascolto
 */
function stopListening() {
  isListening = false;
  
  // Ferma il processore audio
  if (processor) {
    processor.disconnect();
    processor = null;
  }
  
  // Ferma il media stream
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  
  // Chiudi AudioContext
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }
  
  // Chiudi WebSocket
  if (socket) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ terminate_session: true }));
    }
    socket.close();
    socket = null;
  }
  
  isConnected = false;
  accumulatedTranscript = '';
  
  console.log('AssemblyAI listening stopped');
}

/**
 * Verifica se AssemblyAI è disponibile
 */
export function isAssemblyAIAvailable() {
  return typeof window !== 'undefined' && 
         typeof WebSocket !== 'undefined' &&
         typeof AudioContext !== 'undefined' &&
         typeof navigator !== 'undefined' &&
         navigator.mediaDevices !== undefined;
}

/**
 * Ottiene il testo accumulato corrente
 */
export function getCurrentTranscript() {
  return accumulatedTranscript || '';
}

/**
 * Pulisce il testo accumulato
 */
export function clearCurrentTranscript() {
  accumulatedTranscript = '';
}

