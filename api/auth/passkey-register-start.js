// API Route per iniziare la registrazione passkey su Vercel
import { neon } from '@neondatabase/serverless';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';

// Configurazione WebAuthn
const rpId = process.env.WEBAUTHN_RP_ID || 'ainebula.vercel.app';
const rpName = process.env.WEBAUTHN_RP_NAME || 'Nebula AI';
const origin = process.env.WEBAUTHN_ORIGIN || 'https://ainebula.vercel.app';

// Store temporaneo per le challenge (in produzione usa Redis o database)
// Per ora usiamo un Map in-memory (non ideale per serverless, ma funziona)
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
  } catch (error) {
    console.error('Errore passkey register start:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Errore durante la generazione delle opzioni di registrazione',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

