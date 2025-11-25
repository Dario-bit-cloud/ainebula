// API Route per verificare e abilitare 2FA
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token non fornito' });
    }

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Codice 2FA richiesto' });
    }

    // Verifica il token JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verifica che la sessione esista nel database
    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.email, u.username, u.is_active, u.two_factor_secret
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;

    if (sessions.length === 0) {
      return res.status(401).json({ success: false, message: 'Sessione non valida' });
    }

    const userId = sessions[0].user_id;
    const twoFactorSecret = sessions[0].two_factor_secret;

    if (!twoFactorSecret) {
      return res.status(400).json({ success: false, message: 'Nessun secret 2FA trovato. Genera prima un QR code.' });
    }

    // Verifica il codice
    const verified = speakeasy.totp.verify({
      secret: twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2 // Permette un margine di 2 periodi (60 secondi) prima e dopo
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Codice 2FA non valido' });
    }

    // Abilita il 2FA
    await sql`
      UPDATE users
      SET two_factor_enabled = TRUE
      WHERE id = ${userId}
    `;

    res.json({
      success: true,
      message: '2FA abilitato con successo'
    });
  } catch (error) {
    console.error('Errore verifica 2FA:', error);
    return res.status(500).json({ success: false, message: 'Errore durante la verifica del codice', error: error.message });
  }
}

