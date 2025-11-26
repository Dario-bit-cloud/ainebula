// API Route per completare il login con passkey su Vercel
import { neon } from '@neondatabase/serverless';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni

// Configurazione WebAuthn
const rpId = process.env.WEBAUTHN_RP_ID || 'ainebula.vercel.app';
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

export default async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const sql = getDatabaseConnection();
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
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Errore durante il login con passkey',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

