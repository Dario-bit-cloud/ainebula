// API Route consolidata per gestire tutte le operazioni 2FA su Vercel
// Endpoints:
// POST /api/auth/2fa?action=generate - Genera QR code
// POST /api/auth/2fa?action=verify - Verifica e abilita 2FA
// POST /api/auth/2fa?action=disable - Disabilita 2FA
// GET /api/auth/2fa?action=status - Verifica stato 2FA

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Inizializza la connessione al database solo se DATABASE_URL è disponibile
function getDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(connectionString);
}

// Helper per verificare autenticazione
async function authenticateUser(req, sql) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { error: 'Token non fornito', status: 401 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.email, u.username, u.is_active, u.two_factor_enabled, u.two_factor_secret
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;

    if (sessions.length === 0) {
      return { error: 'Sessione non valida', status: 401 };
    }

    return { user: sessions[0] };
  } catch (error) {
    return { error: 'Token non valido', status: 403 };
  }
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

  const action = req.query.action || req.body.action;

  try {
    // Inizializza la connessione al database
    const sql = getDatabaseConnection();
    
    // GET /api/auth/2fa?action=status - Verifica stato 2FA
    if (req.method === 'GET' && action === 'status') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      res.json({
        success: true,
        twoFactorEnabled: auth.user.two_factor_enabled || false
      });
      return;
    }

    // POST /api/auth/2fa?action=generate - Genera QR code
    if (req.method === 'POST' && action === 'generate') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const userId = auth.user.user_id;
      const username = auth.user.username;

      // Verifica se il 2FA è già abilitato
      if (auth.user.two_factor_enabled) {
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
      return;
    }

    // POST /api/auth/2fa?action=verify - Verifica e abilita 2FA
    if (req.method === 'POST' && action === 'verify') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ success: false, message: 'Codice 2FA richiesto' });
      }

      const userId = auth.user.user_id;
      const twoFactorSecret = auth.user.two_factor_secret;

      if (!twoFactorSecret) {
        return res.status(400).json({ success: false, message: 'Nessun secret 2FA trovato. Genera prima un QR code.' });
      }

      // Verifica il codice
      const verified = speakeasy.totp.verify({
        secret: twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
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
      return;
    }

    // POST /api/auth/2fa?action=disable - Disabilita 2FA
    if (req.method === 'POST' && action === 'disable') {
      const auth = await authenticateUser(req, sql);
      if (auth.error) {
        return res.status(auth.status).json({ success: false, message: auth.error });
      }

      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ success: false, message: 'Codice 2FA richiesto per disabilitare' });
      }

      const userId = auth.user.user_id;
      const twoFactorEnabled = auth.user.two_factor_enabled;
      const twoFactorSecret = auth.user.two_factor_secret;

      if (!twoFactorEnabled) {
        return res.status(400).json({ success: false, message: '2FA non è abilitato' });
      }

      if (!twoFactorSecret) {
        return res.status(400).json({ success: false, message: 'Nessun secret 2FA trovato' });
      }

      // Verifica il codice prima di disabilitare
      const verified = speakeasy.totp.verify({
        secret: twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({ success: false, message: 'Codice 2FA non valido' });
      }

      // Disabilita il 2FA e rimuovi il secret
      await sql`
        UPDATE users
        SET two_factor_enabled = FALSE, two_factor_secret = NULL
        WHERE id = ${userId}
      `;

      res.json({
        success: true,
        message: '2FA disabilitato con successo'
      });
      return;
    }

    return res.status(405).json({ success: false, message: 'Method not allowed or invalid action' });
  } catch (error) {
    console.error('Errore 2FA:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Assicurati che la risposta sia sempre JSON valido
    if (!res.headersSent) {
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante l\'operazione 2FA', 
        error: error.message || 'Unknown error'
      });
    }
  }
}

