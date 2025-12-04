// API Route dinamica consolidata per gestire TUTTE le operazioni di autenticazione su Vercel
// Gestisce: /api/auth/login, /api/auth/register, /api/auth/passkey, /api/auth/2fa, /api/auth/me, ecc.
// Autenticazione completa con Neon Database (username/password)

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { setAuthCookie, clearAuthCookie } from '../utils/cookies.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni

// Configurazione WebAuthn
const rpId = process.env.WEBAUTHN_RP_ID || 'ainebula.vercel.app';
const rpName = process.env.WEBAUTHN_RP_NAME || 'Nebula AI';
const origin = process.env.WEBAUTHN_ORIGIN || 'https://ainebula.vercel.app';

// Store temporaneo per le challenge passkey
const challenges = new Map();

function getDatabaseConnection() {
  // Connessione al database PostgreSQL Neon
  // Priorità: DATABASE_URL (con pooling) > DATABASE_URL_UNPOOLED (senza pooling)
  const connectionString = process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    throw new Error('Connection string PostgreSQL non trovata. Configura DATABASE_URL (Neon)');
  }
  return neon(connectionString);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = parts[1];
      }
    });
  }
  return cookies;
}

async function authenticateUser(req, sql) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length > 1) {
      token = parts[1];
    }
  }
  
  if (!token) {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.auth_token) {
      token = cookies.auth_token;
    }
  }

  console.log('🔐 [AUTH] Verifica token:', {
    hasAuthHeader: !!authHeader,
    hasCookie: !!req.headers.cookie,
    hasToken: !!token,
    cookieHeader: req.headers.cookie ? req.headers.cookie.substring(0, 100) : null
  });

  if (!token) {
    return { error: 'Token non fornito', status: 401 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.username, u.phone_number, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;

    if (sessions.length === 0) {
      console.log('⚠️ [AUTH] Sessione non trovata o scaduta per token:', token.substring(0, 20) + '...');
      return { error: 'Sessione non valida', status: 401 };
    }

    console.log('✅ [AUTH] Sessione valida per user:', sessions[0].user_id);
    return { user: sessions[0], token };
  } catch (error) {
    console.error('❌ [AUTH] Errore verifica token:', error.message);
    return { error: 'Token non valido', status: 403 };
  }
}

import { setCorsHeaders, handleCorsPreflight } from '../utils/cors.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (handleCorsPreflight(req, res)) {
    return;
  }

  try {
    const sql = getDatabaseConnection();
    
    // Determina l'endpoint dal slug (per route dinamiche) o query parameter
    const slug = req.query.slug;
    let endpoint = '';
    if (slug) {
      endpoint = Array.isArray(slug) ? slug[0] : slug;
    }
    
    // Se non c'è slug, prova a estrarre dal path
    if (!endpoint) {
      const urlPath = req.url.split('?')[0];
      const pathMatch = urlPath.match(/\/api\/auth\/([^/?]+)/);
      if (pathMatch) {
        endpoint = pathMatch[1];
      }
    }
    
    let action = req.query.action || endpoint;
    
    // Parse body se necessario
    let parsedBody = req.body;
    if (parsedBody) {
      if (typeof parsedBody === 'string' && parsedBody.length > 0) {
        try {
          parsedBody = JSON.parse(parsedBody);
        } catch (e) {
          console.warn('⚠️ [AUTH] Errore parsing body JSON:', e.message);
        }
      }
      
      if (!action && parsedBody && typeof parsedBody === 'object' && parsedBody.action) {
        action = parsedBody.action;
      }
    }
    
    console.log('🔍 [AUTH] Routing:', { 
      method: req.method, 
      endpoint, 
      action, 
      slug,
      url: req.url,
      hasBody: !!req.body,
      bodyType: typeof req.body,
      hasCookie: !!req.headers.cookie,
      hasAuthHeader: !!req.headers['authorization']
    });
    
    // GET /api/auth/me - Verifica sessione
    if (req.method === 'GET' && (endpoint === 'me' || action === 'me' || !endpoint)) {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;

      const subscriptions = await sql`
        SELECT * FROM subscriptions 
        WHERE user_id = ${userId} 
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
          expiresAt: sub.expires_at ? sub.expires_at.toISOString() : null,
          startedAt: sub.started_at ? sub.started_at.toISOString() : null,
          autoRenew: sub.auto_renew || false,
          status: sub.status
        };
      } else {
        subscription = {
          active: false,
          plan: null,
          expiresAt: null,
          startedAt: null,
          autoRenew: false,
          status: 'inactive'
        };
      }

      res.json({
        success: true,
        user: {
          id: userId,
          username: auth.user.username,
          phone_number: auth.user.phone_number || null,
          subscription: subscription
        },
        token: auth.token
      });
      return;
    }
    
    // POST /api/auth/register - Registrazione con Neon Database
    if (req.method === 'POST' && (endpoint === 'register' || action === 'register')) {
      const body = parsedBody || req.body;
      const { username, password } = body;
      
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
      
      try {
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
        
        // Crea l'utente (email può essere NULL o un placeholder)
        await sql`
          INSERT INTO users (id, email, username, password_hash, created_at, updated_at, is_active)
          VALUES (
            ${userId},
            ${`${username}@nebula.local`}, -- Placeholder email per compatibilità schema
            ${username.toLowerCase()},
            ${passwordHash},
            NOW(),
            NOW(),
            true
          )
        `;
        
        // Crea sessione JWT
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
        
        console.log('✅ [AUTH] Utente registrato:', userId);
        
        // Imposta cookie
        setAuthCookie(res, sessionToken);
        
        return res.status(201).json({
          success: true,
          user: {
            id: userId,
            username: username.toLowerCase()
          },
          token: sessionToken
        });
      } catch (error) {
        console.error('❌ [AUTH] Errore registrazione:', error);
        return res.status(500).json({
          success: false,
          message: 'Errore durante la registrazione',
          error: error.message
        });
      }
    }
    
    // POST /api/auth/login - Login con Neon Database
    if (req.method === 'POST' && (endpoint === 'login' || action === 'login')) {
      const body = parsedBody || req.body;
      const { username, password } = body;
      
      // Validazione
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username e password sono obbligatori'
        });
      }
      
      try {
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
        
        console.log('✅ [AUTH] Login riuscito:', user.id);
        
        // Imposta cookie
        setAuthCookie(res, sessionToken);
        
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
        console.error('❌ [AUTH] Errore login:', error);
        return res.status(500).json({
          success: false,
          message: 'Errore durante il login',
          error: error.message
        });
      }
    }
    
    // POST /api/auth/passkey - Passkey operations
    if (req.method === 'POST' && (endpoint === 'passkey' || action === 'passkey')) {
      const body = parsedBody || req.body;
      const passkeyAction = body.action || req.query.action;
      
      // Passkey Login Start
      if (passkeyAction === 'login-start') {
        const { username } = body;
        
        if (!username) {
          return res.status(400).json({
            success: false,
            message: 'Username obbligatorio'
          });
        }
        
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
        
        challenges.set(`login:${user.id}`, opts.challenge);
        
        res.json({
          success: true,
          options: opts
        });
        return;
      }
      
      // Passkey Login Finish
      if (passkeyAction === 'login-finish') {
        const { username, credential } = body;
        
        if (!username || !credential) {
          return res.status(400).json({
            success: false,
            message: 'Username e credential obbligatori'
          });
        }
        
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
        
        const credentialId = credential.id;
        const passkeys = await sql`
          SELECT id, credential_id, public_key, counter FROM passkeys WHERE user_id = ${user.id}
        `;
        
        const passkey = passkeys.find(pk => pk.credential_id === credentialId);
        
        if (!passkey) {
          challenges.delete(`login:${user.id}`);
          return res.status(404).json({
            success: false,
            message: 'Passkey non trovata'
          });
        }
        
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
          challenges.delete(`login:${user.id}`);
          return res.status(400).json({
            success: false,
            message: 'Errore durante la verifica: ' + error.message
          });
        }
        
        if (!verification.verified) {
          challenges.delete(`login:${user.id}`);
          return res.status(400).json({
            success: false,
            message: 'Verifica fallita'
          });
        }
        
        await sql`
          UPDATE passkeys 
          SET counter = ${verification.authenticationInfo.newCounter}, last_used_at = NOW()
          WHERE id = ${passkey.id}
        `;
        
        challenges.delete(`login:${user.id}`);
        
        const sessionToken = jwt.sign(
          { userId: user.id, email: user.email, username: user.username },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        const sessionId = randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + SESSION_DURATION);
        
        await sql`
          INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
          VALUES (${sessionId}, ${user.id}, ${sessionToken}, ${expiresAt}, ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}, ${req.headers['user-agent']})
        `;
        
        await sql`
          UPDATE users SET last_login = NOW() WHERE id = ${user.id}
        `;
        
        // Imposta cookie
        setAuthCookie(res, sessionToken);
        
        res.json({
          success: true,
          message: 'Login con passkey completato con successo',
          user: {
            id: user.id,
            username: user.username
          },
          token: sessionToken
        });
        return;
      }
      
      // Passkey Register Start
      if (passkeyAction === 'register-start') {
        const { username } = body;
        
        if (!username) {
          return res.status(400).json({
            success: false,
            message: 'Username obbligatorio'
          });
        }
        
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
        
        challenges.set(`register:${user.id}`, opts.challenge);
        
        res.json({
          success: true,
          options: opts
        });
        return;
      }
      
      // Passkey Register Finish
      if (passkeyAction === 'register-finish') {
        const { username, credential } = body;
        
        if (!username || !credential) {
          return res.status(400).json({
            success: false,
            message: 'Username e credential obbligatori'
          });
        }
        
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
          challenges.delete(`register:${user.id}`);
          return res.status(400).json({
            success: false,
            message: 'Errore durante la verifica: ' + error.message
          });
        }
        
        if (!verification.verified || !verification.registrationInfo) {
          challenges.delete(`register:${user.id}`);
          return res.status(400).json({
            success: false,
            message: 'Verifica fallita'
          });
        }
        
        const passkeyId = randomBytes(16).toString('hex');
        const credentialId = isoBase64URL.fromBuffer(verification.registrationInfo.credentialID);
        const publicKey = isoBase64URL.fromBuffer(verification.registrationInfo.credentialPublicKey);
        
        await sql`
          INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, device_name)
          VALUES (${passkeyId}, ${user.id}, ${credentialId}, ${publicKey}, ${verification.registrationInfo.counter || 0}, ${credential.response?.userHandle || 'Unknown Device'})
        `;
        
        challenges.delete(`register:${user.id}`);
        
        res.json({
          success: true,
          message: 'Passkey registrata con successo'
        });
        return;
      }
      
      return res.status(400).json({
        success: false,
        message: 'Azione passkey non valida'
      });
    }
    
    // POST /api/auth/2fa - 2FA operations
    if ((req.method === 'POST' || req.method === 'GET') && (endpoint === '2fa' || action === '2fa')) {
      const body = parsedBody || req.body;
      const twoFactorAction = req.query.action || body.action;
      
      // GET /api/auth/2fa?action=status
      if (req.method === 'GET' || twoFactorAction === 'status') {
        const auth = await authenticateUser(req, sql);
        if (auth.error) {
          return res.status(auth.status).json({ success: false, message: auth.error });
        }
        
        const users = await sql`
          SELECT two_factor_enabled FROM users WHERE id = ${auth.user.user_id}
        `;
        
        res.json({
          success: true,
          twoFactorEnabled: users[0]?.two_factor_enabled || false
        });
        return;
      }
      
      // POST /api/auth/2fa?action=generate
      if (twoFactorAction === 'generate') {
        const auth = await authenticateUser(req, sql);
        if (auth.error) {
          return res.status(auth.status).json({ success: false, message: auth.error });
        }
        
        const userId = auth.user.user_id;
        const username = auth.user.username;
        
        const users = await sql`
          SELECT two_factor_enabled FROM users WHERE id = ${userId}
        `;
        
        if (users[0]?.two_factor_enabled) {
          return res.status(400).json({ success: false, message: '2FA già abilitato' });
        }
        
        const secret = speakeasy.generateSecret({
          name: `Nebula AI (${username})`,
          issuer: 'Nebula AI'
        });
        
        await sql`
          UPDATE users
          SET two_factor_secret = ${secret.base32}
          WHERE id = ${userId}
        `;
        
        const otpauthUrl = speakeasy.otpauthURL({
          secret: secret.base32,
          label: username,
          issuer: 'Nebula AI',
          encoding: 'base32'
        });
        
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        
        res.json({
          success: true,
          secret: secret.base32,
          qrCode: qrCodeDataUrl,
          manualEntryKey: secret.base32
        });
        return;
      }
      
      // POST /api/auth/2fa?action=verify
      if (twoFactorAction === 'verify') {
        const auth = await authenticateUser(req, sql);
        if (auth.error) {
          return res.status(auth.status).json({ success: false, message: auth.error });
        }
        
        const { code } = body;
        
        if (!code) {
          return res.status(400).json({ success: false, message: 'Codice 2FA richiesto' });
        }
        
        const userId = auth.user.user_id;
        const users = await sql`
          SELECT two_factor_secret FROM users WHERE id = ${userId}
        `;
        
        const twoFactorSecret = users[0]?.two_factor_secret;
        
        if (!twoFactorSecret) {
          return res.status(400).json({ success: false, message: 'Nessun secret 2FA trovato. Genera prima un QR code.' });
        }
        
        const verified = speakeasy.totp.verify({
          secret: twoFactorSecret,
          encoding: 'base32',
          token: code,
          window: 2
        });
        
        if (!verified) {
          return res.status(400).json({ success: false, message: 'Codice 2FA non valido' });
        }
        
        await sql`
          UPDATE users
          SET two_factor_enabled = TRUE
          WHERE id = ${userId}
        `;
        
        res.json({
          success: true,
          message: '2FA abilitato con successo'
        });
        return;
      }
      
      // POST /api/auth/2fa?action=disable
      if (twoFactorAction === 'disable') {
        const auth = await authenticateUser(req, sql);
        if (auth.error) {
          return res.status(auth.status).json({ success: false, message: auth.error });
        }
        
        const { code } = body;
        
        if (!code) {
          return res.status(400).json({ success: false, message: 'Codice 2FA richiesto per disabilitare' });
        }
        
        const userId = auth.user.user_id;
        const users = await sql`
          SELECT two_factor_enabled, two_factor_secret FROM users WHERE id = ${userId}
        `;
        
        const twoFactorEnabled = users[0]?.two_factor_enabled;
        const twoFactorSecret = users[0]?.two_factor_secret;
        
        if (!twoFactorEnabled) {
          return res.status(400).json({ success: false, message: '2FA non è abilitato' });
        }
        
        if (!twoFactorSecret) {
          return res.status(400).json({ success: false, message: 'Nessun secret 2FA trovato' });
        }
        
        const verified = speakeasy.totp.verify({
          secret: twoFactorSecret,
          encoding: 'base32',
          token: code,
          window: 2
        });
        
        if (!verified) {
          return res.status(400).json({ success: false, message: 'Codice 2FA non valido' });
        }
        
        await sql`
          UPDATE users
          SET two_factor_enabled = FALSE, two_factor_secret = NULL
          WHERE id = ${userId}
        `;
        
        res.json({
          success: true,
          message: '2FA disabilitato con successo'
        });
        return;
      }
      
      return res.status(400).json({ success: false, message: 'Azione 2FA non valida' });
    }
    
    // POST /api/auth/disconnect-all - Disconnetti da tutti i dispositivi
    if (req.method === 'POST' && (endpoint === 'disconnect-all' || action === 'disconnect-all')) {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      const token = auth.token;

      await sql`
        DELETE FROM sessions 
        WHERE user_id = ${userId} 
          AND token != ${token}
      `;

      res.json({
        success: true,
        message: 'Disconnessione da tutti i dispositivi completata. La sessione corrente è stata mantenuta.'
      });
      return;
    }

    // POST /api/auth/logout - Logout
    if (req.method === 'POST' && (endpoint === 'logout' || action === 'logout' || (!endpoint && !action))) {
      const authHeader = req.headers['authorization'];
      let token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        const cookies = parseCookies(req.headers.cookie);
        if (cookies.auth_token) {
          token = cookies.auth_token;
        }
      }

      if (token) {
        await sql`
          DELETE FROM sessions WHERE token = ${token}
        `;
      }
      
      // Rimuovi cookie
      clearAuthCookie(res);

      res.json({
        success: true,
        message: 'Logout completato con successo'
      });
      return;
    }

    // DELETE /api/auth/delete-account - Elimina account
    if ((req.method === 'DELETE' && endpoint === 'delete-account') || (req.method === 'POST' && action === 'delete-account')) {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;

      await sql`
        DELETE FROM users WHERE id = ${userId}
      `;

      res.json({
        success: true,
        message: 'Account eliminato con successo. Tutti i dati associati sono stati rimossi.'
      });
      return;
    }

    // PUT/PATCH /api/auth/update-phone - Aggiorna numero di telefono
    if ((req.method === 'PUT' || req.method === 'PATCH') && (endpoint === 'update-phone' || action === 'update-phone')) {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      const body = parsedBody || req.body;
      const { phone_number } = body;

      if (phone_number !== null && phone_number !== undefined && phone_number !== '') {
        const cleanedPhone = phone_number.toString().trim();
        if (cleanedPhone.length > 20) {
          return res.status(400).json({ success: false, message: 'Il numero di telefono è troppo lungo (max 20 caratteri)' });
        }
      }

      await sql`
        UPDATE users 
        SET phone_number = ${phone_number || null}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;

      res.json({
        success: true,
        message: 'Numero di telefono aggiornato con successo',
        phone_number: phone_number || null
      });
      return;
    }

    // PUT/PATCH /api/auth/update-username - Aggiorna username
    if ((req.method === 'PUT' || req.method === 'PATCH') && (endpoint === 'update-username' || action === 'update-username')) {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      const body = parsedBody || req.body;
      const { username } = body;

      if (!username || username.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Lo username è obbligatorio' });
      }

      const trimmedUsername = username.trim().toLowerCase();

      if (trimmedUsername.length < 3) {
        return res.status(400).json({ success: false, message: 'Lo username deve essere di almeno 3 caratteri' });
      }

      if (trimmedUsername.length > 100) {
        return res.status(400).json({ success: false, message: 'Lo username è troppo lungo (max 100 caratteri)' });
      }

      const existing = await sql`
        SELECT id FROM users 
        WHERE username = ${trimmedUsername} AND id != ${userId}
      `;

      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Username già in uso' });
      }

      await sql`
        UPDATE users 
        SET username = ${trimmedUsername}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;

      res.json({
        success: true,
        message: 'Username aggiornato con successo',
        username: trimmedUsername
      });
      return;
    }

    // PUT/PATCH /api/auth/update-password - Aggiorna password
    if ((req.method === 'PUT' || req.method === 'PATCH') && (endpoint === 'update-password' || action === 'update-password')) {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      const body = parsedBody || req.body;
      const { current_password, new_password } = body;

      if (!current_password) {
        return res.status(400).json({ success: false, message: 'La password attuale è obbligatoria' });
      }

      if (!new_password) {
        return res.status(400).json({ success: false, message: 'La nuova password è obbligatoria' });
      }

      if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: 'La nuova password deve essere di almeno 6 caratteri' });
      }

      const [user] = await sql`
        SELECT password_hash FROM users WHERE id = ${userId}
      `;

      if (!user) {
        return res.status(404).json({ success: false, message: 'Utente non trovato' });
      }

      const isValidPassword = await bcrypt.compare(current_password, user.password_hash);

      if (!isValidPassword) {
        return res.status(400).json({ success: false, message: 'Password attuale non corretta' });
      }

      const passwordHash = await bcrypt.hash(new_password, 10);

      await sql`
        UPDATE users 
        SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;

      res.json({
        success: true,
        message: 'Password aggiornata con successo'
      });
      return;
    }
    
    // Endpoint non trovato
    return res.status(404).json({ success: false, message: 'Endpoint non trovato', endpoint, action });
    
  } catch (error) {
    console.error('❌ Errore auth:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      url: req.url,
      method: req.method
    });
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Errore durante l\'operazione',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }
}
