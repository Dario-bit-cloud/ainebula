// API Route per login su Vercel
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

  const timestamp = new Date().toISOString();
  console.log('\n🔐 [VERCEL LOGIN] Richiesta ricevuta:', {
    timestamp,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  });

  try {
    const { username, password } = req.body;

    console.log('📥 [VERCEL LOGIN] Body ricevuto:', {
      username: username || 'MISSING',
      password: password ? '***' : 'MISSING'
    });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username e password sono obbligatori'
      });
    }

    const usernameLower = username.toLowerCase();
    console.log('🔍 [VERCEL LOGIN] Ricerca utente:', usernameLower);

    // Trova l'utente
    const users = await sql`
      SELECT id, email, username, password_hash, is_active
      FROM users
      WHERE username = ${usernameLower}
    `;

    console.log('👤 [VERCEL LOGIN] Utenti trovati:', users.length);

    if (users.length === 0) {
      console.warn('❌ [VERCEL LOGIN] Utente non trovato:', usernameLower);
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    const user = users[0];
    console.log('✅ [VERCEL LOGIN] Utente trovato:', {
      id: user.id,
      username: user.username,
      isActive: user.is_active
    });

    if (!user.is_active) {
      console.warn('⚠️ [VERCEL LOGIN] Account disattivato:', user.id);
      return res.status(403).json({
        success: false,
        message: 'Account disattivato'
      });
    }

    // Verifica password
    console.log('🔑 [VERCEL LOGIN] Verifica password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 [VERCEL LOGIN] Password valida:', isValidPassword);

    if (!isValidPassword) {
      console.warn('❌ [VERCEL LOGIN] Password non valida per utente:', user.username);
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    // Crea sessione
    console.log('🎫 [VERCEL LOGIN] Creazione sessione...');
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

    console.log('✅ [VERCEL LOGIN] Sessione creata:', {
      sessionId,
      expiresAt: expiresAt.toISOString()
    });

    // Aggiorna last_login
    await sql`
      UPDATE users SET last_login = NOW() WHERE id = ${user.id}
    `;

    const response = {
      success: true,
      message: 'Login completato con successo',
      user: {
        id: user.id,
        username: user.username
      },
      token: sessionToken
    };

    console.log('✅ [VERCEL LOGIN] Login completato con successo per:', user.username);
    res.json(response);
  } catch (error) {
    console.error('❌ [VERCEL LOGIN] Errore:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp
    });
    res.status(500).json({
      success: false,
      message: 'Errore durante il login',
      error: error.message
    });
  }
}

