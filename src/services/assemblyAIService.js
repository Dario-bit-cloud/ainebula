// Servizio AssemblyAI per riconoscimento vocale streaming
// Basato sulla documentazione ufficiale AssemblyAI v3
// https://www.assemblyai.com/docs/guides/streaming-speech-to-text
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
 * Connette al WebSocket di AssemblyAI v3
 * Segue esattamente la documentazione ufficiale
 */
async function connectWebSocket() {
  return new Promise((resolve, reject) => {
    try {
      // Costruisci parametri come query string (come nella documentazione)
      const params = new URLSearchParams({
        sample_rate: ASSEMBLYAI_CONFIG.sampleRate.toString(),
        format_turns: ASSEMBLYAI_CONFIG.formatTurns.toString(),
        speech_model: ASSEMBLYAI_CONFIG.speechModel
      });
      
      // Aggiungi language_detection se abilitato
      if (ASSEMBLYAI_CONFIG.languageDetection) {
        params.append('language_detection', 'true');
      }
      
      const wsUrl = `${ASSEMBLYAI_CONFIG.wsUrl}?${params.toString()}`;
      
      console.log('Connecting to AssemblyAI:', wsUrl);
      
      // NOTA CRITICA: Nel browser, WebSocket non supporta header personalizzati
      // La documentazione mostra headers solo per Node.js, non per browser
      // Soluzioni possibili:
      // 1. Backend proxy (raccomandato per produzione)
      // 2. Query parameter (non documentato, potrebbe non funzionare)
      // 3. Usare Web Speech API come fallback
      
      // Provo prima con query parameter (non standard ma potrebbe funzionare)
      // Se non funziona, l'app userà automaticamente il fallback a Web Speech API
      const wsUrlWithAuth = `${wsUrl}&token=${ASSEMBLYAI_CONFIG.apiKey}`;
      
      socket = new WebSocket(wsUrlWithAuth);
      
      let connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          socket.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
      
      socket.onopen = () => {
        console.log('AssemblyAI WebSocket connected');
        clearTimeout(connectionTimeout);
        isConnected = true;
        resolve();
      };
      
      socket.onmessage = (event) => {
        try {
          // I messaggi sono JSON (come nella documentazione)
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          // Se non è JSON, potrebbe essere un errore
          console.error('Error parsing WebSocket message:', error, event.data);
          if (onErrorCallback) {
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
 * Formato dalla documentazione: { type: "Begin" | "Turn" | "Termination", ... }
 */
function handleWebSocketMessage(data) {
  const msgType = data.type;
  
  if (msgType === 'Begin') {
    // Sessione iniziata
    const sessionId = data.id;
    const expiresAt = data.expires_at;
    console.log('AssemblyAI session started:', sessionId, 'Expires at:', new Date(expiresAt * 1000));
  } else if (msgType === 'Turn') {
    // Trascrizione di un turno (come nella documentazione)
    const transcript = data.transcript || '';
    const utterance = data.utterance || ''; // Utterance completo (solo per modello multilingue)
    const formatted = data.turn_is_formatted || false;
    const endOfTurn = data.end_of_turn || false;
    
    // Per il modello multilingue, usa utterance se disponibile (già formattato)
    // Altrimenti usa transcript
    const textToShow = utterance || transcript;
    
    if (textToShow) {
      // Mostra sempre la trascrizione (parziale o finale)
      if (onInterimCallback) {
        onInterimCallback(textToShow);
      }
      
      // Accumula il testo
      accumulatedTranscript = textToShow;
      
      // Se è la fine del turno, invia il risultato automaticamente
      if (endOfTurn && textToShow.trim() && onResultCallback) {
        onResultCallback(textToShow.trim());
        accumulatedTranscript = '';
      }
      
      // Log per debug - rilevamento lingua (solo per modello multilingue)
      if (data.language_code) {
        const confidence = ((data.language_confidence || 0) * 100).toFixed(2);
        console.log(`Language detected: ${data.language_code} (confidence: ${confidence}%)`);
      }
    }
  } else if (msgType === 'Termination') {
    // Sessione terminata
    const audioDuration = data.audio_duration_seconds || 0;
    const sessionDuration = data.session_duration_seconds || 0;
    console.log('AssemblyAI session terminated:', {
      audioDuration,
      sessionDuration
    });
    isListening = false;
  } else if (data.error) {
    // Errore
    console.error('AssemblyAI error:', data.error);
    if (onErrorCallback) {
      onErrorCallback(data.error);
    }
  }
}

/**
 * Avvia l'ascolto del microfono e streaming ad AssemblyAI
 * L'audio viene inviato come messaggi BINARI (non JSON!)
 * Come nella documentazione: ws.send(audio_data, websocket.ABNF.OPCODE_BINARY)
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
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    // Crea AudioContext
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: ASSEMBLYAI_CONFIG.sampleRate
    });
    
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // Crea ScriptProcessorNode per processare l'audio
    // Nota: deprecato ma ancora supportato, AudioWorkletNode sarebbe meglio ma più complesso
    // FRAMES_PER_BUFFER = 800 per 50ms di audio (0.05s * 16000Hz)
    // Usiamo 4096 per ~256ms (più efficiente)
    const bufferSize = 4096;
    processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (!isConnected || !socket || socket.readyState !== WebSocket.OPEN || !isListening) {
        return;
      }
      
      try {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Converti Float32Array (-1.0 a 1.0) in Int16Array (PCM 16-bit)
        // Come nella documentazione Python: pyaudio.paInt16
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp e converti a Int16
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // IMPORTANTE: Invia come messaggio BINARIO, non JSON!
        // Come nella documentazione: ws.send(audio_data, websocket.ABNF.OPCODE_BINARY)
        // Nel browser WebSocket, inviamo direttamente l'ArrayBuffer
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(pcmData.buffer);
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
  
  // Chiudi WebSocket (come nella documentazione: invia Terminate)
  if (socket) {
    if (socket.readyState === WebSocket.OPEN) {
      // Invia messaggio di terminazione come nella documentazione
      try {
        socket.send(JSON.stringify({ type: 'Terminate' }));
        // Aspetta un po' prima di chiudere
        setTimeout(() => {
          socket.close();
        }, 500);
      } catch (e) {
        socket.close();
      }
    } else {
      socket.close();
    }
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
