import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

dotenv.config();

// Helper per logging condizionale (solo in sviluppo)
const isDevelopment = process.env.NODE_ENV !== 'production';
const log = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};
const logError = (...args) => {
  // Gli errori vengono sempre loggati
  console.error(...args);
};
const logWarn = (...args) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni

const app = express();
const PORT = 3001;

// Middleware CORS - permette richieste da localhost e da qualsiasi origine in produzione
app.use(cors({
  origin: function (origin, callback) {
    // Permetti richieste senza origin (es. Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    // Permetti localhost su qualsiasi porta
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // In produzione, potresti voler limitare a domini specifici
    // Per ora permettiamo tutte le origini
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware per loggare tutte le richieste (solo in sviluppo)
if (isDevelopment) {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    log(`\nðŸ“¨ [REQUEST] ${req.method} ${req.path}`, {
      timestamp,
      origin: req.get('origin'),
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
    next();
  });
}

// Compression middleware - configurazione conservativa per evitare errori
app.use(compression({
  level: 6, // Livello di compressione (1-9, 6 Ã¨ un buon compromesso)
  filter: (req, res) => {
    // Comprimi solo risposte JSON e testo, non immagini o file binari
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024 // Comprimi solo se la risposta Ã¨ > 1KB
}));

app.use(express.json({ limit: '50mb' })); // Aumenta il limite per le immagini
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser()); // Middleware per leggere i cookie

// Middleware per verificare l'autenticazione
async function authenticateToken(req, res, next) {
  // Prova prima con l'header Authorization
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1]; // Bearer TOKEN
  }
  
  // Se non c'Ã¨ token nell'header, prova con il cookie
  if (!token && req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token non fornito' });
  }

  try {
    // Verifica il token JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verifica che la sessione esista nel database
    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.email, u.username, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;
    
    if (sessions.length === 0) {
      return res.status(401).json({ success: false, message: 'Sessione non valida' });
    }
    
    req.user = {
      id: sessions[0].user_id,
      email: sessions[0].email,
      username: sessions[0].username
    };
    req.session = sessions[0];
    
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token non valido' });
  }
}

// Connessione al database PostgreSQL Neon
// PrioritÃ : DATABASE_URL (con pooling) > DATABASE_URL_UNPOOLED (senza pooling)
const connectionString = process.env.DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  console.error('âŒ Connection string PostgreSQL non trovata!');
  console.error('Configura una di queste variabili d\'ambiente:');
  console.error('  - DATABASE_URL (Neon con pooling)');
  console.error('  - DATABASE_URL_UNPOOLED (Neon senza pooling)');
  process.exit(1);
}

log('âœ… Database PostgreSQL URL configurato');

// Usa @neondatabase/serverless per Neon Database
const sql = neon(connectionString);

// Limite nascosto di 50MB per la cronologia chat per utente
const MAX_CHAT_HISTORY_SIZE = 50 * 1024 * 1024; // 50MB in bytes

/**
 * Applica il limite di 50MB alla cronologia chat dell'utente
 * Rimuove automaticamente i messaggi piÃ¹ vecchi se il limite viene superato
 */
async function enforceChatHistoryLimit(userId) {
  try {
    // Calcola la dimensione totale dei messaggi per l'utente
    const sizeResult = await sql`
      SELECT COALESCE(SUM(octet_length(content)), 0) as total_size
      FROM messages m
      INNER JOIN chats c ON m.chat_id = c.id
      WHERE c.user_id = ${userId}
    `;
    
    const totalSize = parseInt(sizeResult[0]?.total_size || 0);
    
    // Se la dimensione supera il limite, rimuovi i messaggi piÃ¹ vecchi
    if (totalSize > MAX_CHAT_HISTORY_SIZE) {
      logWarn(`âš ï¸ [CHAT LIMIT] Utente ${userId} ha superato il limite: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Ottieni i messaggi ordinati per timestamp (piÃ¹ vecchi prima)
      const messagesToDelete = await sql`
        SELECT m.id, m.chat_id, octet_length(m.content) as size
        FROM messages m
        INNER JOIN chats c ON m.chat_id = c.id
        WHERE c.user_id = ${userId}
        ORDER BY m.timestamp ASC, m.id ASC
      `;
      
      let currentSize = totalSize;
      let deletedCount = 0;
      
      // Elimina i messaggi piÃ¹ vecchi fino a scendere sotto il limite
      for (const msg of messagesToDelete) {
        if (currentSize <= MAX_CHAT_HISTORY_SIZE) {
          break;
        }
        
        await sql`DELETE FROM messages WHERE id = ${msg.id}`;
        currentSize -= parseInt(msg.size || 0);
        deletedCount++;
      }
      
      // Se una chat rimane senza messaggi, elimina anche la chat
      await sql`
        DELETE FROM chats c
        WHERE c.user_id = ${userId}
        AND NOT EXISTS (
          SELECT 1 FROM messages m WHERE m.chat_id = c.id
        )
      `;
      
      log(`âœ… [CHAT LIMIT] Rimossi ${deletedCount} messaggi vecchi. Nuova dimensione: ${(currentSize / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    logError('âŒ [CHAT LIMIT] Errore nell\'applicazione del limite:', error);
    // Non bloccare il salvataggio se c'Ã¨ un errore nel controllo del limite
  }
}

// Endpoint per testare la connessione
app.get('/api/db/test', async (req, res) => {
  try {
    const response = await sql`SELECT version()`;
    const { version } = response[0];
    
    res.json({
      success: true,
      message: 'Connessione al database riuscita!',
      version: version,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore connessione database:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella connessione al database',
      error: error.message
    });
  }
});

// Endpoint per eseguire query personalizzate (solo SELECT per sicurezza)
app.post('/api/db/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query non fornita'
      });
    }
    
    // Verifica che sia una query SELECT (per sicurezza)
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return res.status(400).json({
        success: false,
        message: 'Solo query SELECT sono permesse per sicurezza'
      });
    }
    
    const response = await sql.unsafe(query);
    
    res.json({
      success: true,
      data: response,
      rowCount: response.length
    });
  } catch (error) {
    console.error('Errore esecuzione query:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'esecuzione della query',
      error: error.message
    });
  }
});

// Endpoint per ottenere informazioni sul database
app.get('/api/db/info', async (req, res) => {
  try {
    // Ottieni informazioni sulle tabelle
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    res.json({
      success: true,
      tables: tables.map(t => t.table_name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore recupero info database:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle informazioni',
      error: error.message
    });
  }
});

// ==================== ENDPOINT AUTENTICAZIONE ====================

// DEPRECATO: Sincronizzazione utente Clerk - RIMOSSO
// L'autenticazione ora usa solo Neon Database
// Questo endpoint Ã¨ mantenuto per retrocompatibilitÃ  ma non dovrebbe essere usato
app.post('/api/auth/clerk-sync', async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Clerk Ã¨ stato rimosso. Usa /api/auth/register o /api/auth/login per autenticarti.'
  });
  
  // CLERK NON PIU' SUPPORTATO
});

// Registrazione
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validazione
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username e password sono obbligatori'
      });
    }
    
    // Validazione username
    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Lo username deve essere di almeno 3 caratteri'
      });
    }
    
    // Validazione caratteri username
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Lo username può contenere solo lettere, numeri, underscore e trattini'
      });
    }
    
    // Validazione password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La password deve essere di almeno 6 caratteri'
      });
    }
    
    // Verifica se lo username esiste già
    const existingUsers = await sql`
      SELECT id FROM users WHERE username = ${username.toLowerCase()}
    `;
    
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username già utilizzato'
      });
    }
    
    // Hash della password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Genera ID utente
    const userId = randomBytes(16).toString('hex');
    
    // Crea l'utente
    await sql`
      INSERT INTO users (id, email, username, password_hash, created_at, updated_at, is_active)
      VALUES (
        ${userId},
        ${`${username}@nebula.local`},
        ${username.toLowerCase()},
        ${passwordHash},
        NOW(),
        NOW(),
        true
      )
    `;
    
    // Crea sessione JWT
    const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni
    const sessionToken = jwt.sign(
      { userId, username: username.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const sessionId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    
    // Salva la sessione nel database
    await sql`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at, ip_address, user_agent)
      VALUES (
        ${sessionId},
        ${userId},
        ${sessionToken},
        ${expiresAt.toISOString()},
        NOW(),
        ${req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'},
        ${req.headers['user-agent'] || 'unknown'}
      )
    `;
    
    // Crea impostazioni utente di default
    const settingsId = randomBytes(16).toString('hex');
    await sql`
      INSERT INTO user_settings (id, user_id, created_at, updated_at)
      VALUES (${settingsId}, ${userId}, NOW(), NOW())
    `;
    
    // Crea abbonamento gratuito di default
    const subscriptionId = randomBytes(16).toString('hex');
    await sql`
      INSERT INTO subscriptions (id, user_id, plan, status, started_at, auto_renew)
      VALUES (${subscriptionId}, ${userId}, 'free', 'active', NOW(), false)
    `;
    
    log('✅ [AUTH] Utente registrato:', userId);
    
    // Imposta cookie
    res.cookie('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/'
    });
    
    return res.status(201).json({
      success: true,
      user: {
        id: userId,
        username: username.toLowerCase()
      },
      token: sessionToken
    });
  } catch (error) {
    logError('❌ [AUTH] Errore registrazione:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore durante la registrazione',
      error: error.message
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validazione
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username e password sono obbligatori'
      });
    }
    
    // Trova l'utente per username
    const users = await sql`
      SELECT id, username, password_hash, is_active
      FROM users
      WHERE username = ${username.toLowerCase()}
    `;
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }
    
    const user = users[0];
    
    // Verifica se l'account è attivo
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account disattivato'
      });
    }
    
    // Verifica password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }
    
    // Elimina sessioni scadute
    await sql`
      DELETE FROM sessions
      WHERE user_id = ${user.id} AND expires_at < NOW()
    `;
    
    // Crea nuova sessione JWT
    const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni
    const sessionToken = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const sessionId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    
    // Salva la sessione nel database
    await sql`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at, ip_address, user_agent)
      VALUES (
        ${sessionId},
        ${user.id},
        ${sessionToken},
        ${expiresAt.toISOString()},
        NOW(),
        ${req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'},
        ${req.headers['user-agent'] || 'unknown'}
      )
    `;
    
    // Aggiorna last_login
    await sql`
      UPDATE users
      SET last_login = NOW()
      WHERE id = ${user.id}
    `;
    
    log('✅ [AUTH] Login riuscito:', user.id);
    
    // Imposta cookie
    res.cookie('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/'
    });
    
    // Ottieni abbonamento
    const subscriptions = await sql`
      SELECT * FROM subscriptions 
      WHERE user_id = ${user.id} 
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY started_at DESC
      LIMIT 1
    `;
    
    let subscription = null;
    if (subscriptions.length > 0) {
      const sub = subscriptions[0];
      subscription = {
        active: true,
        plan: sub.plan,
        expiresAt: sub.expires_at ? sub.expires_at.toISOString() : null
      };
    } else {
      subscription = {
        active: false,
        plan: null,
        expiresAt: null
      };
    }
    
    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        subscription: subscription
      },
      token: sessionToken
    });
  } catch (error) {
    logError('❌ [AUTH] Errore login:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore durante il login',
      error: error.message
    });
  }
});

// Verifica sessione corrente
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Ottieni il token dall'header o dal cookie
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }
    
    if (token) {
      await sql`
        DELETE FROM sessions WHERE token = ${token}
      `;
    }
    
    // Cancella il cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    res.json({
      success: true,
      message: 'Logout completato con successo'
    });
  } catch (error) {
    console.error('Errore logout:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il logout',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT AUTENTICAZIONE ====================

// ==================== ENDPOINT PASSKEYS ====================

// Configurazione WebAuthn
// Per produzione su Vercel: usa ainebula.vercel.app
const getRpId = () => {
  if (process.env.WEBAUTHN_RP_ID) {
    return process.env.WEBAUTHN_RP_ID;
  }
  // Per Vercel, usa il dominio principale
  if (process.env.VERCEL_URL) {
    // VERCEL_URL puÃ² essere preview deployments, usa il dominio principale
    return 'ainebula.vercel.app';
  }
  // In produzione, usa il dominio principale
  if (process.env.NODE_ENV === 'production') {
    return 'ainebula.vercel.app';
  }
  return 'localhost';
};

const getOrigin = () => {
  if (process.env.WEBAUTHN_ORIGIN) {
    return process.env.WEBAUTHN_ORIGIN;
  }
  // Per Vercel, usa il dominio principale
  if (process.env.VERCEL_URL || process.env.NODE_ENV === 'production') {
    return 'https://ainebula.vercel.app';
  }
  return 'http://localhost:5173';
};

const rpId = getRpId();
const rpName = process.env.WEBAUTHN_RP_NAME || 'Nebula AI';
const origin = getOrigin();

// Log della configurazione (solo in sviluppo)
if (isDevelopment) {
  log('ðŸ” [WEBAUTHN] Configurazione:', {
    rpId,
    rpName,
    origin,
    nodeEnv: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL
  });
}

// Store temporaneo per le challenge (in produzione usa Redis o database)
const challenges = new Map();

// Helper per generare challenge
function generateChallenge() {
  return randomBytes(32).toString('base64url');
}

// Helper per convertire challenge
function convertChallenge(challenge) {
  return Buffer.from(challenge, 'base64url').toString('base64');
}

// Inizia la registrazione di una passkey
app.post('/api/auth/passkey/register/start', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username obbligatorio'
      });
    }
    
    // Verifica che l'utente esista
    const users = await sql`
      SELECT id, username FROM users WHERE username = ${username.toLowerCase()}
    `;
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    const user = users[0];
    const challenge = generateChallenge();
    challenges.set(`register:${user.id}`, challenge);
    
    // Genera le opzioni di registrazione
    const opts = await SimpleWebAuthnServer.generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userID: user.id,
      userName: user.username,
      userDisplayName: user.username,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: [],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false
      },
      supportedAlgorithmIDs: [-7, -257]
    });
    
    // Salva la challenge
    challenges.set(`register:${user.id}`, opts.challenge);
    
    res.json({
      success: true,
      options: opts
    });
  } catch (error) {
    console.error('Errore passkey register start:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la generazione delle opzioni di registrazione',
      error: error.message
    });
  }
});

// Completa la registrazione di una passkey
app.post('/api/auth/passkey/register/finish', async (req, res) => {
  try {
    const { username, credential } = req.body;
    
    if (!username || !credential) {
      return res.status(400).json({
        success: false,
        message: 'Username e credential obbligatori'
      });
    }
    
    // Trova l'utente
    const users = await sql`
      SELECT id, username FROM users WHERE username = ${username.toLowerCase()}
    `;
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    const user = users[0];
    const expectedChallenge = challenges.get(`register:${user.id}`);
    
    if (!expectedChallenge) {
      return res.status(400).json({
        success: false,
        message: 'Challenge non trovata. Riprova la registrazione.'
      });
    }
    
    // Verifica la registrazione
    let verification;
    try {
      verification = await SimpleWebAuthnServer.verifyRegistrationResponse({
        response: credential,
        expectedChallenge: expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: true
      });
    } catch (error) {
      console.error('Errore verifica registrazione:', error);
      challenges.delete(`register:${user.id}`);
      return res.status(400).json({
        success: false,
        message: 'Errore durante la verifica: ' + error.message
      });
    }
    
    const { verified, registrationInfo } = verification;
    
    if (!verified || !registrationInfo) {
      challenges.delete(`register:${user.id}`);
      return res.status(400).json({
        success: false,
        message: 'Verifica fallita'
      });
    }
    
    // Salva la passkey nel database
    const passkeyId = randomBytes(16).toString('hex');
    const credentialId = isoBase64URL.fromBuffer(registrationInfo.credentialID);
    const publicKey = isoBase64URL.fromBuffer(registrationInfo.credentialPublicKey);
    
    await sql`
      INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, device_name)
      VALUES (${passkeyId}, ${user.id}, ${credentialId}, ${publicKey}, ${registrationInfo.counter || 0}, ${credential.response.userHandle || 'Unknown Device'})
    `;
    
    challenges.delete(`register:${user.id}`);
    
    res.json({
      success: true,
      message: 'Passkey registrata con successo'
    });
  } catch (error) {
    console.error('Errore passkey register finish:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la registrazione della passkey',
      error: error.message
    });
  }
});

// Inizia il login con passkey
app.post('/api/auth/passkey/login/start', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username obbligatorio'
      });
    }
    
    // Trova l'utente e le sue passkeys
    const users = await sql`
      SELECT id, username FROM users WHERE username = ${username.toLowerCase()}
    `;
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    const user = users[0];
    
    const passkeys = await sql`
      SELECT credential_id, counter FROM passkeys WHERE user_id = ${user.id}
    `;
    
    if (passkeys.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nessuna passkey registrata per questo utente'
      });
    }
    
    // Genera challenge
    const opts = await SimpleWebAuthnServer.generateAuthenticationOptions({
      rpID: rpId,
      timeout: 60000,
      allowCredentials: passkeys.map(pk => ({
        id: isoBase64URL.toBuffer(pk.credential_id),
        type: 'public-key',
        transports: ['internal', 'hybrid']
      })),
      userVerification: 'preferred'
    });
    
    // Salva la challenge
    challenges.set(`login:${user.id}`, opts.challenge);
    
    res.json({
      success: true,
      options: opts
    });
  } catch (error) {
    console.error('Errore passkey login start:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la generazione delle opzioni di autenticazione',
      error: error.message
    });
  }
});

// Completa il login con passkey
app.post('/api/auth/passkey/login/finish', async (req, res) => {
  try {
    const { username, credential } = req.body;
    
    if (!username || !credential) {
      return res.status(400).json({
        success: false,
        message: 'Username e credential obbligatori'
      });
    }
    
    // Trova l'utente
    const users = await sql`
      SELECT id, username, email FROM users WHERE username = ${username.toLowerCase()}
    `;
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }
    
    const user = users[0];
    const expectedChallenge = challenges.get(`login:${user.id}`);
    
    if (!expectedChallenge) {
      return res.status(400).json({
        success: false,
        message: 'Challenge non trovata. Riprova il login.'
      });
    }
    
    // Trova la passkey corrispondente
    const credentialId = credential.id;
    const passkeys = await sql`
      SELECT id, credential_id, public_key, counter FROM passkeys WHERE user_id = ${user.id}
    `;
    
    // Il credential_id nel database Ã¨ giÃ  una stringa base64url
    const passkey = passkeys.find(pk => pk.credential_id === credentialId);
    
    if (!passkey) {
      challenges.delete(`login:${user.id}`);
      return res.status(404).json({
        success: false,
        message: 'Passkey non trovata'
      });
    }
    
    // Verifica l'autenticazione
    let verification;
    try {
      verification = await SimpleWebAuthnServer.verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        authenticator: {
          credentialID: isoBase64URL.toBuffer(passkey.credential_id),
          credentialPublicKey: isoBase64URL.toBuffer(passkey.public_key),
          counter: parseInt(passkey.counter) || 0
        },
        requireUserVerification: false
      });
    } catch (error) {
      console.error('Errore verifica autenticazione:', error);
      challenges.delete(`login:${user.id}`);
      return res.status(400).json({
        success: false,
        message: 'Errore durante la verifica: ' + error.message
      });
    }
    
    const { verified, authenticationInfo } = verification;
    
    if (!verified) {
      challenges.delete(`login:${user.id}`);
      return res.status(400).json({
        success: false,
        message: 'Verifica fallita'
      });
    }
    
    // Aggiorna il counter della passkey
    await sql`
      UPDATE passkeys 
      SET counter = ${authenticationInfo.newCounter}, last_used_at = NOW()
      WHERE id = ${passkey.id}
    `;
    
    challenges.delete(`login:${user.id}`);
    
    // Crea sessione JWT (come nel login normale)
    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const sessionId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    
    await sql`
      INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
      VALUES (${sessionId}, ${user.id}, ${sessionToken}, ${expiresAt}, ${req.ip}, ${req.get('user-agent')})
    `;
    
    // Aggiorna last_login
    await sql`
      UPDATE users SET last_login = NOW() WHERE id = ${user.id}
    `;
    
    res.json({
      success: true,
      message: 'Login con passkey completato con successo',
      user: {
        id: user.id,
        username: user.username
      },
      token: sessionToken
    });
  } catch (error) {
    console.error('Errore passkey login finish:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il login con passkey',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT PASSKEYS ====================

// ==================== ENDPOINT CHAT ====================

// Ottieni tutte le chat dell'utente
app.get('/api/chat', authenticateToken, async (req, res) => {
  try {
    const chats = await sql`
      SELECT 
        c.id,
        c.title,
        c.project_id,
        c.created_at,
        c.updated_at,
        c.is_temporary,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'type', m.type,
              'content', m.content,
              'hidden', m.hidden,
              'timestamp', m.timestamp
            ) ORDER BY m.timestamp
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) as messages
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      WHERE c.user_id = ${req.user.id}
        AND c.is_temporary = false
      GROUP BY c.id, c.title, c.project_id, c.created_at, c.updated_at, c.is_temporary
      ORDER BY c.updated_at DESC
    `;
    
    // Formatta le chat per il client
    const formattedChats = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      projectId: chat.project_id,
      messages: chat.messages || [],
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
      isTemporary: chat.is_temporary
    }));
    
    res.json({
      success: true,
      chats: formattedChats
    });
  } catch (error) {
    console.error('Errore recupero chat:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle chat',
      error: error.message
    });
  }
});

// Salva una chat
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { id, title, messages, projectId, isTemporary } = req.body;
    
    if (!id || !title) {
      return res.status(400).json({
        success: false,
        message: 'ID e titolo sono obbligatori'
      });
    }
    
    // Verifica se la chat esiste giÃ 
    const existingChat = await sql`
      SELECT id FROM chats WHERE id = ${id} AND user_id = ${req.user.id}
    `;
    
    if (existingChat.length > 0) {
      // Aggiorna la chat esistente
      await sql`
        UPDATE chats 
        SET title = ${title}, 
            project_id = ${projectId || null}, 
            is_temporary = ${isTemporary || false},
            updated_at = NOW()
        WHERE id = ${id} AND user_id = ${req.user.id}
      `;
    } else {
      // Crea una nuova chat
      await sql`
        INSERT INTO chats (id, user_id, title, project_id, is_temporary, updated_at)
        VALUES (${id}, ${req.user.id}, ${title}, ${projectId || null}, ${isTemporary || false}, NOW())
      `;
    }
    
    // Salva i messaggi
    if (messages && messages.length > 0) {
      // Elimina i messaggi esistenti per questa chat
      await sql`DELETE FROM messages WHERE chat_id = ${id}`;
      
      // Filtra solo i messaggi non nascosti
      const visibleMessages = messages.filter(msg => !msg.hidden);
      
      // Batch insert: inserisci tutti i messaggi in batch (molto piÃ¹ veloce del loop sequenziale)
      if (visibleMessages.length > 0) {
        // Inserisci in batch usando Promise.all per parallelizzare
        // Questo Ã¨ piÃ¹ veloce di un loop sequenziale ma mantiene la compatibilitÃ 
        const insertPromises = visibleMessages.map(msg => 
          sql`
            INSERT INTO messages (chat_id, type, content, hidden, timestamp)
            VALUES (${id}, ${msg.type}, ${msg.content}, ${msg.hidden || false}, ${msg.timestamp || new Date().toISOString()})
          `
        );
        
        // Esegui tutti gli insert in parallelo
        await Promise.all(insertPromises);
      }
    }
    
    // Applica limite di 50MB per utente (nascosto)
    await enforceChatHistoryLimit(req.user.id);
    
    res.json({
      success: true,
      message: 'Chat salvata con successo'
    });
  } catch (error) {
    console.error('Errore salvataggio chat:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel salvataggio della chat',
      error: error.message
    });
  }
});

// Elimina una chat
app.delete('/api/chat/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Verifica che la chat appartenga all'utente
    const chat = await sql`
      SELECT id FROM chats WHERE id = ${chatId} AND user_id = ${req.user.id}
    `;
    
    if (chat.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trovata'
      });
    }
    
    // Elimina la chat (i messaggi verranno eliminati automaticamente per CASCADE)
    await sql`DELETE FROM chats WHERE id = ${chatId}`;
    
    res.json({
      success: true,
      message: 'Chat eliminata con successo'
    });
  } catch (error) {
    console.error('Errore eliminazione chat:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione della chat',
      error: error.message
    });
  }
});

// Aggiorna una chat (titolo, progetto, ecc.)
app.patch('/api/chat/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title, projectId } = req.body;
    
    // Verifica che la chat appartenga all'utente
    const chat = await sql`
      SELECT id FROM chats WHERE id = ${chatId} AND user_id = ${req.user.id}
    `;
    
    if (chat.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trovata'
      });
    }
    
    // Aggiorna la chat
    if (title !== undefined && projectId !== undefined) {
      await sql`
        UPDATE chats 
        SET title = ${title}, project_id = ${projectId}, updated_at = NOW()
        WHERE id = ${chatId}
      `;
    } else if (title !== undefined) {
      await sql`
        UPDATE chats 
        SET title = ${title}, updated_at = NOW()
        WHERE id = ${chatId}
      `;
    } else if (projectId !== undefined) {
      await sql`
        UPDATE chats 
        SET project_id = ${projectId}, updated_at = NOW()
        WHERE id = ${chatId}
      `;
    }
    
    res.json({
      success: true,
      message: 'Chat aggiornata con successo'
    });
  } catch (error) {
    console.error('Errore aggiornamento chat:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento della chat',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT CHAT ====================

// ==================== ENDPOINT PROGETTI ====================

// Ottieni tutti i progetti dell'utente
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await sql`
      SELECT 
        id,
        name,
        description,
        color,
        icon,
        created_at,
        updated_at
      FROM projects
      WHERE user_id = ${req.user.id}
      ORDER BY updated_at DESC
    `;
    
    const formattedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description || '',
      color: project.color,
      icon: project.icon,
      createdAt: project.created_at,
      updatedAt: project.updated_at
    }));
    
    res.json({
      success: true,
      projects: formattedProjects
    });
  } catch (error) {
    console.error('Errore recupero progetti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei progetti',
      error: error.message
    });
  }
});

// Ottieni un singolo progetto
app.get('/api/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const projects = await sql`
      SELECT 
        id,
        name,
        description,
        color,
        icon,
        created_at,
        updated_at
      FROM projects
      WHERE id = ${projectId} AND user_id = ${req.user.id}
    `;
    
    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Progetto non trovato'
      });
    }
    
    const project = projects[0];
    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description || '',
        color: project.color,
        icon: project.icon,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }
    });
  } catch (error) {
    console.error('Errore recupero progetto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del progetto',
      error: error.message
    });
  }
});

// Salva un progetto
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { id, name, description, color, icon } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: 'ID e nome sono obbligatori'
      });
    }
    
    // Verifica se il progetto esiste giÃ 
    const existingProject = await sql`
      SELECT id FROM projects WHERE id = ${id} AND user_id = ${req.user.id}
    `;
    
    if (existingProject.length > 0) {
      // Aggiorna il progetto esistente
      await sql`
        UPDATE projects 
        SET name = ${name}, 
            description = ${description || null}, 
            color = ${color || null}, 
            icon = ${icon || null},
            updated_at = NOW()
        WHERE id = ${id} AND user_id = ${req.user.id}
      `;
    } else {
      // Crea un nuovo progetto
      await sql`
        INSERT INTO projects (id, user_id, name, description, color, icon, created_at, updated_at)
        VALUES (${id}, ${req.user.id}, ${name}, ${description || null}, ${color || null}, ${icon || null}, NOW(), NOW())
      `;
    }
    
    // Recupera il progetto salvato
    const savedProject = await sql`
      SELECT id, name, description, color, icon, created_at, updated_at
      FROM projects
      WHERE id = ${id} AND user_id = ${req.user.id}
    `;
    
    res.json({
      success: true,
      message: 'Progetto salvato con successo',
      project: {
        id: savedProject[0].id,
        name: savedProject[0].name,
        description: savedProject[0].description || '',
        color: savedProject[0].color,
        icon: savedProject[0].icon,
        createdAt: savedProject[0].created_at,
        updatedAt: savedProject[0].updated_at
      }
    });
  } catch (error) {
    console.error('Errore salvataggio progetto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel salvataggio del progetto',
      error: error.message
    });
  }
});

// Aggiorna un progetto
app.patch('/api/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, color, icon } = req.body;
    
    // Verifica che il progetto esista e appartenga all'utente
    const existingProject = await sql`
      SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${req.user.id}
    `;
    
    if (existingProject.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Progetto non trovato'
      });
    }
    
    // Costruisci la query di aggiornamento dinamicamente
    const updateFields = [];
    
    if (name !== undefined) {
      updateFields.push(sql`name = ${name}`);
    }
    if (description !== undefined) {
      updateFields.push(sql`description = ${description}`);
    }
    if (color !== undefined) {
      updateFields.push(sql`color = ${color}`);
    }
    if (icon !== undefined) {
      updateFields.push(sql`icon = ${icon}`);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nessun campo da aggiornare'
      });
    }
    
    // Aggiorna il progetto
    const updateClause = sql.join(updateFields, sql`, `);
    await sql`
      UPDATE projects 
      SET ${updateClause}, updated_at = NOW()
      WHERE id = ${projectId} AND user_id = ${req.user.id}
    `;
    
    // Recupera il progetto aggiornato
    const updatedProject = await sql`
      SELECT id, name, description, color, icon, created_at, updated_at
      FROM projects
      WHERE id = ${projectId} AND user_id = ${req.user.id}
    `;
    
    res.json({
      success: true,
      message: 'Progetto aggiornato con successo',
      project: {
        id: updatedProject[0].id,
        name: updatedProject[0].name,
        description: updatedProject[0].description || '',
        color: updatedProject[0].color,
        icon: updatedProject[0].icon,
        createdAt: updatedProject[0].created_at,
        updatedAt: updatedProject[0].updated_at
      }
    });
  } catch (error) {
    console.error('Errore aggiornamento progetto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del progetto',
      error: error.message
    });
  }
});

// Elimina un progetto
app.delete('/api/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Verifica che il progetto esista e appartenga all'utente
    const existingProject = await sql`
      SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${req.user.id}
    `;
    
    if (existingProject.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Progetto non trovato'
      });
    }
    
    // Rimuovi project_id dalle chat associate (imposta a null)
    await sql`
      UPDATE chats 
      SET project_id = NULL 
      WHERE project_id = ${projectId} AND user_id = ${req.user.id}
    `;
    
    // Elimina il progetto
    await sql`
      DELETE FROM projects 
      WHERE id = ${projectId} AND user_id = ${req.user.id}
    `;
    
    res.json({
      success: true,
      message: 'Progetto eliminato con successo'
    });
  } catch (error) {
    console.error('Errore eliminazione progetto:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del progetto',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT PROGETTI ====================

// ==================== ENDPOINT IMPOSTAZIONI UTENTE ====================

// Ottieni le impostazioni dell'utente
app.get('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await sql`
      SELECT * FROM user_settings WHERE user_id = ${req.user.id}
    `;
    
    if (settings.length === 0) {
      // Crea impostazioni di default se non esistono
      const defaultSettingsId = randomBytes(16).toString('hex');
      await sql`
        INSERT INTO user_settings (id, user_id)
        VALUES (${defaultSettingsId}, ${req.user.id})
      `;
      const newSettings = await sql`
        SELECT * FROM user_settings WHERE user_id = ${req.user.id}
      `;
      return res.json({
        success: true,
        settings: newSettings[0]
      });
    }
    
    res.json({
      success: true,
      settings: settings[0]
    });
  } catch (error) {
    console.error('Errore recupero impostazioni:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle impostazioni',
      error: error.message
    });
  }
});

// Aggiorna le impostazioni dell'utente
app.patch('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const { theme, language, ai_temperature, ai_max_tokens, ai_top_p, ai_frequency_penalty, ai_presence_penalty, default_model, notifications_enabled, email_notifications, auto_save_chats, settings_json } = req.body;
    
    // Verifica se le impostazioni esistono
    const existing = await sql`
      SELECT id FROM user_settings WHERE user_id = ${req.user.id}
    `;
    
    if (existing.length === 0) {
      // Crea impostazioni se non esistono
      const settingsId = randomBytes(16).toString('hex');
      await sql`
        INSERT INTO user_settings (
          id, user_id, theme, language, ai_temperature, ai_max_tokens, 
          ai_top_p, ai_frequency_penalty, ai_presence_penalty, default_model,
          notifications_enabled, email_notifications, auto_save_chats, settings_json
        )
        VALUES (
          ${settingsId}, ${req.user.id}, 
          ${theme || 'system'}, ${language || 'it'}, 
          ${ai_temperature || 0.7}, ${ai_max_tokens || 2000},
          ${ai_top_p || 1.0}, ${ai_frequency_penalty || 0.0}, 
          ${ai_presence_penalty || 0.0}, ${default_model || 'nebula-1.0'},
          ${notifications_enabled !== undefined ? notifications_enabled : true},
          ${email_notifications !== undefined ? email_notifications : false},
          ${auto_save_chats !== undefined ? auto_save_chats : true},
          ${settings_json ? JSON.stringify(settings_json) : null}
        )
      `;
    } else {
      // Aggiorna impostazioni esistenti - costruisci query dinamicamente
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (theme !== undefined) { updates.push(`theme = $${paramIndex++}`); values.push(theme); }
      if (language !== undefined) { updates.push(`language = $${paramIndex++}`); values.push(language); }
      if (ai_temperature !== undefined) { updates.push(`ai_temperature = $${paramIndex++}`); values.push(ai_temperature); }
      if (ai_max_tokens !== undefined) { updates.push(`ai_max_tokens = $${paramIndex++}`); values.push(ai_max_tokens); }
      if (ai_top_p !== undefined) { updates.push(`ai_top_p = $${paramIndex++}`); values.push(ai_top_p); }
      if (ai_frequency_penalty !== undefined) { updates.push(`ai_frequency_penalty = $${paramIndex++}`); values.push(ai_frequency_penalty); }
      if (ai_presence_penalty !== undefined) { updates.push(`ai_presence_penalty = $${paramIndex++}`); values.push(ai_presence_penalty); }
      if (default_model !== undefined) { updates.push(`default_model = $${paramIndex++}`); values.push(default_model); }
      if (notifications_enabled !== undefined) { updates.push(`notifications_enabled = $${paramIndex++}`); values.push(notifications_enabled); }
      if (email_notifications !== undefined) { updates.push(`email_notifications = $${paramIndex++}`); values.push(email_notifications); }
      if (auto_save_chats !== undefined) { updates.push(`auto_save_chats = $${paramIndex++}`); values.push(auto_save_chats); }
      if (settings_json !== undefined) { updates.push(`settings_json = $${paramIndex++}`); values.push(JSON.stringify(settings_json)); }
      
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(req.user.id);
        const query = `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`;
        await sql.unsafe(query, values);
      }
    }
    
    // Restituisci le impostazioni aggiornate
    const updated = await sql`
      SELECT * FROM user_settings WHERE user_id = ${req.user.id}
    `;
    
    res.json({
      success: true,
      settings: updated[0]
    });
  } catch (error) {
    console.error('Errore aggiornamento impostazioni:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento delle impostazioni',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT IMPOSTAZIONI UTENTE ====================

// ==================== BILLING GESTITO DA NEON DATABASE ====================
// Gli abbonamenti sono gestiti completamente dal database Neon
// Tabella: subscriptions
// ==================== FINE BILLING CLERK ====================

// ==================== ENDPOINT LINK CONDIVISI ====================

// Crea tabella shared_links se non esiste
async function ensureSharedLinksTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS shared_links (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        chat_id VARCHAR(255) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        share_token VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(500),
        expires_at TIMESTAMP WITH TIME ZONE,
        access_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_shared_links_user_id ON shared_links(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shared_links_chat_id ON shared_links(chat_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(share_token)`;
    return true;
  } catch (error) {
    console.error('Errore creazione tabella shared_links:', error);
    return false;
  }
}

// Ottieni tutti i link condivisi dell'utente
app.get('/api/shared-links', authenticateToken, async (req, res) => {
  try {
    await ensureSharedLinksTable();
    
    const links = await sql`
      SELECT 
        sl.id,
        sl.chat_id,
        sl.share_token,
        sl.title,
        sl.expires_at,
        sl.access_count,
        sl.is_active,
        sl.created_at,
        c.title as chat_title
      FROM shared_links sl
      JOIN chats c ON sl.chat_id = c.id
      WHERE sl.user_id = ${req.user.id}
      ORDER BY sl.created_at DESC
    `;
    
    res.json({
      success: true,
      links: links.map(link => ({
        id: link.id,
        chatId: link.chat_id,
        shareToken: link.share_token,
        title: link.title || link.chat_title,
        expiresAt: link.expires_at,
        accessCount: link.access_count,
        isActive: link.is_active,
        createdAt: link.created_at,
        chatTitle: link.chat_title,
        shareUrl: `${req.protocol}://${req.get('host')}/shared/${link.share_token}`
      }))
    });
  } catch (error) {
    console.error('Errore recupero link condivisi:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei link condivisi',
      error: error.message
    });
  }
});

// Crea un nuovo link condiviso
app.post('/api/shared-links', authenticateToken, async (req, res) => {
  try {
    await ensureSharedLinksTable();
    
    const { chatId, title } = req.body;
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID obbligatorio'
      });
    }
    
    // Verifica che la chat appartenga all'utente
    const chat = await sql`
      SELECT id, title FROM chats WHERE id = ${chatId} AND user_id = ${req.user.id}
    `;
    
    if (chat.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trovata'
      });
    }
    
    // Genera token unico
    const shareToken = randomBytes(32).toString('hex');
    const linkId = randomBytes(16).toString('hex');
    
    // Calcola data di scadenza - sempre 50 giorni dalla condivisione
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 50);
    
    await sql`
      INSERT INTO shared_links (
        id, user_id, chat_id, share_token, title, expires_at
      )
      VALUES (
        ${linkId}, ${req.user.id}, ${chatId}, ${shareToken},
        ${title || chat[0].title}, ${expiresAt}
      )
    `;
    
    const baseUrl = req.protocol + '://' + req.get('host');
    
    res.json({
      success: true,
      link: {
        id: linkId,
        chatId,
        shareToken,
        title: title || chat[0].title,
        expiresAt,
        shareUrl: `${baseUrl}/shared/${shareToken}`
      }
    });
  } catch (error) {
    console.error('Errore creazione link condiviso:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione del link condiviso',
      error: error.message
    });
  }
});

// Elimina un link condiviso
app.delete('/api/shared-links/:linkId', authenticateToken, async (req, res) => {
  try {
    const { linkId } = req.params;
    
    // Verifica che il link appartenga all'utente
    const link = await sql`
      SELECT id FROM shared_links WHERE id = ${linkId} AND user_id = ${req.user.id}
    `;
    
    if (link.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Link non trovato'
      });
    }
    
    await sql`DELETE FROM shared_links WHERE id = ${linkId}`;
    
    res.json({
      success: true,
      message: 'Link eliminato con successo'
    });
  } catch (error) {
    console.error('Errore eliminazione link:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del link',
      error: error.message
    });
  }
});

// Ottieni una chat condivisa tramite token (pubblico, non richiede autenticazione)
app.get('/api/shared/:token', async (req, res) => {
  try {
    await ensureSharedLinksTable();
    
    const { token } = req.params;
    
    const link = await sql`
      SELECT 
        sl.*,
        c.title as chat_title,
        c.id as chat_id
      FROM shared_links sl
      JOIN chats c ON sl.chat_id = c.id
      WHERE sl.share_token = ${token}
        AND sl.is_active = TRUE
        AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
    `;
    
    if (link.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Link non valido o scaduto'
      });
    }
    
    // Incrementa contatore accessi
    await sql`
      UPDATE shared_links 
      SET access_count = access_count + 1
      WHERE id = ${link[0].id}
    `;
    
    // Ottieni i messaggi della chat
    const messages = await sql`
      SELECT id, type, content, hidden, timestamp
      FROM messages
      WHERE chat_id = ${link[0].chat_id}
        AND hidden = FALSE
      ORDER BY timestamp ASC
    `;
    
    res.json({
      success: true,
      chat: {
        id: link[0].chat_id,
        title: link[0].title || link[0].chat_title,
        messages: messages.map(m => ({
          id: m.id,
          type: m.type,
          content: m.content,
          timestamp: m.timestamp
        }))
      }
    });
  } catch (error) {
    console.error('Errore recupero chat condivisa:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero della chat condivisa',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT LINK CONDIVISI ====================

// ==================== ENDPOINT ESPORTAZIONE DATI ====================

// Crea tabella data_exports se non esiste
async function ensureDataExportsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS data_exports (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        export_token VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'ready', 'expired'
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_data_exports_user_id ON data_exports(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_data_exports_token ON data_exports(export_token)`;
    return true;
  } catch (error) {
    console.error('Errore creazione tabella data_exports:', error);
    return false;
  }
}

// Crea una richiesta di esportazione dati
app.post('/api/data/export', authenticateToken, async (req, res) => {
  try {
    await ensureDataExportsTable();
    
    // Genera token unico per l'export
    const exportToken = randomBytes(32).toString('hex');
    const exportId = randomBytes(16).toString('hex');
    
    // Il link sarÃ  valido per 7 giorni
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await sql`
      INSERT INTO data_exports (id, user_id, export_token, expires_at, status)
      VALUES (${exportId}, ${req.user.id}, ${exportToken}, ${expiresAt}, 'ready')
    `;
    
    const baseUrl = req.protocol + '://' + req.get('host');
    
    res.json({
      success: true,
      exportToken,
      downloadUrl: `${baseUrl}/api/data/export/${exportToken}`,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Errore creazione export:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione dell\'export',
      error: error.message
    });
  }
});

// Scarica i dati esportati
app.get('/api/data/export/:token', async (req, res) => {
  try {
    await ensureDataExportsTable();
    
    const { token } = req.params;
    const authHeader = req.headers['authorization'];
    const authToken = authHeader && authHeader.split(' ')[1];
    
    if (!authToken) {
      return res.status(401).json({ success: false, message: 'Token di autenticazione richiesto' });
    }
    
    // Verifica il token JWT
    let userId;
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET);
      const sessions = await sql`
        SELECT s.user_id FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ${authToken}
          AND s.expires_at > NOW()
          AND u.is_active = true
      `;
      if (sessions.length === 0) {
        return res.status(401).json({ success: false, message: 'Sessione non valida' });
      }
      userId = sessions[0].user_id;
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token non valido' });
    }
    
    // Verifica che l'export appartenga all'utente e sia valido
    const exportRecord = await sql`
      SELECT * FROM data_exports
      WHERE export_token = ${token}
        AND user_id = ${userId}
        AND expires_at > NOW()
        AND status = 'ready'
    `;
    
    if (exportRecord.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Export non trovato o scaduto'
      });
    }
    
    // Recupera tutti i dati dell'utente
    const [user] = await sql`SELECT id, email, username, created_at FROM users WHERE id = ${userId}`;
    const [settings] = await sql`SELECT * FROM user_settings WHERE user_id = ${userId}`;
    const [subscription] = await sql`
      SELECT * FROM subscriptions 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const chats = await sql`
      SELECT 
        c.id,
        c.title,
        c.project_id,
        c.created_at,
        c.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'type', m.type,
              'content', m.content,
              'hidden', m.hidden,
              'timestamp', m.timestamp
            ) ORDER BY m.timestamp
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) as messages
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      WHERE c.user_id = ${userId}
        AND c.is_temporary = false
      GROUP BY c.id, c.title, c.project_id, c.created_at, c.updated_at
      ORDER BY c.updated_at DESC
    `;
    
    const projects = await sql`
      SELECT * FROM projects WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at
      },
      settings: settings || null,
      subscription: subscription || null,
      chats: chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        projectId: chat.project_id,
        messages: chat.messages || [],
        createdAt: chat.created_at,
        updatedAt: chat.updated_at
      })),
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      })),
      exportDate: new Date().toISOString(),
      exportToken: token
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="nebula-ai-export-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Errore download export:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel download dell\'export',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT ESPORTAZIONE DATI ====================

// ==================== ENDPOINT ELIMINAZIONE CHAT ====================

// Elimina tutte le chat dell'utente
app.delete('/api/chat', authenticateToken, async (req, res) => {
  try {
    // Elimina tutte le chat dell'utente (i messaggi verranno eliminati automaticamente per CASCADE)
    const result = await sql`
      DELETE FROM chats 
      WHERE user_id = ${req.user.id}
        AND is_temporary = false
    `;
    
    res.json({
      success: true,
      message: 'Tutte le chat sono state eliminate con successo',
      deletedCount: result.count || 0
    });
  } catch (error) {
    console.error('Errore eliminazione chat:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione delle chat',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT ELIMINAZIONE CHAT ====================

// ==================== JOB PULIZIA AUTOMATICA LINK CONDIVISI ====================

/**
 * Job di pulizia automatica per eliminare link condivisi scaduti (oltre 50 giorni)
 * Viene eseguito ogni 24 ore
 */
async function cleanupExpiredSharedLinks() {
  try {
    await ensureSharedLinksTable();
    
    // Calcola la data di 50 giorni fa
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 50);
    
    // Elimina link condivisi creati piÃ¹ di 50 giorni fa
    const result = await sql`
      DELETE FROM shared_links
      WHERE created_at < ${cutoffDate.toISOString()}
    `;
    
    log(`ðŸ§¹ Pulizia link condivisi: eliminati link piÃ¹ vecchi di 50 giorni`);
  } catch (error) {
    logError('Errore durante la pulizia automatica dei link condivisi:', error);
  }
}

// Esegui la pulizia all'avvio del server
cleanupExpiredSharedLinks();

// Esegui la pulizia ogni 24 ore (86400000 ms)
setInterval(cleanupExpiredSharedLinks, 24 * 60 * 60 * 1000);

// ==================== FINE JOB PULIZIA AUTOMATICA ====================

// ==================== ENDPOINT UPLOAD IMMAGINI TEMPORANEE ====================

// Store in-memory per immagini temporanee (per image-to-image)
const tempImageStore = new Map();
const IMAGE_TTL = 60 * 60 * 1000; // 1 ora

// Endpoint per caricare un'immagine temporanea
app.post('/api/image/upload', async (req, res) => {
  try {
    const { imageData } = req.body; // Base64 data URL
    
    if (!imageData || !imageData.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'Formato immagine non valido. Fornire un data URL valido.'
      });
    }

    // Genera un ID univoco per l'immagine
    const imageId = randomBytes(16).toString('hex');
    
    // Estrai il tipo MIME e i dati base64
    const matches = imageData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Formato data URL non valido'
      });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Salva l'immagine nello store temporaneo
    tempImageStore.set(imageId, {
      mimeType,
      base64Data,
      timestamp: Date.now()
    });

    // Pulisci immagini vecchie (piÃ¹ di 1 ora)
    const now = Date.now();
    for (const [id, data] of tempImageStore.entries()) {
      if (now - data.timestamp > IMAGE_TTL) {
        tempImageStore.delete(id);
      }
    }

    // Genera l'URL pubblico
    const baseUrl = req.protocol + '://' + req.get('host');
    const imageUrl = `${baseUrl}/api/image/${imageId}`;

    res.json({
      success: true,
      imageUrl,
      imageId
    });
  } catch (error) {
    console.error('Errore upload immagine:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il caricamento dell\'immagine',
      error: error.message
    });
  }
});

// Endpoint per servire l'immagine temporanea
app.get('/api/image/:imageId', (req, res) => {
  try {
    const { imageId } = req.params;
    const imageData = tempImageStore.get(imageId);

    if (!imageData) {
      return res.status(404).json({
        success: false,
        message: 'Immagine non trovata o scaduta'
      });
    }

    // Controlla se l'immagine Ã¨ scaduta
    const now = Date.now();
    if (now - imageData.timestamp > IMAGE_TTL) {
      tempImageStore.delete(imageId);
      return res.status(404).json({
        success: false,
        message: 'Immagine scaduta'
      });
    }

    // Converti base64 in buffer
    const imageBuffer = Buffer.from(imageData.base64Data, 'base64');
    
    // Imposta gli header appropriati
    res.setHeader('Content-Type', `image/${imageData.mimeType}`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache per 1 ora
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(imageBuffer);
  } catch (error) {
    console.error('Errore servizio immagine:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dell\'immagine',
      error: error.message
    });
  }
});

// ==================== FINE ENDPOINT UPLOAD IMMAGINI ====================

app.listen(PORT, () => {
  if (isDevelopment) {
    log('\n' + '='.repeat(60));
    log(`ðŸš€ Server API avviato su http://localhost:${PORT}`);
    log(`ðŸ“… Data avvio: ${new Date().toISOString()}`);
    log(`ðŸŒ Ambiente: ${process.env.NODE_ENV || 'development'}`);
    log(`ðŸ“Š Database: ${connectionString ? 'âœ… Configurato' : 'âŒ Non configurato'}`);
    log('='.repeat(60));
    log(`\nðŸ“Š Endpoint disponibili:`);
    log(`   GET  /api/db/test - Test connessione`);
    log(`   GET  /api/db/info - Informazioni database`);
    log(`   POST /api/db/query - Esegui query SELECT`);
    log(`   POST /api/auth/register - Registrazione`);
    log(`   POST /api/auth/login - Login`);
    log(`   GET  /api/auth/me - Verifica sessione`);
    log(`   POST /api/auth/logout - Logout`);
    log(`   GET  /api/chat - Ottieni chat utente`);
    log(`   POST /api/chat - Salva chat`);
    log(`   DELETE /api/chat/:id - Elimina chat`);
    log(`   PATCH /api/chat/:id - Aggiorna chat`);
    log(`   GET  /api/projects - Ottieni progetti utente`);
    log(`   GET  /api/projects/:id - Ottieni progetto singolo`);
    log(`   POST /api/projects - Salva progetto`);
    log(`   PATCH /api/projects/:id - Aggiorna progetto`);
    log(`   DELETE /api/projects/:id - Elimina progetto`);
    log(`   GET  /api/user/settings - Ottieni impostazioni utente`);
    log(`   PATCH /api/user/settings - Aggiorna impostazioni utente`);
    log(`   Billing gestito dal database Neon`);
    log(`   POST /api/image/upload - Carica immagine temporanea`);
    log(`   GET  /api/image/:imageId - Ottieni immagine temporanea`);
    log('\n' + '='.repeat(60));
    log('âœ… Server pronto a ricevere richieste\n');
  } else {
    // In produzione, solo log essenziale
    console.log(`ðŸš€ Server API avviato su porta ${PORT}`);
  }
});

