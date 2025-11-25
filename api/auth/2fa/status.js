// API Route per verificare lo stato del 2FA
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token non fornito' });
    }

    // Verifica il token JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verifica che la sessione esista nel database
    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.two_factor_enabled
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;

    if (sessions.length === 0) {
      return res.status(401).json({ success: false, message: 'Sessione non valida' });
    }

    res.json({
      success: true,
      twoFactorEnabled: sessions[0].two_factor_enabled || false
    });
  } catch (error) {
    console.error('Errore verifica stato 2FA:', error);
    return res.status(500).json({ success: false, message: 'Errore durante la verifica dello stato', error: error.message });
  }
}

