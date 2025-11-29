// API Route unificata per passkey (login e registrazione) su Vercel
import { neon } from '@neondatabase/serverless';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni

// Configurazione WebAuthn
const rpId = process.env.WEBAUTHN_RP_ID || 'ainebula.vercel.app';
const rpName = process.env.WEBAUTHN_RP_NAME || 'Nebula AI';
const origin = process.env.WEBAUTHN_ORIGIN || 'https://ainebula.vercel.app';

// Store temporaneo per le challenge
const challenges = new Map();

function getDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(connectionString);
}

function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

// Passkey Login Start
async function handlePasskeyLoginStart(req, res, sql) {
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
}

// Passkey Login Finish
async function handlePasskeyLoginFinish(req, res, sql) {
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
  
  // Il credential_id nel database è già una stringa base64url
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
    VALUES (${sessionId}, ${user.id}, ${sessionToken}, ${expiresAt}, ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}, ${req.headers['user-agent']})
  `;
  
  // Aggiorna last_login
  await sql`
    UPDATE users SET last_login = NOW() WHERE id = ${user.id}
  `;
  
  // Imposta il cookie HTTP per mantenere la sessione
  // Per Vercel API routes, usiamo setHeader invece di res.cookie()
  const maxAge = SESSION_DURATION / 1000; // Durata in secondi (7 giorni)
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieParts = [
    `auth_token=${sessionToken}`,
    `Max-Age=${maxAge}`,
    `Path=/`,
    `SameSite=Lax`,
    isProduction ? 'Secure' : '',
    'HttpOnly'
  ].filter(Boolean); // Rimuove stringhe vuote
  
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  
  console.log('🍪 [VERCEL PASSKEY LOGIN] Cookie impostato');
  
  res.json({
    success: true,
    message: 'Login con passkey completato con successo',
    user: {
      id: user.id,
      username: user.username
    },
    token: sessionToken
  });
}

// Passkey Register Start
async function handlePasskeyRegisterStart(req, res, sql) {
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
}

// Passkey Register Finish
async function handlePasskeyRegisterFinish(req, res, sql) {
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
    VALUES (${passkeyId}, ${user.id}, ${credentialId}, ${publicKey}, ${registrationInfo.counter || 0}, ${credential.response?.userHandle || 'Unknown Device'})
  `;
  
  challenges.delete(`register:${user.id}`);
  
  res.json({
    success: true,
    message: 'Passkey registrata con successo'
  });
}

export default async function handler(req, res) {
  setCORSHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const sql = getDatabaseConnection();
    const { action } = req.body;
    
    // Routing basato sull'azione
    switch (action) {
      case 'login-start':
        return await handlePasskeyLoginStart(req, res, sql);
      case 'login-finish':
        return await handlePasskeyLoginFinish(req, res, sql);
      case 'register-start':
        return await handlePasskeyRegisterStart(req, res, sql);
      case 'register-finish':
        return await handlePasskeyRegisterFinish(req, res, sql);
      default:
        return res.status(400).json({
          success: false,
          message: 'Azione non valida. Usa: login-start, login-finish, register-start, register-finish'
        });
    }
  } catch (error) {
    console.error('Errore passkey:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'operazione passkey',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

