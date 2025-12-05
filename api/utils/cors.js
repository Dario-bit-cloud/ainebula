/**
 * Utility per gestire CORS in modo sicuro
 * Limita l'accesso ai domini specificati in produzione
 */

const ALLOWED_ORIGINS = [
  'https://ainebula.vercel.app',
  'https://www.ainebula.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

/**
 * Verifica se un'origine è permessa
 */
function isOriginAllowed(origin) {
  if (!origin) return true; // Permetti richieste senza origin (es. Postman, mobile apps)
  
  // In sviluppo, permetti localhost
  if (process.env.NODE_ENV !== 'production') {
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return true;
    }
  }
  
  // In produzione, verifica contro la lista di domini permessi
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Configura gli header CORS per una risposta
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    // In produzione, se l'origine non è permessa, usa il primo dominio permesso
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

/**
 * Gestisce le richieste OPTIONS (preflight)
 */
export function handleCorsPreflight(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(200).end();
    return true;
  }
  return false;
}





