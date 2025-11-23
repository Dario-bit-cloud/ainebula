// Stima approssimativa dei token basata su caratteri
// Regola generale: 1 token ≈ 4 caratteri per testo inglese
// Per italiano è leggermente diverso ma usiamo questa approssimazione

export function estimateTokens(text) {
  if (!text) return 0;
  // Rimuovi spazi extra e conta caratteri
  const cleanText = text.trim();
  // Stima: ~1 token per 3-4 caratteri (più conservativo per italiano)
  return Math.ceil(cleanText.length / 3.5);
}

export function estimateMessageTokens(message) {
  let tokens = 0;
  
  if (message.content) {
    tokens += estimateTokens(message.content);
  }
  
  // Immagini aggiungono token (approssimativamente ~85 token per immagine per vision models)
  if (message.images && message.images.length > 0) {
    tokens += message.images.length * 85;
  }
  
  return tokens;
}

export function estimateChatTokens(chatHistory) {
  let totalTokens = 0;
  
  for (const message of chatHistory) {
    totalTokens += estimateMessageTokens(message);
  }
  
  // Aggiungi overhead per system prompt e formattazione
  totalTokens += 100; // Overhead approssimativo
  
  return totalTokens;
}

