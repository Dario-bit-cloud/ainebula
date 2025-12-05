/**
 * Utility per gestire i cookie in modo sicuro
 */

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni

/**
 * Imposta un cookie di autenticazione in modo sicuro
 */
export function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni
  
  // Costruisci le opzioni del cookie con migliori pratiche di sicurezza
  const cookieOptions = [
    `auth_token=${token}`,
    'HttpOnly', // Previene accesso via JavaScript (XSS protection)
    isProduction ? 'Secure' : '', // Solo su HTTPS in produzione
    'SameSite=Lax', // Previene CSRF (Lax permette GET cross-site, blocca POST)
    `Max-Age=${SESSION_DURATION / 1000}`, // 7 giorni in secondi
    'Path=/',
    // Aggiungi flag per prevenire accesso via JavaScript anche in caso di vulnerabilità
    // Nota: HttpOnly già fa questo, ma è una best practice aggiuntiva
  ].filter(Boolean).join('; ');
  
  res.setHeader('Set-Cookie', cookieOptions);
}

/**
 * Rimuove il cookie di autenticazione
 */
export function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Per eliminare un cookie, dobbiamo impostare tutti gli stessi attributi
  // e impostare Max-Age a 0 o una data nel passato
  const cookieOptions = [
    'auth_token=',
    'HttpOnly',
    isProduction ? 'Secure' : '',
    'SameSite=Lax',
    'Max-Age=0', // Imposta a 0 per eliminare il cookie
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT' // Data nel passato per compatibilità
  ].filter(Boolean).join('; ');
  
  res.setHeader('Set-Cookie', cookieOptions);
}





