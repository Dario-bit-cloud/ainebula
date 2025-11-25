// API Route per verificare sessione su Vercel
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
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

    // Carica l'abbonamento attivo dell'utente
    const subscriptions = await sql`
      SELECT * FROM subscriptions 
      WHERE user_id = ${userId} 
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY started_at DESC
      LIMIT 1
    `;

    let subscription = null;
    if (subscriptions.length > 0) {
      const sub = subscriptions[0];
      subscription = {
        active: true,
        plan: sub.plan,
        expiresAt: sub.expires_at ? sub.expires_at.toISOString() : null,
        startedAt: sub.started_at ? sub.started_at.toISOString() : null,
        autoRenew: sub.auto_renew || false,
        status: sub.status
      };
    } else {
      subscription = {
        active: false,
        plan: null,
        expiresAt: null,
        startedAt: null,
        autoRenew: false,
        status: 'inactive'
      };
    }

    res.json({
      success: true,
      user: {
        id: userId,
        email: sessions[0].email,
        username: sessions[0].username,
        subscription: subscription
      }
    });
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token non valido' });
  }
}

