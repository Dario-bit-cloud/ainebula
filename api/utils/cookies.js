/**
 * Utility per gestire i cookie in modo sicuro
 */

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni

/**
 * Imposta un cookie di autenticazione in modo sicuro
 */
export function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Costruisci le opzioni del cookie
  const cookieOptions = [
    `auth_token=${token}`,
    'HttpOnly', // Previene accesso via JavaScript
    isProduction ? 'Secure' : '', // Solo su HTTPS in produzione
    'SameSite=Lax', // Previene CSRF
    `Max-Age=${SESSION_DURATION / 1000}`, // 7 giorni in secondi
    'Path=/'
  ].filter(Boolean).join('; ');
  
  res.setHeader('Set-Cookie', cookieOptions);
}

/**
 * Rimuove il cookie di autenticazione
 */
export function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieOptions = [
    'auth_token=',
    'HttpOnly',
    isProduction ? 'Secure' : '',
    'SameSite=Lax',
    'Max-Age=0', // Imposta a 0 per eliminare il cookie
    'Path=/'
  ].filter(Boolean).join('; ');
  
  res.setHeader('Set-Cookie', cookieOptions);
}


