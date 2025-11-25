// API Route per generare QR code 2FA
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

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

    // Verifica il token JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verifica che la sessione esista nel database
    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.email, u.username, u.is_active
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
    const username = sessions[0].username;

    // Verifica se il 2FA è già abilitato
    const users = await sql`
      SELECT two_factor_enabled, two_factor_secret
      FROM users
      WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }

    if (users[0].two_factor_enabled) {
      return res.status(400).json({ success: false, message: '2FA già abilitato' });
    }

    // Genera un nuovo secret
    const secret = speakeasy.generateSecret({
      name: `Nebula AI (${username})`,
      issuer: 'Nebula AI'
    });

    // Salva il secret temporaneamente (non ancora abilitato)
    await sql`
      UPDATE users
      SET two_factor_secret = ${secret.base32}
      WHERE id = ${userId}
    `;

    // Genera il QR code
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
  } catch (error) {
    console.error('Errore generazione 2FA:', error);
    return res.status(500).json({ success: false, message: 'Errore durante la generazione del QR code', error: error.message });
  }
}

