// API Route per registrazione su Vercel
// Questo file viene deployato come serverless function su Vercel

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 giorni

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

export default async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
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

  const timestamp = new Date().toISOString();
  console.log('\n📝 [VERCEL REGISTER] Richiesta ricevuta:', {
    timestamp,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  });

  try {
    const { username, password } = req.body;

    console.log('📥 [VERCEL REGISTER] Body ricevuto:', {
      username: username || 'MISSING',
      password: password ? '***' : 'MISSING'
    });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username e password sono obbligatori'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Lo username deve essere di almeno 3 caratteri'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La password deve essere di almeno 6 caratteri'
      });
    }

    // Verifica se username esiste già
    const existing = await sql`
      SELECT id FROM users 
      WHERE username = ${username.toLowerCase()}
    `;

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username già in uso'
      });
    }

    // Hash della password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomBytes(16).toString('hex');
    const email = `${username.toLowerCase()}@nebula.local`;

    // Crea l'utente
    await sql`
      INSERT INTO users (id, email, username, password_hash)
      VALUES (${userId}, ${email}, ${username.toLowerCase()}, ${passwordHash})
    `;

    // Crea sessione
    const sessionToken = jwt.sign({ userId, email, username: username.toLowerCase() }, JWT_SECRET, { expiresIn: '7d' });
    const sessionId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    await sql`
      INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
      VALUES (${sessionId}, ${userId}, ${sessionToken}, ${expiresAt}, ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}, ${req.headers['user-agent']})
    `;

    // Aggiorna last_login
    await sql`
      UPDATE users SET last_login = NOW() WHERE id = ${userId}
    `;

    console.log('✅ [VERCEL REGISTER] Registrazione completata per:', username.toLowerCase());

    res.json({
      success: true,
      message: 'Registrazione completata con successo',
      user: {
        id: userId,
        username: username.toLowerCase()
      },
      token: sessionToken
    });
  } catch (error) {
    console.error('❌ [VERCEL REGISTER] Errore:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la registrazione',
      error: error.message
    });
  }
}

