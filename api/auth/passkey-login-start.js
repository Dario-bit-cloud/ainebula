// API Route per iniziare il login con passkey su Vercel
import { neon } from '@neondatabase/serverless';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

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
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Errore durante la generazione delle opzioni di autenticazione',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

