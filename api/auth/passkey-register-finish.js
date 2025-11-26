// API Route per completare la registrazione passkey su Vercel
import { neon } from '@neondatabase/serverless';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { randomBytes } from 'crypto';

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
  } catch (error) {
    console.error('Errore passkey register finish:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Errore durante la registrazione della passkey',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

