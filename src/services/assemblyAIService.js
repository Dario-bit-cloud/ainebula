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
      // AssemblyAI Realtime API v2 - URL corretto con autenticazione
      // L'API key va nell'header Authorization, ma nel browser dobbiamo usare query parameter
      const wsUrl = `${ASSEMBLYAI_CONFIG.wsUrl}?sample_rate=${ASSEMBLYAI_CONFIG.sampleRate}&language_code=${ASSEMBLYAI_CONFIG.language}`;
      
      socket = new WebSocket(wsUrl);
      
      let connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          socket.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000); // 10 secondi timeout
      
      socket.onopen = () => {
        console.log('AssemblyAI WebSocket connected');
        clearTimeout(connectionTimeout);
        
        // Invia autenticazione come primo messaggio
        socket.send(JSON.stringify({
          authorization: ASSEMBLYAI_CONFIG.apiKey
        }));
        
        // Poi invia configurazione
        setTimeout(() => {
          socket.send(JSON.stringify({
            sample_rate: ASSEMBLYAI_CONFIG.sampleRate,
            language_code: ASSEMBLYAI_CONFIG.language,
            format_turns: true,
            word_boost: ['italiano', 'italia'] // Migliora riconoscimento italiano
          }));
        }, 100);
        
        isConnected = true;
        resolve();
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          // Se non è JSON, potrebbe essere un errore di testo
          if (onErrorCallback && event.data) {
            onErrorCallback('parse-error');
          }
        }
      };
      
      socket.onerror = (error) => {
        console.error('AssemblyAI WebSocket error:', error);
        clearTimeout(connectionTimeout);
        isConnected = false;
        if (onErrorCallback) {
          onErrorCallback('websocket-error');
        }
        reject(error);
      };
      
      socket.onclose = (event) => {
        console.log('AssemblyAI WebSocket closed', event.code, event.reason);
        clearTimeout(connectionTimeout);
        isConnected = false;
        isListening = false;
        
        // Se la chiusura non è normale, notifica l'errore
        if (event.code !== 1000 && onErrorCallback) {
          onErrorCallback('connection-closed');
        }
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
  console.log('AssemblyAI message:', data);
  
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
  } else if (data.status) {
    // Messaggi di stato
    console.log('AssemblyAI status:', data.status);
    if (data.status === 'error' && onErrorCallback) {
      onErrorCallback(data.error || 'unknown-error');
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
    // Nota: ScriptProcessorNode è deprecato ma ancora supportato per compatibilità
    const bufferSize = 4096;
    processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (!isConnected || !socket || socket.readyState !== WebSocket.OPEN || !isListening) {
        return;
      }
      
      try {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Converti Float32Array in Int16Array (PCM)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp e converti a Int16
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Converti Int16Array in Uint8Array per base64
        const uint8Array = new Uint8Array(pcmData.buffer);
        
        // Converti in base64 usando un metodo più efficiente
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binary);
        
        // Invia come messaggio JSON con audio_data
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            audio_data: base64Audio
          }));
        }
      } catch (error) {
        console.error('Error processing audio:', error);
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

